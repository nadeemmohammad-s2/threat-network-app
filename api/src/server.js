// ─────────────────────────────────────────────────────────────────────────────
// Threat Network API — Server
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pool } = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    }
  });
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/threat-networks', require('./routes/threatNetworks'));
app.use('/api/entities', require('./routes/entities'));
app.use('/api/ref', require('./routes/refTables'));
app.use('/api/junctions', require('./routes/junctions'));
app.use('/api/htf', require('./routes/htfTables'));
app.use('/api/provenance', require('./routes/provenance'));
app.use('/api/audit', require('./routes/audit'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    res.json({
      status: 'ok',
      database: result.rows[0].db,
      time: result.rows[0].time,
    });
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message });
  }
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('API Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // PostgreSQL-specific error handling
  if (err.code) {
    const pgErrors = {
      '23505': { status: 409, message: 'Duplicate record' },
      '23503': { status: 400, message: 'Referenced record not found' },
      '23502': { status: 400, message: 'Required field missing' },
      'P0001': { status: 400, message: err.message }, // RAISE EXCEPTION
    };
    const mapped = pgErrors[err.code];
    if (mapped) return res.status(mapped.status).json({ error: mapped.message });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Threat Network API                      ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`  → http://localhost:${PORT}`);
  console.log(`  → Health: http://localhost:${PORT}/api/health`);
  console.log(`  → Env: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
});

module.exports = app;
