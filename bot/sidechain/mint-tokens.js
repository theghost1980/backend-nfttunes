/* eslint-disable no-nested-ternary */
/* eslint-disable consistent-return */
const Joi = require('joi');
const { Collectible, Transaction, User } = require('../../common/models');
const {
  CATEGORIES, TOKEN_ISSUANCE_BASE_FEE, TOKEN_ISSUANCE_FEE, NFT_SYMBOL, NFT_ISSUE_FEE_SYMBOL,
} = require('../../common/config');
const {
  arrayChunk,
  issueMultiple,
  parseJSON,
  refundToken,
  sleep,
  slugify,
  toFixedWithoutRounding,
  transferReferralBonus,
} = require('../helpers');
const logger = require('../../common/logger');

const schema = Joi.object().keys({
  name: Joi.string().trim().required(),
  collection: Joi.string().trim().required(),
  category: Joi.string().valid(...CATEGORIES).required(),
  rights: Joi.number().min(1).max(3).required(),
  royalty: Joi.number().min(1).max(3),
  editions: Joi.number().min(1).max(1000).required(),
  nsfw: Joi.boolean().default(false).required(),
  type: Joi.string().valid('audio', 'video').required(),
  thumbnail: Joi.string().trim().uri().required(),
  file: Joi.string().trim().uri().required(),
  tags: Joi.array().required(),
  description: Joi.string().trim().required(),
  notes: Joi.string().trim().allow('').max(100)
    .default(''),
});

module.exports = async (trx) => {
  const {
    sender: username,
    trx_id: trxId,
    chain_block: chainBock,
    sidechain_block: scBlock,
    timestamp,
    payload,
  } = trx;

  try {
    let {
      // eslint-disable-next-line prefer-const
      quantity, symbol, memo,
    } = payload;

    memo = parseJSON(memo);
    quantity = Number(quantity);

    if (memo.action && memo.action === 'mint') {
      const { error, value } = schema.validate(memo, {
        allowUnknown: true,
        stripUnknown: true,
      });

      if (error) {
        const message = `Error: ${error.details[0].message}`;
        return refundToken(username, quantity, symbol, message);
      }

      const user = await User.findOne({ username }).lean();

      if (user && user.banned) {
        return refundToken(username, quantity, symbol, 'User is banned');
      }

      if (user && !user.whitelisted) {
        return refundToken(username, quantity, symbol, 'User is not whitelisted');
      }

      const issuanceFee = TOKEN_ISSUANCE_BASE_FEE + (TOKEN_ISSUANCE_FEE * value.editions);

      const series = `${username}_${slugify(value.collection)}_${slugify(value.name)}`.toLowerCase();

      const seriesExists = await Collectible.findOne({ series }).lean();

      if (seriesExists) {
        return refundToken(username, quantity, symbol, `Series: ${series} already exists.`);
      }

      if (user && quantity >= issuanceFee && !seriesExists) {
        const {
          name,
          collection,
          category,
          rights,
          editions,
          nsfw,
          type,
          thumbnail,
          file,
          tags,
          description,
          notes,
        } = value;

        await Collectible.create({
          creator: username,
          name,
          collection_name: collection,
          series,
          category,
          rights,
          editions,
          nsfw,
          type,
          thumbnail,
          file,
          tags,
          description,
          notes,
        });

        try {
          await Transaction.create({
            account: username,
            counterparty: null,
            type: 'issue',
            chain_block: chainBock,
            sidechain_block: scBlock,
            trx_id: trxId,
            series,
            data: JSON.stringify({
              type,
              series,
              editions: Number(editions),
            }),
            timestamp,
          });
        } catch (e) {
          logger.error(`Error: Inserting issue transaction. User: ${username} TX: ${trxId} Message: ${e.message}`);
        }

        const nftInstances = [];

        for (let id = 1; id <= editions; id += 1) {
          nftInstances.push({
            symbol: NFT_SYMBOL,
            to: username,
            feeSymbol: NFT_ISSUE_FEE_SYMBOL,
            properties: {
              series,
              edition: id,
              metadata: JSON.stringify({ rights }),
              // notes,
            },
          });
        }

        const issueChunks = arrayChunk(nftInstances);

        for (let i = 0; i < issueChunks.length; i += 1) {
          await issueMultiple(issueChunks[i]);
          await sleep(200);
        }

        logger.info(`Success: Completed issuing ${editions} tokens to @${username}. Series: ${series}`);

        // Paying referral bonus
        const [referer] = await User.aggregate([{ $match: { username } }, {
          $lookup: {
            from: 'users',
            let: { referred_by: '$referred_by' },
            pipeline: [{ $match: { $expr: { $eq: ['$referred_by', '$$referred_by'] } } }],
            as: 'referred',
          },
        }, {
          $project: {
            _id: 0,
            referred_by: 1,
            total: { $cond: { if: { $isArray: '$referred' }, then: { $size: '$referred' }, else: 0 } },
          },
        }]);

        if (referer && referer.referred_by) {
          const tier = (total) => (total <= 4 ? 0.05
            : total <= 9 ? 0.07
              : total <= 14 ? 0.11
                : total <= 19 ? 0.13 : 0.15);

          const bonus = issuanceFee * tier(referer.total);

          if (bonus >= 0.001) {
            const bonusMemo = {
              type: 'referral_bonus',
              series,
              referred_account: username,
              ref_trx: trxId,
            };

            const bonusAmount = toFixedWithoutRounding(bonus);

            await transferReferralBonus(referer.referred_by, bonusAmount, bonusMemo);
          }
        }
      }
    }
  } catch (e) {
    logger.error(`Error: Processing issue transaction. User: ${username} TX: ${trxId} Message: ${e.message}`);
  }
};
