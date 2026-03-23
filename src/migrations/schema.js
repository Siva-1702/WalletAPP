const db = require('../config/database');


const ensureColumn = (tableName, columnName, definition) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const runMigrations = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile_number TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      full_name TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      is_verified INTEGER NOT NULL DEFAULT 0,
      oauth_provider TEXT,
      oauth_provider_id TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS otp_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile_number TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      is_consumed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_otp_mobile_purpose ON otp_requests (mobile_number, purpose, created_at DESC);

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      currency TEXT NOT NULL DEFAULT 'INR',
      balance REAL NOT NULL DEFAULT 0,
      locked_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
      category TEXT NOT NULL CHECK (category IN ('ADD_MONEY', 'WITHDRAWAL', 'ADJUSTMENT')),
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      reference TEXT NOT NULL UNIQUE,
      narration TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions (wallet_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS kyc_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      aadhaar_number_masked TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
      verification_reference TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      verified_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  ensureColumn('users', 'email', 'TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL');
};

module.exports = { runMigrations };
