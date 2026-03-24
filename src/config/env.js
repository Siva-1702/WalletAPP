const path = require('path');
const { loadEnvFilesWithMeta } = require('../utils/envFile');

const loaded = loadEnvFilesWithMeta(process.cwd());
const fileEnv = loaded.values;
const envSources = loaded.sources;

const envValue = (keys, fallback = '') => {
  const keysList = Array.isArray(keys) ? keys : [keys];

  for (const key of keysList) {
    if (typeof process.env[key] === 'string' && process.env[key] !== '') {
      return process.env[key];
    }
  }

  for (const key of keysList) {
    if (typeof fileEnv[key] === 'string' && fileEnv[key] !== '') {
      return fileEnv[key];
    }
  }

  return fallback;
};

const config = {
  port: Number(envValue('PORT', 3000)),
  nodeEnv: envValue('NODE_ENV', 'development'),
  jwtSecret: envValue('JWT_SECRET', 'change-me'),
  jwtExpiresInSeconds: Number(envValue('JWT_EXPIRES_IN_SECONDS', 86400)),
  dbStorage: envValue('DB_STORAGE', path.join(process.cwd(), 'storage', 'wallet.sqlite')),
  otpTtlMinutes: Number(envValue('OTP_TTL_MINUTES', 5)),
  googleClientId: envValue(['GOOGLE_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_ID']),
  googleClientSecret: envValue(['GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET']),
  googleCallbackUrl: envValue('GOOGLE_CALLBACK_URL', 'http://localhost:3000/api/v1/auth/google/callback'),
  kycProvider: envValue('KYC_PROVIDER', 'simulator'),
  uidaiKycEndpoint: envValue('UIDAI_KYC_ENDPOINT', 'https://developer.uidai.gov.in/uidkyc/kyc/2.5'),
  uidaiKycVersion: envValue('UIDAI_KYC_VERSION', '2.5'),
  uidaiKycAc: envValue('UIDAI_KYC_AC', 'public'),
  uidaiKycAsaLicenseKey: envValue('UIDAI_KYC_ASA_LICENSE_KEY'),
  uidaiKycConsent: envValue('UIDAI_KYC_CONSENT', 'Y'),
  uidaiKycSource: envValue('UIDAI_KYC_SOURCE', 'WEB'),
  envDiagnostics: {
    cwd: process.cwd(),
    googleClientIdLoaded: Boolean(envValue(['GOOGLE_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_ID'])),
    googleClientSecretLoaded: Boolean(envValue(['GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_CLIENT_SECRET'])),
    googleClientIdSource: envSources.GOOGLE_CLIENT_ID || envSources.GOOGLE_OAUTH_CLIENT_ID || 'process.env-or-missing',
    googleClientSecretSource: envSources.GOOGLE_CLIENT_SECRET || envSources.GOOGLE_OAUTH_CLIENT_SECRET || 'process.env-or-missing'
  }
};

module.exports = config;
