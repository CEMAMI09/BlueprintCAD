// Compatibility wrapper for legacy code that imported '../../../../shared/utils/db'
// Internally uses the unified db adapter from 'db/db.js'

const { getDb } = require('../../db/db');

function wrapAsync(method) {
  return (sql, params, cb) => {
    // params may be optional
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    getDb()
      .then((db) => db[method](sql, params || []))
      .then((result) => cb && cb(null, result))
      .catch((err) => cb && cb(err));
  };
}

module.exports = {
  get: wrapAsync('get'),
  all: wrapAsync('all'),
  run: wrapAsync('run'),
};


