// ─────────────────────────────────────────────────────────────────────────────
// Entity API Routes — generic CRUD for standalone entity tables
// ─────────────────────────────────────────────────────────────────────────────
// Handles: person_interest, organization_interest, country,
//          threat_boundary, threat_subclass
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const { pool, withUser } = require('../db/pool');

const router = Router();

// ── ENTITY DEFINITIONS ──────────────────────────────────────────────────────
// Maps URL path segments to table names and PK columns
const ENTITIES = {
  persons: { table: 'person_interest', pk: 'person_interest_id', label: 'Person' },
  organizations: { table: 'organization_interest', pk: 'organization_interest_id', label: 'Organization' },
  countries: { table: 'country', pk: 'country_id', label: 'Country' },
  boundaries: { table: 'threat_boundary', pk: 'threat_boundary_id', label: 'Threat Boundary' },
  subclasses: { table: 'threat_subclass', pk: 'threat_subclass_id', label: 'Threat Subclass' },
  sources: { table: 'source', pk: 'source_id', label: 'Source' },
  fi: { table: 'financial_institution', pk: 'fi_id', label: 'Financial Institution' },
  continents: { table: 'continent', pk: 'continent_id', label: 'Continent' },
  regions: { table: 'region', pk: 'region_id', label: 'Region' },
};

// Columns excluded from JSONB payload → SQL INSERT/UPDATE
const SYSTEM_COLS = ['created_ts', 'updated_ts', 'is_deleted'];


// ── VALIDATE ENTITY TYPE ─────────────────────────────────────────────────────
function getEntity(req, res) {
  const entity = ENTITIES[req.params.entityType];
  if (!entity) {
    res.status(400).json({ error: `Unknown entity type: ${req.params.entityType}. Valid types: ${Object.keys(ENTITIES).join(', ')}` });
    return null;
  }
  return entity;
}


// ── LIST ──────────────────────────────────────────────────────────────────────
router.get('/:entityType', async (req, res, next) => {
  const entity = getEntity(req, res);
  if (!entity) return;

  try {
    const { search, limit = 200, offset = 0 } = req.query;
    const conditions = ['is_deleted = FALSE'];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`name ILIKE $${idx++}`);
      params.push(`%${search}%`);
    }

    params.push(parseInt(limit), parseInt(offset));

    const sql = `
      SELECT * FROM ${entity.table}
      WHERE ${conditions.join(' AND ')}
      ORDER BY name
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const countSql = `
      SELECT COUNT(*) as total FROM ${entity.table}
      WHERE ${conditions.join(' AND ')}
    `;

    const [data, count] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, -2)),
    ]);

    res.json({
      data: data.rows,
      total: parseInt(count.rows[0].total),
      entity_type: req.params.entityType,
      label: entity.label,
    });
  } catch (err) { next(err); }
});


// ── GET SINGLE ───────────────────────────────────────────────────────────────
router.get('/:entityType/:id', async (req, res, next) => {
  const entity = getEntity(req, res);
  if (!entity) return;

  try {
    const result = await pool.query(
      `SELECT * FROM ${entity.table} WHERE ${entity.pk} = $1 AND is_deleted = FALSE`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: `${entity.label} not found` });

    // Also find linked threat networks
    const linkMap = {
      persons: { jt: 'x_person_interest_threat_network', fk: 'person_interest_id' },
      organizations: { jt: 'x_organization_interest_threat_network', fk: 'organization_interest_id' },
      countries: { jt: 'x_threat_network_country', fk: 'country_id' },
      boundaries: { jt: 'x_threat_network_threat_boundary', fk: 'threat_boundary_id' },
      subclasses: { jt: 'x_threat_network_threat_subclass', fk: 'threat_subclass_id' },
    };

    const link = linkMap[req.params.entityType];
    let linkedNetworks = [];
    if (link) {
      const linkResult = await pool.query(
        `SELECT j.*, tn.name AS threat_network_name, tn.category, tn.status
         FROM ${link.jt} j
         JOIN v_threat_network_current tn ON tn.threat_network_id = j.threat_network_id
         WHERE j.${link.fk} = $1 AND j.is_deleted = FALSE
         ORDER BY tn.name`,
        [req.params.id]
      );
      linkedNetworks = linkResult.rows;
    }

    res.json({
      ...result.rows[0],
      linked_threat_networks: linkedNetworks,
    });
  } catch (err) { next(err); }
});


// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/:entityType', async (req, res, next) => {
  const entity = getEntity(req, res);
  if (!entity) return;

  try {
    const { user_id = 1, ...data } = req.body;

    // Build dynamic INSERT from payload keys
    const cols = Object.keys(data).filter(k => !SYSTEM_COLS.includes(k) && k !== entity.pk);
    const vals = cols.map(c => data[c]);
    const placeholders = cols.map((_, i) => `$${i + 1}`);

    const result = await withUser(user_id, async (client) => {
      return client.query(
        `INSERT INTO ${entity.table} (${cols.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`,
        vals
      );
    });

    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:entityType/:id', async (req, res, next) => {
  const entity = getEntity(req, res);
  if (!entity) return;

  try {
    const { user_id = 1, ...data } = req.body;

    const cols = Object.keys(data).filter(k => !SYSTEM_COLS.includes(k) && k !== entity.pk);
    const setClauses = cols.map((c, i) => `${c} = $${i + 1}`);
    setClauses.push(`updated_ts = NOW()`);
    const vals = [...cols.map(c => data[c]), req.params.id];

    const result = await withUser(user_id, async (client) => {
      return client.query(
        `UPDATE ${entity.table}
         SET ${setClauses.join(', ')}
         WHERE ${entity.pk} = $${vals.length} AND is_deleted = FALSE
         RETURNING *`,
        vals
      );
    });

    if (!result.rows.length) return res.status(404).json({ error: `${entity.label} not found` });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── SOFT DELETE ───────────────────────────────────────────────────────────────
router.delete('/:entityType/:id', async (req, res, next) => {
  const entity = getEntity(req, res);
  if (!entity) return;

  try {
    const { user_id = 1 } = req.body;

    const result = await withUser(user_id, async (client) => {
      return client.query(
        `UPDATE ${entity.table}
         SET is_deleted = TRUE, updated_ts = NOW()
         WHERE ${entity.pk} = $1 AND is_deleted = FALSE
         RETURNING ${entity.pk}`,
        [req.params.id]
      );
    });

    if (!result.rows.length) return res.status(404).json({ error: `${entity.label} not found` });
    res.json({ success: true, message: `${entity.label} ${req.params.id} soft-deleted` });
  } catch (err) { next(err); }
});


module.exports = router;
