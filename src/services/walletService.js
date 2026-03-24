const db = require('../config/database');
const walletModel = require('../models/walletModel');
const transactionModel = require('../models/transactionModel');
const ApiError = require('../utils/apiError');
const { createReference } = require('../utils/reference');

const normalizeAmount = (amount) => Number(Number(amount).toFixed(2));

const mutateWallet = ({ userId, amount, type, category, narration }) => {
  const normalizedAmount = normalizeAmount(amount);
  if (normalizedAmount <= 0) {
    throw new ApiError(400, 'Amount must be greater than zero.');
  }

  db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    const wallet = walletModel.ensureForUser(userId);
    const nextBalance = type === 'CREDIT'
      ? normalizeAmount(wallet.balance + normalizedAmount)
      : normalizeAmount(wallet.balance - normalizedAmount);

    if (type === 'DEBIT' && nextBalance < 0) {
      throw new ApiError(400, 'Insufficient wallet balance.');
    }

    walletModel.updateBalance({ id: wallet.id, balance: nextBalance });
    const transaction = transactionModel.create({
      walletId: wallet.id,
      type,
      category,
      amount: normalizedAmount,
      balanceAfter: nextBalance,
      reference: createReference(type === 'CREDIT' ? 'CR' : 'DR'),
      narration
    });

    db.exec('COMMIT');
    return {
      wallet: walletModel.findByUserId(userId),
      transaction: {
        id: transaction.id,
        walletId: transaction.wallet_id,
        type: transaction.type,
        category: transaction.category,
        amount: Number(transaction.amount),
        balanceAfter: Number(transaction.balance_after),
        reference: transaction.reference,
        narration: transaction.narration,
        createdAt: transaction.created_at
      }
    };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

module.exports = { mutateWallet };
