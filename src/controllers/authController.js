const env = require('../config/env');
const userModel = require('../models/userModel');
const { issueOtp, verifyOtp } = require('../services/otpService');
const { registerOrLoginByMobile, buildAuthPayload } = require('../services/authService');
const { upsertGoogleUser } = require('../services/oauthService');
const { assertMobileNumber, assertPurpose, assertOtp } = require('../validators/requestValidators');
const ApiError = require('../utils/apiError');

const requestOtp = ({ mobileNumber, purpose }) => {
  assertMobileNumber(mobileNumber);
  assertPurpose(purpose);

  if (purpose === 'LOGIN' && !userModel.findByMobileNumber(mobileNumber)) {
    throw new ApiError(404, 'User not found. Please register first.');
  }

  return {
    statusCode: 201,
    body: { success: true, message: 'OTP issued successfully.', data: issueOtp({ mobileNumber, purpose }) }
  };
};

const verifyMobileOtp = ({ mobileNumber, purpose, otp, fullName }) => {
  assertMobileNumber(mobileNumber);
  assertPurpose(purpose);
  assertOtp(otp);
  verifyOtp({ mobileNumber, purpose, otp });
  const payload = registerOrLoginByMobile({ mobileNumber, fullName });
  return { statusCode: 200, body: { success: true, message: 'Authentication successful.', data: payload } };
};

const currentUser = (user) => ({ statusCode: 200, body: { success: true, data: buildAuthPayload(user) } });

const googleStart = () => {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new ApiError(503, 'Google OAuth is not configured.');
  }
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.googleClientId);
  url.searchParams.set('redirect_uri', env.googleCallbackUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  return { redirect: url.toString() };
};

const googleCallback = async (code) => {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new ApiError(503, 'Google OAuth is not configured.');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleCallbackUrl,
      grant_type: 'authorization_code'
    })
  });

  if (!tokenResponse.ok) {
    throw new ApiError(401, 'Google authentication failed at token exchange.');
  }
  const tokenPayload = await tokenResponse.json();
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
  });
  if (!profileResponse.ok) {
    throw new ApiError(401, 'Google authentication failed while loading the profile.');
  }

  const profile = await profileResponse.json();
  return upsertGoogleUser({ providerId: profile.sub, fullName: profile.name, email: profile.email });
};

module.exports = { requestOtp, verifyMobileOtp, currentUser, googleStart, googleCallback };
