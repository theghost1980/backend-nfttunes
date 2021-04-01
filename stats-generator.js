const { subDays } = require('date-fns');
const { User, Transaction, Statistics } = require('./common/models');
const mongoose = require('./common/db');

const getDate = (date) => new Date(new Date(date).toISOString().slice(0, 10));

const totay = getDate(new Date());
const yesterday = getDate(subDays(totay, 1));

const processStatistics = async () => {
  const users = await User.estimatedDocumentCount();

  const dailyTransactions = await Transaction.find().where('timestamp')
    .gte(yesterday)
    .lt(totay)
    .lean(true);

  const transactions = dailyTransactions.reduce((acc, cur) => {
    if (acc[cur.type]) {
      acc[cur.type] += 1;
    } else {
      acc[cur.type] = 1;
    }

    return acc;
  }, {});

  const salesVolume = dailyTransactions.filter((t) => t.type === 'buy')
    .map((s) => ({ ...s, data: JSON.parse(s.data) }))
    .reduce((acc, cur) => acc + parseFloat(cur.data.price), 0);

  await Statistics.create({
    users,
    sales_volume: salesVolume,
    transactions: JSON.stringify(transactions),
    total_transactions: dailyTransactions.length,
    timestamp: yesterday,
  });

  mongoose.close();
};

processStatistics();
