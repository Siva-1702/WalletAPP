const db = require('../config/database');

const mapWallet = (row) => row && ({
  id: row.id,
  userId: row.user_id,
  currency: row.currency,
  balance: Number(row.balance),
  lockedBalance: Number(row.locked_balance),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const findByUserId = (userId) => mapWallet(db.prepare('SELECT * FROM wallets WHERE user_id = ?').get(userId));

const createForUser = (userId) => {
  db.prepare('INSERT INTO wallets (user_id) VALUES (?)').run(userId);
  return findByUserId(userId);
};

const ensureForUser = (userId) => findByUserId(userId) || createForUser(userId);

const updateBalance = ({ id, balance }) => {
  const now = new Date().toISOString();
  db.prepare('UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?').run(balance, now, id);
};

module.exports = { findByUserId, ensureForUser, updateBalance };
