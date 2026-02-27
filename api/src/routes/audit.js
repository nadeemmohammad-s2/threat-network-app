// ─────────────────────────────────────────────────────────────────────────────
// Audit API Routes — change history for any table/record
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const { pool } = require('../db/pool');

const router = Router();

// ── GET change log for any table/record ──────────────────────────────────────
router.get('/:tableName/:recordPk', async (req, res, next) => {
  try {
    const { tableName, recordPk } = req.params;
    const result = await pool.query(
      'SELECT * FROM audit.fn_get_record_history($1, $2)',
      [tableName, recordPk]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

module.exports = router;
