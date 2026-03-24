const db = require('../config/database');

const mapKyc = (row) => row && ({
  id: row.id,
  userId: row.user_id,
  aadhaarNumberMasked: row.aadhaar_number_masked,
  status: row.status,
  verificationReference: row.verification_reference,
  providerName: row.provider_name,
  verifiedAt: row.verified_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const upsert = ({ userId, aadhaarNumberMasked, status, verificationReference, providerName, verifiedAt }) => {
  const existing = db.prepare('SELECT id FROM kyc_records WHERE user_id = ?').get(userId);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE kyc_records
      SET aadhaar_number_masked = ?, status = ?, verification_reference = ?, provider_name = ?, verified_at = ?, updated_at = ?
      WHERE user_id = ?
    `).run(aadhaarNumberMasked, status, verificationReference, providerName, verifiedAt, now, userId);
  } else {
    db.prepare(`
      INSERT INTO kyc_records (user_id, aadhaar_number_masked, status, verification_reference, provider_name, verified_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, aadhaarNumberMasked, status, verificationReference, providerName, verifiedAt, now, now);
  }

  return mapKyc(db.prepare('SELECT * FROM kyc_records WHERE user_id = ?').get(userId));
};

const findByUserId = (userId) => mapKyc(db.prepare('SELECT * FROM kyc_records WHERE user_id = ?').get(userId));

module.exports = { upsert, findByUserId };
