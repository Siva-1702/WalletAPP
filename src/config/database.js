const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const env = require('./env');

fs.mkdirSync(path.dirname(env.dbStorage), { recursive: true });
const db = new DatabaseSync(env.dbStorage);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

module.exports = db;
