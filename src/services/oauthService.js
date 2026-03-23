const crypto = require('crypto');
const env = require('../config/env');
const userModel = require('../models/userModel');
const walletModel = require('../models/walletModel');
const ApiError = require('../utils/apiError');
const { buildAuthPayload } = require('./authService');

const uiRedirectBase = () => {
  try {
    return new URL(env.googleCallbackUrl).origin;
  } catch (error) {
    return `http://localhost:${env.port}`;
  }
};

const encodeState = (payload) => {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', env.jwtSecret).update(body).digest('base64url');
  return `${body}.${signature}`;
};

const decodeState = (state) => {
  const [body, signature] = String(state || '').split('.');
  const expectedSignature = crypto.createHmac('sha256', env.jwtSecret).update(body || '').digest('base64url');
  if (!body || !signature || signature !== expectedSignature) {
    throw new ApiError(401, 'Invalid Google OAuth state.');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!['register', 'login'].includes(payload.mode)) {
    throw new ApiError(400, 'Invalid Google OAuth mode.');
  }
  if (payload.exp < Date.now()) {
    throw new ApiError(401, 'Google OAuth state expired.');
  }
  return payload;
};

const buildGoogleAuthUrl = (mode) => {
  if (!['register', 'login'].includes(mode)) {
    throw new ApiError(422, 'Google mode must be register or login.');
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.googleClientId);
  url.searchParams.set('redirect_uri', env.googleCallbackUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', encodeState({ mode, exp: Date.now() + (10 * 60 * 1000) }));
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
};

const exchangeCodeForGoogleProfile = async (code) => {
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

  return profileResponse.json();
};

const syncGoogleUser = ({ mode, profile }) => {
  if (!profile?.sub || !profile?.email) {
    throw new ApiError(422, 'Google profile is missing required fields.');
  }
  if (profile.email_verified === false) {
    throw new ApiError(422, 'Google email must be verified before continuing.');
  }

  const existingByOauth = userModel.findByOauth('google', profile.sub);
  const existingByEmail = userModel.findByEmail(profile.email);

  if (mode === 'register') {
    if (existingByOauth || existingByEmail) {
      throw new ApiError(409, 'Google account already registered. Please use Google login.');
    }

    const user = userModel.create({
      mobileNumber: `oauth-google-${profile.sub}`,
      email: profile.email,
      fullName: profile.name || profile.email.split('@')[0],
      isVerified: true,
      oauthProvider: 'google',
      oauthProviderId: profile.sub
    });
    walletModel.ensureForUser(user.id);
    return buildAuthPayload(user);
  }

  const existingUser = existingByOauth || existingByEmail;
  if (!existingUser) {
    throw new ApiError(404, 'Google account not registered. Please use Google register first.');
  }

  if (existingByEmail && existingByEmail.oauthProvider && existingByEmail.oauthProvider !== 'google') {
    throw new ApiError(409, 'This email is linked to a different sign-in method.');
  }

  const user = userModel.updateGoogleIdentity({
    id: existingUser.id,
    email: profile.email,
    providerId: profile.sub,
    fullName: profile.name || existingUser.fullName
  });
  walletModel.ensureForUser(user.id);
  return buildAuthPayload(user);
};

const buildUiRedirect = ({ token, error, mode }) => {
  const url = new URL('/', uiRedirectBase());
  url.hash = new URLSearchParams({
    ...(token ? { token } : {}),
    ...(mode ? { mode } : {}),
    ...(error ? { error } : {})
  }).toString();
  return url.toString();
};

module.exports = {
  buildGoogleAuthUrl,
  decodeState,
  exchangeCodeForGoogleProfile,
  syncGoogleUser,
  buildUiRedirect
};
