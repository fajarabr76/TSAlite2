import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = join(process.cwd(), 'data.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    model_id TEXT NOT NULL,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    input_price_usd_per_million REAL DEFAULT 0,
    output_price_usd_per_million REAL DEFAULT 0,
    usd_to_idr_rate REAL DEFAULT 1,
    estimated_cost_usd REAL DEFAULT 0,
    estimated_cost_idr REAL DEFAULT 0,
    request_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_pricing_settings (
    model_id TEXT PRIMARY KEY,
    input_price_usd_per_million REAL NOT NULL,
    output_price_usd_per_million REAL NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS ai_billing_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    module TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, module)
  );
`);

// Seed default billing settings
const seedBilling = db.prepare('INSERT OR IGNORE INTO ai_billing_settings (key, value) VALUES (?, ?)');
seedBilling.run('usd_to_idr_rate', '16000');

// Seed some default pricing (can be updated later)
const seedPricing = db.prepare('INSERT OR IGNORE INTO ai_pricing_settings (model_id, input_price_usd_per_million, output_price_usd_per_million) VALUES (?, ?, ?)');
seedPricing.run('gemini-1.5-flash', 0.1, 0.4);
seedPricing.run('gemini-1.5-pro', 3.5, 10.5);
seedPricing.run('gemini-3-flash-preview', 0, 0);
seedPricing.run('gemini-3.1-flash-live-preview', 0, 0);
seedPricing.run('gpt-4o-mini', 0.15, 0.6);
seedPricing.run('gpt-4o', 5, 15);

export default db;
