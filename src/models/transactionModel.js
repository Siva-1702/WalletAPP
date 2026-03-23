const db = require('../config/database');

const create = ({ walletId, type, category, amount, balanceAfter, reference, narration }) => {
  db.prepare(`
    INSERT INTO wallet_transactions (wallet_id, type, category, amount, balance_after, reference, narration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(walletId, type, category, amount, balanceAfter, reference, narration);

  return db.prepare('SELECT * FROM wallet_transactions WHERE reference = ?').get(reference);
};

const listByWalletId = (walletId) => db.prepare(`
  SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY id DESC
`).all(walletId).map((row) => ({
  id: row.id,
  walletId: row.wallet_id,
  type: row.type,
  category: row.category,
  amount: Number(row.amount),
  balanceAfter: Number(row.balance_after),
  reference: row.reference,
  narration: row.narration,
  createdAt: row.created_at
}));

const getSummary = (walletId) => {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE 0 END), 0) AS total_credits,
      COALESCE(SUM(CASE WHEN type = 'DEBIT' THEN amount ELSE 0 END), 0) AS total_debits,
      COUNT(*) AS total_entries
    FROM wallet_transactions
    WHERE wallet_id = ?
  `).get(walletId);

  return {
    totalCredits: Number(row.total_credits),
    totalDebits: Number(row.total_debits),
    totalEntries: Number(row.total_entries)
  };
};

module.exports = { create, listByWalletId, getSummary };
