const db = require('../config/database');

const create = ({ mobileNumber, otpHash, purpose, expiresAt }) => {
  const result = db.prepare(`
    INSERT INTO otp_requests (mobile_number, otp_hash, purpose, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(mobileNumber, otpHash, purpose, expiresAt);

  return { id: result.lastInsertRowid, mobileNumber, purpose, expiresAt };
};

const consumeActive = ({ mobileNumber, purpose }) => {
  db.prepare(`
    UPDATE otp_requests
    SET is_consumed = 1
    WHERE mobile_number = ? AND purpose = ? AND is_consumed = 0 AND expires_at > ?
  `).run(mobileNumber, purpose, new Date().toISOString());
};

const latestActive = ({ mobileNumber, purpose }) => db.prepare(`
  SELECT * FROM otp_requests
  WHERE mobile_number = ? AND purpose = ? AND is_consumed = 0
  ORDER BY id DESC LIMIT 1
`).get(mobileNumber, purpose);

const markConsumed = (id) => db.prepare('UPDATE otp_requests SET is_consumed = 1 WHERE id = ?').run(id);

module.exports = { create, consumeActive, latestActive, markConsumed };
