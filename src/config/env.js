const path = require('path');

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS || 86400),
  dbStorage: process.env.DB_STORAGE || path.join(process.cwd(), 'storage', 'wallet.sqlite'),
  otpTtlMinutes: Number(process.env.OTP_TTL_MINUTES || 5),
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/v1/auth/google/callback',
  kycProvider: process.env.KYC_PROVIDER || 'simulator',
  uidaiKycEndpoint: process.env.UIDAI_KYC_ENDPOINT || 'https://developer.uidai.gov.in/uidkyc/kyc/2.5',
  uidaiKycVersion: process.env.UIDAI_KYC_VERSION || '2.5',
  uidaiKycAc: process.env.UIDAI_KYC_AC || 'public',
  uidaiKycAsaLicenseKey: process.env.UIDAI_KYC_ASA_LICENSE_KEY || '',
  uidaiKycConsent: process.env.UIDAI_KYC_CONSENT || 'Y',
  uidaiKycSource: process.env.UIDAI_KYC_SOURCE || 'WEB'
};
