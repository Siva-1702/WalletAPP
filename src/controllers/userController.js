const userModel = require('../models/userModel');
const kycModel = require('../models/kycModel');
const walletModel = require('../models/walletModel');
const { assertFullName } = require('../validators/requestValidators');

const listUsers = () => ({ statusCode: 200, body: { success: true, data: userModel.listDetailed() } });

const getUser = (id) => {
  const user = userModel.findById(Number(id));
  if (!user) {
    return { statusCode: 404, body: { success: false, message: 'User not found.' } };
  }
  return {
    statusCode: 200,
    body: {
      success: true,
      data: {
        ...user,
        wallet: walletModel.findByUserId(user.id),
        kyc: kycModel.findByUserId(user.id)
      }
    }
  };
};

const updateProfile = ({ userId, fullName }) => {
  assertFullName(fullName);
  return {
    statusCode: 200,
    body: {
      success: true,
      message: 'Profile updated successfully.',
      data: userModel.updateProfile({ id: userId, fullName: fullName.trim() })
    }
  };
};

module.exports = { listUsers, getUser, updateProfile };
