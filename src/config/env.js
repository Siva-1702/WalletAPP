const path = require('path');
const { loadEnvFiles } = require('../utils/envFile');

const fileEnv = loadEnvFiles(process.cwd());
const envValue = (key, fallback = '') => process.env[key] || fileEnv[key] || fallback;

module.exports = {
  port: Number(envValue('PORT', 3000)),
  nodeEnv: envValue('NODE_ENV', 'development'),
  jwtSecret: envValue('JWT_SECRET', 'change-me'),
  jwtExpiresInSeconds: Number(envValue('JWT_EXPIRES_IN_SECONDS', 86400)),
  dbStorage: envValue('DB_STORAGE', path.join(process.cwd(), 'storage', 'wallet.sqlite')),
  otpTtlMinutes: Number(envValue('OTP_TTL_MINUTES', 5)),
  googleClientId: envValue('GOOGLE_CLIENT_ID'),
  googleClientSecret: envValue('GOOGLE_CLIENT_SECRET'),
  googleCallbackUrl: envValue('GOOGLE_CALLBACK_URL', 'http://localhost:3000/api/v1/auth/google/callback'),
  kycProvider: envValue('KYC_PROVIDER', 'simulator'),
  uidaiKycEndpoint: envValue('UIDAI_KYC_ENDPOINT', 'https://developer.uidai.gov.in/uidkyc/kyc/2.5'),
  uidaiKycVersion: envValue('UIDAI_KYC_VERSION', '2.5'),
  uidaiKycAc: envValue('UIDAI_KYC_AC', 'public'),
  uidaiKycAsaLicenseKey: envValue('UIDAI_KYC_ASA_LICENSE_KEY'),
  uidaiKycConsent: envValue('UIDAI_KYC_CONSENT', 'Y'),
  uidaiKycSource: envValue('UIDAI_KYC_SOURCE', 'WEB')
};
