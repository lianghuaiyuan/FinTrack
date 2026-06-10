const db = require('./connection');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('零钱','银行','证券投资','其他')),
      asset_category TEXT NOT NULL CHECK(asset_category IN ('零钱','定期存款','投资')),
      current_balance REAL NOT NULL DEFAULT 0,
      last_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS balance_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      balance REAL NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      note TEXT DEFAULT '',
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS adjustment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      old_balance REAL NOT NULL,
      new_balance REAL NOT NULL,
      adjustment_amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('set','adjust')),
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      principal REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      annual_rate REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','redeemed')),
      redeemed_at TEXT,
      redeemed_amount REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS income_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_account ON balance_snapshots(account_id, recorded_at);
    CREATE INDEX IF NOT EXISTS idx_adjustments_account ON adjustment_records(account_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_deposits_user ON time_deposits(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON income_expenses(user_id, date);
  `);

  console.log('Database initialized successfully.');

  // Migration: add is_admin column for older databases
  try {
    db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0');
  } catch { /* column already exists — safe to ignore */ }

  // Seed admin account
  const bcrypt = require('bcryptjs');
  const config = require('../config');
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    const hash = bcrypt.hashSync('11235813', config.BCRYPT_ROUNDS);
    db.prepare('INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)').run('admin', hash);
    console.log('[FinTrack] Admin account created (admin)');
  }
}

module.exports = { initializeDatabase };
