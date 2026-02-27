// ─────────────────────────────────────────────────────────────────────────────
// Reference Table API Routes
// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/ref                          → list all ref tables
// GET  /api/ref/map                      → field → ref table mapping
// GET  /api/ref/map/:tableName           → mappings for a specific table
// GET  /api/ref/:refTable                → get values for a ref table
// POST /api/ref/:refTable                → add a new value
// PUT  /api/ref/:refTable/:id            → update a value
// DELETE /api/ref/:refTable/:id          → deactivate a value
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const { pool, withUser } = require('../db/pool');

const router = Router();

// Whitelist of valid ref table names (prevent SQL injection)
const VALID_REF_TABLES = new Set();
async function loadRefTables() {
  try {
    const result = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'ref' AND table_type = 'BASE TABLE'
       AND table_name != 'field_lookup_map'`
    );
    result.rows.forEach(r => VALID_REF_TABLES.add(r.table_name));
  } catch { /* tables may not exist yet */ }
}
loadRefTables();

function validateRefTable(name, res) {
  // Reload if empty (first request before tables loaded)
  if (VALID_REF_TABLES.size === 0) loadRefTables();
  if (!VALID_REF_TABLES.has(name)) {
    // Try reloading once
    return false;
  }
  return true;
}


// ── LIST ALL REF TABLES ──────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT table_name,
              (SELECT COUNT(*) FROM information_schema.columns c
               WHERE c.table_schema = 'ref' AND c.table_name = t.table_name) AS column_count
       FROM information_schema.tables t
       WHERE t.table_schema = 'ref' AND t.table_type = 'BASE TABLE'
         AND t.table_name != 'field_lookup_map'
       ORDER BY t.table_name`
    );

    // Get row counts
    const tables = [];
    for (const row of result.rows) {
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ref.${row.table_name} WHERE is_active = TRUE`);
      tables.push({
        table_name: row.table_name,
        display_name: row.table_name.replace(/_/g, ' ').replace(/\btn\b/g, 'TN'),
        active_count: parseInt(countResult.rows[0].count),
      });
    }

    res.json({ tables });
  } catch (err) { next(err); }
});


// ── FIELD → REF TABLE MAPPING ────────────────────────────────────────────────
router.get('/map', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT table_name, field_name, ref_table, ref_schema
       FROM ref.field_lookup_map
       ORDER BY table_name, field_name`
    );
    res.json({ mappings: result.rows });
  } catch (err) { next(err); }
});

// Mappings for a specific entity table
router.get('/map/:tableName', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT field_name, ref_table, ref_schema
       FROM ref.field_lookup_map
       WHERE table_name = $1
       ORDER BY field_name`,
      [req.params.tableName]
    );

    // For each mapped field, also fetch the current values
    const fieldOptions = {};
    for (const row of result.rows) {
      try {
        const vals = await pool.query(
          `SELECT id, value, description, display_order
           FROM ${row.ref_schema}.${row.ref_table}
           WHERE is_active = TRUE
           ORDER BY display_order, value`
        );
        fieldOptions[row.field_name] = {
          ref_table: row.ref_table,
          values: vals.rows,
        };
      } catch { /* skip if table doesn't exist */ }
    }

    res.json({ table_name: req.params.tableName, fields: fieldOptions });
  } catch (err) { next(err); }
});


// ── GET VALUES FOR A REF TABLE ───────────────────────────────────────────────
router.get('/:refTable', async (req, res, next) => {
  const { refTable } = req.params;
  const { include_inactive } = req.query;

  // Reload whitelist if needed
  if (VALID_REF_TABLES.size === 0) await loadRefTables();
  if (!VALID_REF_TABLES.has(refTable)) {
    // Try one more reload
    await loadRefTables();
    if (!VALID_REF_TABLES.has(refTable)) {
      return res.status(404).json({ error: `Reference table '${refTable}' not found` });
    }
  }

  try {
    const where = include_inactive === 'true' ? '' : 'WHERE is_active = TRUE';
    const result = await pool.query(
      `SELECT * FROM ref.${refTable} ${where} ORDER BY display_order, value`
    );

    // Find which fields use this ref table
    const usedBy = await pool.query(
      `SELECT table_name, field_name FROM ref.field_lookup_map WHERE ref_table = $1`,
      [refTable]
    );

    res.json({
      ref_table: refTable,
      values: result.rows,
      used_by: usedBy.rows,
    });
  } catch (err) { next(err); }
});


// ── ADD A VALUE ──────────────────────────────────────────────────────────────
router.post('/:refTable', async (req, res, next) => {
  const { refTable } = req.params;
  if (VALID_REF_TABLES.size === 0) await loadRefTables();
  if (!VALID_REF_TABLES.has(refTable)) {
    return res.status(404).json({ error: `Reference table '${refTable}' not found` });
  }

  try {
    const { value, description, display_order, user_id = 1, ...extra } = req.body;
    if (!value) return res.status(400).json({ error: 'value is required' });

    // Build dynamic columns from payload
    const cols = ['value'];
    const vals = [value];
    let idx = 2;

    if (description !== undefined) { cols.push('description'); vals.push(description); idx++; }
    if (display_order !== undefined) { cols.push('display_order'); vals.push(display_order); idx++; }

    // Handle extra columns (e.g. category_id, applies_to)
    for (const [k, v] of Object.entries(extra)) {
      if (['user_id'].includes(k)) continue;
      cols.push(k);
      vals.push(v);
      idx++;
    }

    const result = await withUser(user_id, async (client) => {
      return client.query(
        `INSERT INTO ref.${refTable} (${cols.join(', ')})
         VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
         RETURNING *`,
        vals
      );
    });

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Value already exists in ${refTable}` });
    next(err);
  }
});


// ── UPDATE A VALUE ───────────────────────────────────────────────────────────
router.put('/:refTable/:id', async (req, res, next) => {
  const { refTable, id } = req.params;
  if (VALID_REF_TABLES.size === 0) await loadRefTables();
  if (!VALID_REF_TABLES.has(refTable)) {
    return res.status(404).json({ error: `Reference table '${refTable}' not found` });
  }

  try {
    const { user_id = 1, ...data } = req.body;
    const cols = Object.keys(data).filter(k => k !== 'id' && k !== 'created_ts');
    if (!cols.length) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = cols.map((c, i) => `${c} = $${i + 1}`);
    const vals = [...cols.map(c => data[c]), id];

    const result = await withUser(user_id, async (client) => {
      return client.query(
        `UPDATE ref.${refTable} SET ${setClauses.join(', ')}
         WHERE id = $${vals.length} RETURNING *`,
        vals
      );
    });

    if (!result.rows.length) return res.status(404).json({ error: 'Value not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: `Value already exists in ${refTable}` });
    next(err);
  }
});


// ── DEACTIVATE A VALUE ───────────────────────────────────────────────────────
router.delete('/:refTable/:id', async (req, res, next) => {
  const { refTable, id } = req.params;
  if (VALID_REF_TABLES.size === 0) await loadRefTables();
  if (!VALID_REF_TABLES.has(refTable)) {
    return res.status(404).json({ error: `Reference table '${refTable}' not found` });
  }

  try {
    const { user_id = 1 } = req.body;
    const result = await withUser(user_id, async (client) => {
      return client.query(
        `UPDATE ref.${refTable} SET is_active = FALSE WHERE id = $1 RETURNING id, value`,
        [id]
      );
    });

    if (!result.rows.length) return res.status(404).json({ error: 'Value not found' });
    res.json({ success: true, deactivated: result.rows[0] });
  } catch (err) { next(err); }
});


module.exports = router;
