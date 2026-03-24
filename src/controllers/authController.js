const env = require('../config/env');
const userModel = require('../models/userModel');
const { issueOtp, verifyOtp } = require('../services/otpService');
const { registerOrLoginByMobile, buildAuthPayload } = require('../services/authService');
const { buildGoogleAuthUrl, decodeState, exchangeCodeForGoogleProfile, syncGoogleUser, buildUiRedirect } = require('../services/oauthService');
const { assertMobileNumber, assertPurpose, assertOtp } = require('../validators/requestValidators');
const ApiError = require('../utils/apiError');

const requestOtp = ({ mobileNumber, purpose }) => {
  const normalizedMobileNumber = assertMobileNumber(mobileNumber);
  assertPurpose(purpose);

  if (purpose === 'LOGIN' && !userModel.findByMobileNumber(normalizedMobileNumber)) {
    throw new ApiError(404, 'User not found. Please register first.');
  }

  return {
    statusCode: 201,
    body: { success: true, message: 'OTP issued successfully.', data: issueOtp({ mobileNumber: normalizedMobileNumber, purpose }) }
  };
};

const verifyMobileOtp = ({ mobileNumber, purpose, otp, fullName }) => {
  const normalizedMobileNumber = assertMobileNumber(mobileNumber);
  assertPurpose(purpose);
  assertOtp(otp);
  verifyOtp({ mobileNumber: normalizedMobileNumber, purpose, otp });
  const payload = registerOrLoginByMobile({ mobileNumber: normalizedMobileNumber, fullName });
  return { statusCode: 200, body: { success: true, message: 'Authentication successful.', data: payload } };
};

const currentUser = (user) => ({ statusCode: 200, body: { success: true, data: buildAuthPayload(user) } });

const googleStart = (mode) => {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new ApiError(503, 'Google OAuth is not configured. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are present in .env or exported env vars, then restart the server.');
  }

  return { redirect: buildGoogleAuthUrl(mode) };
};

const googleCallback = async ({ code, state }) => {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new ApiError(503, 'Google OAuth is not configured. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are present in .env or exported env vars, then restart the server.');
  }

  const oauthState = decodeState(state);
  const profile = await exchangeCodeForGoogleProfile(code);
  const payload = syncGoogleUser({ mode: oauthState.mode, profile });
  return { redirect: buildUiRedirect({ token: payload.token, mode: oauthState.mode }) };
};

module.exports = { requestOtp, verifyMobileOtp, currentUser, googleStart, googleCallback };
