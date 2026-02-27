// ─────────────────────────────────────────────────────────────────────────────
// Provenance API Routes — citations, sources, gap analysis
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const { pool, withUser } = require('../db/pool');

const router = Router();

// ── GET citations for a record (with source details) ─────────────────────────
router.get('/citations/:tableName/:recordPk', async (req, res, next) => {
  try {
    const { tableName, recordPk } = req.params;
    const result = await pool.query(
      `SELECT * FROM provenance.v_citations_with_sources
       WHERE table_name = $1 AND record_pk = $2
       ORDER BY field_name, is_primary_source DESC`,
      [tableName, recordPk]
    );

    // Group by field_name for easier frontend consumption
    const byField = {};
    for (const row of result.rows) {
      if (!byField[row.field_name]) byField[row.field_name] = [];
      byField[row.field_name].push(row);
    }

    res.json({ citations: byField, flat: result.rows });
  } catch (err) { next(err); }
});


// ── GET citation coverage summary ────────────────────────────────────────────
router.get('/coverage/:tableName/:recordPk', async (req, res, next) => {
  try {
    const { tableName, recordPk } = req.params;
    const result = await pool.query(
      `SELECT * FROM provenance.v_citation_coverage
       WHERE table_name = $1 AND record_pk = $2`,
      [tableName, recordPk]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});


// ── GET uncited fields (intelligence gaps) ───────────────────────────────────
router.get('/gaps/:tableName/:recordPk', async (req, res, next) => {
  try {
    const { tableName, recordPk } = req.params;
    const result = await pool.query(
      'SELECT * FROM provenance.fn_uncited_fields($1, $2)',
      [tableName, recordPk]
    );
    res.json(result.rows.map(r => r.field_name));
  } catch (err) { next(err); }
});


// ── ADD a citation ───────────────────────────────────────────────────────────
router.post('/citations', async (req, res, next) => {
  try {
    const {
      table_name, record_pk, field_name, source_id,
      confidence_level, analyst_user_id, obtained_date,
      is_primary = false, version_sk = null, notes = null
    } = req.body;

    await withUser(analyst_user_id, async (client) => {
      await client.query(
        `CALL provenance.sp_add_citation($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [table_name, record_pk, field_name, source_id,
         confidence_level, analyst_user_id, obtained_date,
         is_primary, version_sk, notes]
      );
    });

    // Return updated citations for this record
    const result = await pool.query(
      `SELECT * FROM provenance.v_citations_with_sources
       WHERE table_name = $1 AND record_pk = $2 AND field_name = $3
       ORDER BY is_primary_source DESC`,
      [table_name, record_pk, field_name]
    );

    res.status(201).json(result.rows);
  } catch (err) { next(err); }
});


// ── BULK ADD citations ───────────────────────────────────────────────────────
router.post('/citations/bulk', async (req, res, next) => {
  try {
    const {
      table_name, record_pk, field_names, source_id,
      confidence_level, analyst_user_id, obtained_date, notes = null
    } = req.body;

    if (!Array.isArray(field_names) || !field_names.length) {
      return res.status(400).json({ error: 'field_names array required' });
    }

    await withUser(analyst_user_id, async (client) => {
      await client.query(
        `CALL provenance.sp_add_bulk_citations($1, $2, $3, $4, $5, $6, $7, $8)`,
        [table_name, record_pk, field_names, source_id,
         confidence_level, analyst_user_id, obtained_date, notes]
      );
    });

    res.status(201).json({ success: true, count: field_names.length });
  } catch (err) { next(err); }
});


// ── SUPERSEDE a citation ─────────────────────────────────────────────────────
router.post('/citations/:citationId/supersede', async (req, res, next) => {
  try {
    const { citationId } = req.params;
    const {
      source_id, confidence_level, analyst_user_id,
      obtained_date, is_primary = false, notes = null
    } = req.body;

    await withUser(analyst_user_id, async (client) => {
      await client.query(
        `CALL provenance.sp_supersede_citation($1, $2, $3, $4, $5, $6, $7)`,
        [parseInt(citationId), source_id, confidence_level,
         analyst_user_id, obtained_date, is_primary, notes]
      );
    });

    res.json({ success: true });
  } catch (err) { next(err); }
});


// ── VALIDATE citations (find orphans) ────────────────────────────────────────
router.get('/validate', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM provenance.fn_validate_citations()');
    res.json(result.rows);
  } catch (err) { next(err); }
});


// ── SOURCE CRUD ──────────────────────────────────────────────────────────────

// List all sources
router.get('/sources', async (req, res, next) => {
  try {
    const { search, type } = req.query;
    let sql = 'SELECT * FROM provenance.citation_source WHERE is_active = TRUE';
    const params = [];
    let idx = 1;

    if (type) { sql += ` AND source_type = $${idx++}`; params.push(type); }
    if (search) { sql += ` AND source_name ILIKE $${idx++}`; params.push(`%${search}%`); }

    sql += ' ORDER BY source_name';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// Create a source
router.post('/sources', async (req, res, next) => {
  try {
    const {
      source_type, source_name, source_reference, source_publisher,
      source_date, source_reliability, source_credibility, classification, notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO provenance.citation_source
       (source_type, source_name, source_reference, source_publisher,
        source_date, source_reliability, source_credibility, classification, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [source_type, source_name, source_reference, source_publisher,
       source_date, source_reliability, source_credibility, classification, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── FIELD REGISTRY ───────────────────────────────────────────────────────────
router.get('/fields/:tableName', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM provenance.field_registry
       WHERE table_name = $1 AND is_citable = TRUE
       ORDER BY field_name`,
      [req.params.tableName]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});


module.exports = router;
