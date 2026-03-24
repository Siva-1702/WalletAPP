const crypto = require('crypto');
const env = require('../config/env');

const encode = (input) => Buffer.from(JSON.stringify(input)).toString('base64url');
const sign = (content) => crypto.createHmac('sha256', env.jwtSecret).update(content).digest('base64url');

const signToken = (payload) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const tokenPayload = { ...payload, iat: issuedAt, exp: issuedAt + env.jwtExpiresInSeconds };
  const content = `${encode(header)}.${encode(tokenPayload)}`;
  return `${content}.${sign(content)}`;
};

const verifyToken = (token) => {
  const [header, payload, signature] = token.split('.');
  const content = `${header}.${payload}`;
  if (sign(content) !== signature) {
    throw new Error('Invalid token signature');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  if (decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return decoded;
};

module.exports = { signToken, verifyToken };
