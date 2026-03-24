const ApiError = require('../utils/apiError');
const { normalizeMobileNumber } = require('../utils/mobileNumber');
const { normalizeAadhaarNumber } = require('../utils/aadhaarNumber');


const assertMobileNumber = (mobileNumber) => {
  const normalizedMobileNumber = normalizeMobileNumber(mobileNumber);
  if (!/^\+?[1-9]\d{9,14}$/.test(normalizedMobileNumber)) {
    throw new ApiError(422, 'Provide a valid mobile number with country code.');
  }

  return normalizedMobileNumber;
};

const assertPurpose = (purpose) => {
  if (!['REGISTER', 'LOGIN'].includes(purpose)) {
    throw new ApiError(422, 'Purpose must be REGISTER or LOGIN.');
  }
};

const assertOtp = (otp) => {
  if (!/^\d{6}$/.test(otp || '')) {
    throw new ApiError(422, 'OTP must be 6 digits.');
  }
};

const assertFullName = (fullName) => {
  if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 120) {
    throw new ApiError(422, 'Full name must be 2 to 120 characters long.');
  }
};

const assertAmount = (amount) => {
  if (!(Number(amount) > 0)) {
    throw new ApiError(422, 'Amount must be greater than zero.');
  }
};

const assertAadhaar = (aadhaarNumber) => {
  const normalizedAadhaarNumber = normalizeAadhaarNumber(aadhaarNumber);
  if (!/^\d{12}$/.test(normalizedAadhaarNumber)) {
    throw new ApiError(422, 'Aadhaar number must be 12 digits.');
  }

  return normalizedAadhaarNumber;
};

module.exports = { assertMobileNumber, assertPurpose, assertOtp, assertFullName, assertAmount, assertAadhaar };
