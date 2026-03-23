const { createReference } = require('../utils/reference');

const verifyAadhaar = ({ aadhaarNumber, fullName }) => {
  const status = Number(aadhaarNumber[aadhaarNumber.length - 1]) % 2 === 0 ? 'VERIFIED' : 'PENDING';
  return {
    aadhaarNumberMasked: `XXXX-XXXX-${aadhaarNumber.slice(-4)}`,
    status,
    providerName: 'UIDAI_SANDBOX_ADAPTER',
    verificationReference: createReference('KYC'),
    verifiedAt: status === 'VERIFIED' ? new Date().toISOString() : null,
    remarks: status === 'VERIFIED'
      ? `KYC auto-verified for ${fullName}.`
      : 'KYC submitted to the provider for review.'
  };
};

module.exports = { verifyAadhaar };
