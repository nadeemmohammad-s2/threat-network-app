// ─────────────────────────────────────────────────────────────────────────────
// HTF Reference Tables API Routes
// ─────────────────────────────────────────────────────────────────────────────
// GET    /api/htf/:table           → list all records (active only by default)
// GET    /api/htf/:table/:id       → get single record
// POST   /api/htf/:table           → create record
// PUT    /api/htf/:table/:id       → update record
// DELETE /api/htf/:table/:id       → soft-delete (set is_active = FALSE)
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const { pool, withUser } = require('../db/pool');

const router = Router();

const HTF_CONFIG = {
  threat_classification: {
    table: 'htf.threat_classification',
    pk: 'threat_class_id',
    fields: ['code', 'name', 'description', 'example', 'priority', 'notes'],
    orderBy: 'priority ASC NULLS LAST, name',
    label: 'Threat Classification',
  },
  threat_subclassification: {
    table: 'htf.threat_subclassification',
    pk: 'threat_subclass_id',
    fields: ['name', 'threat_classification', 'description'],
    orderBy: 'threat_classification, name',
    label: 'Threat Subclassification',
  },
  roles: {
    table: 'htf.role',
    pk: 'role_id',
    fields: ['code', 'name', 'description', 'context', 'hierarchy', 'ml_phase', 'intent'],
    orderBy: 'code::int ASC NULLS LAST, name',
    label: 'Roles',
  },
  ttp: {
    table: 'htf.ttp',
    pk: 'ttp_id',
    fields: ['name', 'definition', 'complexity_level', 'hierarchy', 'stage', 'scheme', 'tactical_category', 'fi_detectible'],
    orderBy: 'name',
    label: 'TTP',
  },
  ttp_signal: {
    table: 'htf.ttp_signal',
    pk: 'ttp_signal_id',
    fields: ['ttp_signal_name', 'ttp_signal_description', 'ttp_signal_family'],
    orderBy: 'ttp_signal_family, ttp_signal_name',
    label: 'TTP Signal',
  },
  ttp_record: {
    table: 'htf.ttp_record',
    pk: 'ttp_record_id',
    fields: ['role_id', 'threat_subclass_id', 'ttp_id', 'source_id', 'person_interest_id', 'organization_interest_id', 'threat_classification_id', 'threat_subclassification_id', 'echelon', 'financial_products', 'financial_channels', 'supporting_quotes', 'description', 'detection_logic', 'user_id', 'extraction_date', 'extractor_model_version', 'confidence_score'],
    orderBy: 'created_ts DESC',
    label: 'TTP Record',
  },
};


// ── LIST ALL TABLES ──────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const tables = Object.entries(HTF_CONFIG).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      pk: cfg.pk,
    }));
    // Get counts
    for (const t of tables) {
      const r = await pool.query(
        `SELECT COUNT(*) as count FROM ${HTF_CONFIG[t.key].table} WHERE is_active = TRUE`
      );
      t.count = parseInt(r.rows[0].count);
    }
    res.json({ tables });
  } catch (err) { next(err); }
});


// ── LIST RECORDS ─────────────────────────────────────────────────────────────
router.get('/:table', async (req, res, next) => {
  const config = HTF_CONFIG[req.params.table];
  if (!config) return res.status(400).json({ error: `Unknown table: ${req.params.table}` });

  try {
    const includeInactive = req.query.include_inactive === 'true';
    const where = includeInactive ? '' : 'WHERE is_active = TRUE';
    let query = `SELECT * FROM ${config.table} ${where} ORDER BY ${config.orderBy}`;

    // Special handling for ttp_record: join names
    if (req.params.table === 'ttp_record') {
      query = `
        SELECT tr.*,
          r.name as role_name,
          ts.name as subclass_name, ts.threat_classification,
          t.name as ttp_name,
          ps.source_name,
          pi.name as person_name,
          oi.name as org_name,
          tc.name as classification_name
        FROM ${config.table} tr
        LEFT JOIN htf.role r ON r.role_id = tr.role_id
        LEFT JOIN htf.threat_subclassification ts ON ts.threat_subclass_id = tr.threat_subclass_id
        LEFT JOIN htf.ttp t ON t.ttp_id = tr.ttp_id
        LEFT JOIN provenance.citation_source ps ON ps.source_id = tr.source_id
        LEFT JOIN person_interest pi ON pi.person_interest_id = tr.person_interest_id
        LEFT JOIN organization_interest oi ON oi.organization_interest_id = tr.organization_interest_id
        LEFT JOIN htf.threat_classification tc ON tc.threat_class_id = tr.threat_classification_id
        ${includeInactive ? '' : 'WHERE tr.is_active = TRUE'}
        ORDER BY tr.created_ts DESC
      `;
    }

    const result = await pool.query(query);
    res.json({ table: req.params.table, label: config.label, data: result.rows, total: result.rows.length });
  } catch (err) { next(err); }
});


// ── GET SINGLE ───────────────────────────────────────────────────────────────
router.get('/:table/:id', async (req, res, next) => {
  const config = HTF_CONFIG[req.params.table];
  if (!config) return res.status(400).json({ error: `Unknown table: ${req.params.table}` });

  try {
    const result = await pool.query(
      `SELECT * FROM ${config.table} WHERE ${config.pk} = $1`, [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/:table', async (req, res, next) => {
  const config = HTF_CONFIG[req.params.table];
  if (!config) return res.status(400).json({ error: `Unknown table: ${req.params.table}` });

  try {
    const { user_id = 1, ...data } = req.body;
    const cols = config.fields.filter(f => data[f] !== undefined && data[f] !== '');
    if (!cols.length) return res.status(400).json({ error: 'No fields provided' });

    const vals = cols.map(c => data[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`);

    const result = await withUser(user_id, async (client) => {
      return client.query(
        `INSERT INTO ${config.table} (${cols.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`,
        vals
      );
    });

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:table/:id', async (req, res, next) => {
  const config = HTF_CONFIG[req.params.table];
  if (!config) return res.status(400).json({ error: `Unknown table: ${req.params.table}` });

  try {
    const { user_id = 1, ...data } = req.body;
    const cols = config.fields.filter(f => data[f] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = cols.map((c, i) => `${c} = $${i + 1}`);
    setClauses.push('updated_ts = NOW()');
    const vals = [...cols.map(c => data[c]), req.params.id];

    const result = await withUser(user_id, async (client) => {
      return client.query(
        `UPDATE ${config.table}
         SET ${setClauses.join(', ')}
         WHERE ${config.pk} = $${vals.length}
         RETURNING *`,
        vals
      );
    });

    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── SOFT DELETE ──────────────────────────────────────────────────────────────
router.delete('/:table/:id', async (req, res, next) => {
  const config = HTF_CONFIG[req.params.table];
  if (!config) return res.status(400).json({ error: `Unknown table: ${req.params.table}` });

  try {
    const { user_id = 1 } = req.body;
    const result = await withUser(user_id, async (client) => {
      return client.query(
        `UPDATE ${config.table}
         SET is_active = FALSE, updated_ts = NOW()
         WHERE ${config.pk} = $1
         RETURNING ${config.pk}`,
        [req.params.id]
      );
    });

    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, deactivated_id: result.rows[0][config.pk] });
  } catch (err) { next(err); }
});


module.exports = router;
