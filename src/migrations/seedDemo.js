const { runMigrations } = require('./schema');
const userModel = require('../models/userModel');
const walletModel = require('../models/walletModel');
const transactionModel = require('../models/transactionModel');

runMigrations();
let user = userModel.findByMobileNumber('+919999999999');
if (!user) {
  user = userModel.create({ mobileNumber: '+919999999999', fullName: 'Demo User', isVerified: true });
}
const wallet = walletModel.ensureForUser(user.id);
if (wallet.balance === 0) {
  walletModel.updateBalance({ id: wallet.id, balance: 1000 });
  transactionModel.create({
    walletId: wallet.id,
    type: 'CREDIT',
    category: 'ADD_MONEY',
    amount: 1000,
    balanceAfter: 1000,
    reference: 'SEED-CR-001',
    narration: 'Initial seed balance'
  });
}
console.log('Demo data seeded successfully.');
