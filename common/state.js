const { Database } = require('sqlite3');

class State {
  constructor() {
    this.db = new Database('state.db');
  }

  createTable() {
    const create = 'CREATE TABLE IF NOT EXISTS state ( id INTEGER PRIMARY KEY, chain TEXT, last_block_num NUMERIC, UNIQUE(id, chain) )';
    const insertHive = 'INSERT OR IGNORE INTO state (id, chain, last_block_num) VALUES (1, "hive", 0)';
    const insertHE = 'INSERT OR IGNORE INTO state (id, chain, last_block_num) VALUES (2, "hive-engine", 0)';

    return new Promise((resolve) => {
      this.db.serialize(() => {
        this.db.run(create)
          .run(insertHive)
          .run(insertHE, () => {
            resolve(true);
          });
      });
    });
  }

  async loadState(chain) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT last_block_num FROM state WHERE chain = ?', [chain], (err, row) => {
        if (!err) {
          resolve(row.last_block_num);
        } else {
          reject(err);
        }
      });
    });
  }

  async saveState({ chain, block }) {
    return new Promise((resolve, reject) => {
      const sql = `UPDATE state SET last_block_num = ${block} WHERE chain = '${chain}'`;

      this.db.exec(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async destroy() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (!err) {
          resolve(true);
        } else {
          reject(err);
        }
      });
    });
  }
}

module.exports = State;
