const userModel = require('../models/userModel');
const walletModel = require('../models/walletModel');
const { signToken } = require('../utils/jwt');

const registerOrLoginByMobile = ({ mobileNumber, fullName }) => {
  let user = userModel.findByMobileNumber(mobileNumber);
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
