const kycModel = require('../models/kycModel');
const { verifyAadhaar } = require('../services/uidaiService');
const { assertAadhaar } = require('../validators/requestValidators');

const submitKyc = async ({ user, aadhaarNumber }) => {
  const normalizedAadhaarNumber = assertAadhaar(aadhaarNumber);
  const verification = await verifyAadhaar({ aadhaarNumber: normalizedAadhaarNumber, fullName: user.fullName || 'User' });
  const record = kycModel.upsert({ userId: user.id, ...verification });
  return {
    statusCode: 201,
    body: { success: true, message: 'KYC submitted successfully.', data: { record, remarks: verification.remarks } }
  };
};

const getStatus = (userId) => ({ statusCode: 200, body: { success: true, data: kycModel.findByUserId(userId) } });

module.exports = { submitKyc, getStatus };
