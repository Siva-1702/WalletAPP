const test = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.DB_STORAGE = '/workspace/WalletAPP/storage/test.sqlite';
process.env.JWT_SECRET = 'test-secret';

const db = require('../src/config/database');
const { runMigrations } = require('../src/migrations/schema');
const { createApp } = require('../src/app');
const { buildGoogleAuthUrl, decodeState, syncGoogleUser } = require('../src/services/oauthService');
const { parseEnvContent, loadEnvFiles, mergeEnv } = require('../src/utils/envFile');

const resetDb = () => {
  runMigrations();
  db.exec(`
    DELETE FROM wallet_transactions;
    DELETE FROM kyc_records;
    DELETE FROM wallets;
    DELETE FROM otp_requests;
    DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);
};

const startServer = async () => {
  const app = createApp();
  await new Promise((resolve) => app.listen(0, '127.0.0.1', resolve));
  const address = app.address();
  return { server: app, baseUrl: `http://127.0.0.1:${address.port}` };
};

test('env merge does not overwrite non-empty values with empty fallback values', () => {
  const merged = mergeEnv({ GOOGLE_CLIENT_ID: 'real-client' }, { GOOGLE_CLIENT_ID: '' });
  assert.equal(merged.GOOGLE_CLIENT_ID, 'real-client');
});

test('env parser supports pasted single-line content with escaped newlines', () => {
  const parsed = parseEnvContent('PORT=3000\nGOOGLE_CLIENT_ID=abc123\nGOOGLE_CLIENT_SECRET=secret123');
  assert.equal(parsed.PORT, '3000');
  assert.equal(parsed.GOOGLE_CLIENT_ID, 'abc123');
  assert.equal(parsed.GOOGLE_CLIENT_SECRET, 'secret123');
});

test('env file parser reads key value pairs and ignores comments', () => {
  const parsed = parseEnvContent('# comment\nGOOGLE_CLIENT_ID=test-client\nGOOGLE_CLIENT_SECRET=test-secret\n');
  assert.equal(parsed.GOOGLE_CLIENT_ID, 'test-client');
  assert.equal(parsed.GOOGLE_CLIENT_SECRET, 'test-secret');
});

test('env loader falls back to .env.example and lets .env override it', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walletapp-env-'));
  fs.writeFileSync(path.join(tempDir, '.env.example'), 'GOOGLE_CLIENT_ID=example-client\nPORT=3000\n');
  fs.writeFileSync(path.join(tempDir, '.env'), 'GOOGLE_CLIENT_ID=real-client\n');
  const loaded = loadEnvFiles(tempDir);
  assert.equal(loaded.GOOGLE_CLIENT_ID, 'real-client');
  assert.equal(loaded.PORT, '3000');
});

test('env loader keeps credentials when typo file has blanks', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'walletapp-env-typo-'));
  fs.writeFileSync(path.join(tempDir, '.env'), 'GOOGLE_CLIENT_ID=real-client\nGOOGLE_CLIENT_SECRET=real-secret\n');
  fs.writeFileSync(path.join(tempDir, '.env.examp'), 'GOOGLE_CLIENT_ID=\nGOOGLE_CLIENT_SECRET=\n');
  const loaded = loadEnvFiles(tempDir);
  assert.equal(loaded.GOOGLE_CLIENT_ID, 'real-client');
  assert.equal(loaded.GOOGLE_CLIENT_SECRET, 'real-secret');
});

