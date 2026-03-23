const userModel = require('../models/userModel');
const walletModel = require('../models/walletModel');
const { buildAuthPayload } = require('./authService');

const upsertGoogleUser = ({ providerId, fullName, email }) => {
  let user = userModel.findByOauth('google', providerId);
  if (!user) {
    user = userModel.create({
      mobileNumber: email || `oauth-${providerId}`,
      fullName,
      isVerified: true,
      oauthProvider: 'google',
      oauthProviderId: providerId
    });
  } else {
    user = userModel.markVerifiedLogin({ id: user.id, fullName });
  }
  walletModel.ensureForUser(user.id);
  return buildAuthPayload(user);
};

module.exports = { upsertGoogleUser };
