const db = require('../config/database');

const mapUser = (row) => row && ({
  id: row.id,
  mobileNumber: row.mobile_number,
  fullName: row.full_name,
  isActive: Boolean(row.is_active),
  isVerified: Boolean(row.is_verified),
  oauthProvider: row.oauth_provider,
  oauthProviderId: row.oauth_provider_id,
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const findByMobileNumber = (mobileNumber) => mapUser(
  db.prepare('SELECT * FROM users WHERE mobile_number = ?').get(mobileNumber)
);

const findById = (id) => mapUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));

const findByOauth = (provider, providerId) => mapUser(
  db.prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_provider_id = ?').get(provider, providerId)
);

const create = ({ mobileNumber, fullName, isVerified = 0, oauthProvider = null, oauthProviderId = null }) => {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO users (mobile_number, full_name, is_verified, oauth_provider, oauth_provider_id, last_login_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(mobileNumber, fullName || null, isVerified ? 1 : 0, oauthProvider, oauthProviderId, now, now, now);
  return findById(result.lastInsertRowid);
};

const updateProfile = ({ id, fullName }) => {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET full_name = ?, updated_at = ? WHERE id = ?').run(fullName, now, id);
  return findById(id);
};

const markVerifiedLogin = ({ id, fullName }) => {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users
    SET full_name = COALESCE(full_name, ?), is_verified = 1, last_login_at = ?, updated_at = ?
    WHERE id = ?
  `).run(fullName || null, now, now, id);
  return findById(id);
};

const listDetailed = () => db.prepare(`
  SELECT u.*, w.currency, w.balance, w.locked_balance, k.status AS kyc_status, k.aadhaar_number_masked, k.verified_at
  FROM users u
  LEFT JOIN wallets w ON w.user_id = u.id
  LEFT JOIN kyc_records k ON k.user_id = u.id
  ORDER BY u.id ASC
`).all().map((row) => ({
  ...mapUser(row),
  wallet: row.currency ? { currency: row.currency, balance: row.balance, lockedBalance: row.locked_balance } : null,
  kyc: row.kyc_status ? { status: row.kyc_status, aadhaarNumberMasked: row.aadhaar_number_masked, verifiedAt: row.verified_at } : null
}));

module.exports = { findByMobileNumber, findById, findByOauth, create, updateProfile, markVerifiedLogin, listDetailed };