test('health endpoint responds successfully', async () => {
  resetDb();
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/v1/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.success, true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('root path serves the requested UI shell', async () => {
  resetDb();
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    assert.equal(response.status, 200);
    assert.match(html, /Just Verify &amp; Play/);
    assert.match(html, /My Account/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Google OAuth state round-trip works for register mode', async () => {
  const authUrl = new URL(buildGoogleAuthUrl('register'));
  const state = authUrl.searchParams.get('state');
  const payload = decodeState(state);
  assert.equal(payload.mode, 'register');
});

test('Google login validation rejects unregistered Google users', async () => {
  resetDb();
  assert.throws(() => syncGoogleUser({
    mode: 'login',
    profile: { sub: 'google-sub-1', email: 'new@example.com', email_verified: true, name: 'New User' }
  }), /Google account not registered/);
});

test('Google register validation rejects already registered Google users', async () => {
  resetDb();
  syncGoogleUser({
    mode: 'register',
    profile: { sub: 'google-sub-2', email: 'google@example.com', email_verified: true, name: 'Google User' }
  });
  assert.throws(() => syncGoogleUser({
    mode: 'register',
    profile: { sub: 'google-sub-2', email: 'google@example.com', email_verified: true, name: 'Google User' }
  }), /Google account already registered/);
});

test('OTP request accepts formatted mobile numbers with spaces', async () => {
  resetDb();
  const { server, baseUrl } = await startServer();
  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '+91 8778277017', purpose: 'REGISTER' })
    });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.match(body.data.otp, /^\d{6}$/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('KYC accepts Aadhaar numbers formatted with spaces', async () => {
  resetDb();
  const { server, baseUrl } = await startServer();
  try {
    const otpResponse = await fetch(`${baseUrl}/api/v1/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '+919876543210', purpose: 'REGISTER' })
    });
    const otpBody = await otpResponse.json();

    const verifyResponse = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNumber: '+919876543210',
        purpose: 'REGISTER',
        otp: otpBody.data.otp,
        fullName: 'Praveen Kumar'
      })
    });
    const verifyBody = await verifyResponse.json();
    const token = verifyBody.data.token;

    const kycResponse = await fetch(`${baseUrl}/api/v1/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ aadhaarNumber: '3738 4011 12 34' })
    });
    const kycBody = await kycResponse.json();
    assert.equal(kycResponse.status, 201);
    assert.equal(kycBody.data.record.aadhaarNumberMasked, 'XXXX-XXXX-1234');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('OTP registration and wallet flow works end-to-end', async () => {
  resetDb();
  const { server, baseUrl } = await startServer();

  try {
    const otpResponse = await fetch(`${baseUrl}/api/v1/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '+919876543210', purpose: 'REGISTER' })
    });
    const otpBody = await otpResponse.json();
    assert.equal(otpResponse.status, 201);
    assert.match(otpBody.data.otp, /^\d{6}$/);

    const verifyResponse = await fetch(`${baseUrl}/api/v1/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobileNumber: '+919876543210',
        purpose: 'REGISTER',
        otp: otpBody.data.otp,
        fullName: 'Praveen Kumar'
      })
    });
    const verifyBody = await verifyResponse.json();
    const token = verifyBody.data.token;
    assert.equal(verifyResponse.status, 200);

    const addMoneyResponse = await fetch(`${baseUrl}/api/v1/wallet/add-money`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: 500, narration: 'Initial deposit' })
    });
    const addMoneyBody = await addMoneyResponse.json();
    assert.equal(addMoneyResponse.status, 201);
    assert.equal(addMoneyBody.data.wallet.balance, 500);

    const withdrawResponse = await fetch(`${baseUrl}/api/v1/wallet/withdraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: 125, narration: 'ATM payout' })
    });
    const withdrawBody = await withdrawResponse.json();
    assert.equal(withdrawResponse.status, 201);
    assert.equal(withdrawBody.data.wallet.balance, 375);

    const passbookResponse = await fetch(`${baseUrl}/api/v1/wallet/passbook`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const passbookBody = await passbookResponse.json();
    assert.equal(passbookResponse.status, 200);
    assert.equal(passbookBody.data.summary.totalEntries, 2);

    const kycResponse = await fetch(`${baseUrl}/api/v1/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ aadhaarNumber: '123412341234' })
    });
    const kycBody = await kycResponse.json();
    assert.equal(kycResponse.status, 201);
    assert.equal(kycBody.data.record.status, 'VERIFIED');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
