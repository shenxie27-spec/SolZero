import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

export function openDb(dbPath = config.dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet TEXT NOT NULL UNIQUE,
      code TEXT NOT NULL UNIQUE,
      points INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      last_checkin_date TEXT,
      referrer_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS auth_nonces (
      nonce TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS points_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      amount INTEGER NOT NULL,
      ref_sig TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_unique
      ON points_ledger(kind, ref_sig) WHERE ref_sig IS NOT NULL;
    CREATE TABLE IF NOT EXISTS claimed_sigs (
      sig TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      kind TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      downline_id INTEGER NOT NULL,
      level INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(downline_id, level)
    );
    CREATE TABLE IF NOT EXISTS blocked_mints (
      user_id INTEGER NOT NULL,
      mint TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, mint)
    );
    CREATE TABLE IF NOT EXISTS cleanup_allowlist (
      user_id INTEGER NOT NULL,
      mint TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, mint)
    );
    CREATE TABLE IF NOT EXISTS error_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      context TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      wallet TEXT,
      ip TEXT,
      user_agent TEXT,
      app_version TEXT,
      platform TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_error_reports_created
      ON error_reports(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_error_reports_ip
      ON error_reports(ip);
  `);
  for (const col of ['last_cleanup_date TEXT', 'last_task_date TEXT']) {
    try {
      db.exec(`ALTER TABLE users ADD COLUMN ${col}`);
    } catch (err) {
      /* column already exists */
    }
  }
  return db;
}

export const db = openDb();
