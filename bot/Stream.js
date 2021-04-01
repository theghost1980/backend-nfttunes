const EventEmiter = require('events');

class Stream extends EventEmiter {
  /**
   * @constructor
   * @param {Object} client
   * @param {Object} options
   */
  constructor(client, options) {
    super();

    this.client = client;
    this.streamOptions = options;
    this.stream = null;
  }

  start() {
    try {
      this.stream = this.client.blockchain.getBlockStream(this.streamOptions);

      this.stream.on('data', (data) => {
        const { timestamp, transactions } = data;

        for (let i = 0; i < transactions.length; i += 1) {
          const trx = transactions[i];
          for (let j = 0; j < trx.operations.length; j += 1) {
            const op = trx.operations[j];

            const [opName, opData] = op;

            this.emit(opName, {
              block_num: trx.block_num, trx_id: trx.transaction_id, ...opData, timestamp,
            });
          }
        }

        this.emit('block', Number.parseInt(data.block_id.slice(0, 8), 16));
      });

      this.stream.on('error', (e) => this.emit('error', e));
      this.stream.on('close', () => this.emit('close'));
      this.stream.on('end', () => this.emit('end'));
    } catch (e) {
      console.log(e.message);
    }
  }

  failover(client) {
    this.client = client;
    this.emit('failedover', client.address);
    this.start();
  }

  stop(error = null) {
    this.stream.destroy(error);
  }
}

module.exports = Stream;
