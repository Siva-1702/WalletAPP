const walletModel = require('../models/walletModel');
const transactionModel = require('../models/transactionModel');
const { mutateWallet } = require('../services/walletService');
const { assertAmount } = require('../validators/requestValidators');

const getWallet = (userId) => ({ statusCode: 200, body: { success: true, data: walletModel.ensureForUser(userId) } });

const addMoney = ({ userId, amount, narration }) => {
  assertAmount(amount);
  return {
    statusCode: 201,
    body: { success: true, data: mutateWallet({ userId, amount, type: 'CREDIT', category: 'ADD_MONEY', narration: narration || 'Wallet top-up' }) }
  };
};

const withdrawMoney = ({ userId, amount, narration }) => {
  assertAmount(amount);
  return {
    statusCode: 201,
    body: { success: true, data: mutateWallet({ userId, amount, type: 'DEBIT', category: 'WITHDRAWAL', narration: narration || 'Wallet withdrawal' }) }
  };
};

const passbook = (userId) => {
  const wallet = walletModel.ensureForUser(userId);
  return {
    statusCode: 200,
    body: {
      success: true,
      data: {
        wallet,
        summary: transactionModel.getSummary(wallet.id),
        transactions: transactionModel.listByWalletId(wallet.id)
      }
    }
  };
};

module.exports = { getWallet, addMoney, withdrawMoney, passbook };
