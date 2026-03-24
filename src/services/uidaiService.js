const env = require('../config/env');
const ApiError = require('../utils/apiError');
const { createReference } = require('../utils/reference');

const maskAadhaar = (aadhaarNumber) => `XXXX-XXXX-${aadhaarNumber.slice(-4)}`;

const verifyWithSimulator = ({ aadhaarNumber, fullName }) => {
  const status = Number(aadhaarNumber[aadhaarNumber.length - 1]) % 2 === 0 ? 'VERIFIED' : 'PENDING';
  return {
    aadhaarNumberMasked: maskAadhaar(aadhaarNumber),
    status,
    providerName: 'UIDAI_SIMULATOR',
    verificationReference: createReference('KYC'),
    verifiedAt: status === 'VERIFIED' ? new Date().toISOString() : null,
    remarks: status === 'VERIFIED'
      ? `KYC auto-verified for ${fullName}.`
      : 'KYC submitted to the provider for review.'
  };
};

const buildUidaiSandboxUrl = (aadhaarNumber) => {
  const baseUrl = env.uidaiKycEndpoint.replace(/\/$/, '');
  if (baseUrl.includes('/kyc/')) {
    return `${baseUrl}/${env.uidaiKycAc}/${aadhaarNumber[0]}/${aadhaarNumber[1]}/${encodeURIComponent(env.uidaiKycAsaLicenseKey)}`;
  }
  return `${baseUrl}/kyc/${env.uidaiKycVersion}/${env.uidaiKycAc}/${aadhaarNumber[0]}/${aadhaarNumber[1]}/${encodeURIComponent(env.uidaiKycAsaLicenseKey)}`;
};

const buildUidaiKycXml = ({ aadhaarNumber, fullName }) => `<?xml version="1.0" encoding="UTF-8"?>\n<Kyc ver="${env.uidaiKycVersion}" ra="O" rc="Y" lr="N" de="N" pfr="N" mec="Y">\n  <Meta udc="${env.uidaiKycSource}" fdc="NA" idc="NA" pip="127.0.0.1" lot="P" lov="110001" />\n  <Skey ci="20150922">SANDBOX_KEY_PLACEHOLDER</Skey>\n  <Data type="X">SANDBOX_PID_PLACEHOLDER_FOR_${aadhaarNumber}</Data>\n  <Hmac>HMAC_PLACEHOLDER</Hmac>\n  <Consent rc="${env.uidaiKycConsent}">Resident consent captured for ${fullName}</Consent>\n</Kyc>`;

const verifyWithUidaiSandbox = async ({ aadhaarNumber, fullName }) => {
  if (!env.uidaiKycAsaLicenseKey) {
    throw new ApiError(503, 'UIDAI dev KYC is enabled but UIDAI_KYC_ASA_LICENSE_KEY is missing.');
  }

  const url = buildUidaiSandboxUrl(aadhaarNumber);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: buildUidaiKycXml({ aadhaarNumber, fullName })
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new ApiError(502, `UIDAI dev KYC request failed with status ${response.status}.`);
  }

  const isSuccess = /ret="[Yy]"/.test(responseText) || /status="[Yy]"/.test(responseText);
  return {
    aadhaarNumberMasked: maskAadhaar(aadhaarNumber),
    status: isSuccess ? 'VERIFIED' : 'PENDING',
    providerName: 'UIDAI_DEV_SANDBOX',
    verificationReference: createReference('UIDAI'),
    verifiedAt: isSuccess ? new Date().toISOString() : null,
    remarks: isSuccess
      ? 'KYC verified using the configured UIDAI developer endpoint.'
      : 'UIDAI developer endpoint accepted the request but did not return a success status.',
    rawResponse: responseText.slice(0, 500)
  };
};

const verifyAadhaar = async ({ aadhaarNumber, fullName }) => {
  if (env.kycProvider === 'uidai-dev') {
    return verifyWithUidaiSandbox({ aadhaarNumber, fullName });
  }

  return verifyWithSimulator({ aadhaarNumber, fullName });
};

module.exports = { verifyAadhaar };
