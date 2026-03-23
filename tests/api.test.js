const test = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.DB_STORAGE = '/workspace/WalletAPP/storage/test.sqlite';
process.env.JWT_SECRET = 'test-secret';

const db = require('../src/config/database');
const { runMigrations } = require('../src/migrations/schema');
const { createApp } = require('../src/app');

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
