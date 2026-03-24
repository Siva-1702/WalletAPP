const userModel = require('../models/userModel');
const walletModel = require('../models/walletModel');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/apiError');

const registerOrLoginByMobile = ({ mobileNumber, fullName, purpose }) => {
  let user = userModel.findByMobileNumber(mobileNumber);
  if (purpose === 'REGISTER' && user) {
    throw new ApiError(409, 'User already registered. Please use login.');
  }
  if (purpose === 'LOGIN' && !user) {
    throw new ApiError(404, 'User not found. Please register first.');
  }

  if (!user) {
    user = userModel.create({ mobileNumber, fullName, isVerified: true });
  } else {
    user = userModel.markVerifiedLogin({ id: user.id, fullName });
  }

  const wallet = walletModel.ensureForUser(user.id);
  return {
    token: signToken({ sub: user.id, mobileNumber: user.mobileNumber }),
    user: { ...user, wallet }
  };
};

const buildAuthPayload = (user) => {
  const wallet = walletModel.ensureForUser(user.id);
  return {
    token: signToken({ sub: user.id, mobileNumber: user.mobileNumber }),
    user: { ...user, wallet }
  };
};

module.exports = { registerOrLoginByMobile, buildAuthPayload };
