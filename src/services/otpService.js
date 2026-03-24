const env = require('../config/env');
const otpModel = require('../models/otpModel');
const ApiError = require('../utils/apiError');
const { hashValue } = require('../utils/hash');

const generateOtp = () => `${Math.floor(100000 + Math.random() * 900000)}`;

const issueOtp = ({ mobileNumber, purpose }) => {
  otpModel.consumeActive({ mobileNumber, purpose });
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + env.otpTtlMinutes * 60 * 1000).toISOString();
  const record = otpModel.create({ mobileNumber, purpose, otpHash: hashValue(otp), expiresAt });

  return { requestId: record.id, expiresAt, otp: env.nodeEnv === 'production' ? undefined : otp };
};

const verifyOtp = ({ mobileNumber, purpose, otp }) => {
  const record = otpModel.latestActive({ mobileNumber, purpose });
  if (!record || record.expires_at < new Date().toISOString()) {
    throw new ApiError(400, 'OTP is invalid or expired.');
  }
  if (record.otp_hash !== hashValue(otp)) {
    throw new ApiError(400, 'OTP is invalid or expired.');
  }
  otpModel.markConsumed(record.id);
  return record;
};

module.exports = { issueOtp, verifyOtp };
