#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Database migration runner
// Reads and executes SQL files from /db in order
// Usage: node src/db/migrate.js [--seed]
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const includeSeed = process.argv.includes('--seed');

async function migrate() {
  // Connect as superuser or the DB owner for schema creation
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'threat_network',
    user: process.env.DB_USER || 'threat_admin',
    password: process.env.DB_PASSWORD || 'changeme',
  });

  const dbDir = path.resolve(__dirname, '../../../db');
  const files = ['01_scd2_audit.sql', '02_provenance.sql'];
  if (includeSeed) files.push('03_seed.sql');

  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Threat Network DB — Migration Runner    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
  console.log(`Files: ${files.join(', ')}`);
  console.log('');

  for (const file of files) {
    const filePath = path.join(dbDir, file);
    if (!fs.existsSync(filePath)) {
      console.error(`  ✗ File not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`  ▸ Running ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await pool.query(sql);
      console.log(`  ✓ ${file} — OK`);
    } catch (err) {
      console.error(`  ✗ ${file} — FAILED`);
      console.error(`    ${err.message}`);
      // If it's a "already exists" error, that's OK for re-runs
      if (err.message.includes('already exists')) {
        console.log('    (Continuing — objects already exist)');
      } else {
        await pool.end();
        process.exit(1);
      }
    }
  }

  console.log('');
  console.log('Migration complete.');
  await pool.end();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
