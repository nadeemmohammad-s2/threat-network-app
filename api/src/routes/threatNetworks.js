// ─────────────────────────────────────────────────────────────────────────────
// Threat Network API Routes
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const { pool, withUser } = require('../db/pool');

const router = Router();

// ── LIST (current state, with filters) ───────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const { category, status, violence, search, limit = 100, offset = 0 } = req.query;
    const conditions = ['TRUE'];
    const params = [];
    let idx = 1;

    if (category) { conditions.push(`category = $${idx++}`); params.push(category); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (violence) { conditions.push(`violence = $${idx++}`); params.push(violence); }
    if (search) {
      conditions.push(`(
        name ILIKE $${idx} OR acronym ILIKE $${idx} OR
        category ILIKE $${idx} OR hq_location ILIKE $${idx}
      )`);
      params.push(`%${search}%`);
      idx++;
    }

    params.push(parseInt(limit), parseInt(offset));

    const sql = `
      SELECT threat_network_id, threat_network_sk, name, acronym, category, subcategory,
             primary_motivation, status, violence, hq_location, geo_area_operations,
             network_type, network_configuration, estimated_membership, version_number,
             effective_start_ts
      FROM v_threat_network_current
      WHERE ${conditions.join(' AND ')}
      ORDER BY name
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM v_threat_network_current
      WHERE ${conditions.join(' AND ')}
    `;

    const [data, count] = await Promise.all([
      pool.query(sql, params),
      pool.query(countSql, params.slice(0, -2)), // without limit/offset
    ]);

    res.json({
      data: data.rows,
      total: parseInt(count.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) { next(err); }
});


// ── GET SINGLE (full detail with all junction data) ──────────────────────────
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Main record
    const main = await pool.query(
      'SELECT * FROM v_threat_network_current WHERE threat_network_id = $1', [id]
    );
    if (!main.rows.length) return res.status(404).json({ error: 'Not found' });

    // All junction queries in parallel
    const [relationships, persons, countries, boundaries, subclasses, organizations, sources] =
      await Promise.all([
        pool.query(`
          SELECT r.*, tn.name as target_name
          FROM threat_network_relationship r
          LEFT JOIN v_threat_network_current tn ON tn.threat_network_id = r.secondary_threat_network_id
          WHERE r.primary_threat_network_id = $1 AND r.is_deleted = FALSE
          ORDER BY r.relationship_type, r.start_date
        `, [id]),
        pool.query(`
          SELECT p.*, pi.name as person_name, pi.alias_primary as person_alias
          FROM x_person_interest_threat_network p
          LEFT JOIN person_interest pi ON pi.person_interest_id = p.person_interest_id
          WHERE p.threat_network_id = $1 AND p.is_deleted = FALSE
          ORDER BY p.person_threat_network_status, p.person_threat_network_role
        `, [id]),
        pool.query(`
          SELECT c.*, co.name as country_name, co.iso_alpha3
          FROM x_threat_network_country c
          LEFT JOIN country co ON co.country_id = c.country_id
          WHERE c.threat_network_id = $1 AND c.is_deleted = FALSE
          ORDER BY c.threat_network_country_presence_level DESC, c.threat_network_country_status
        `, [id]),
        pool.query(`
          SELECT b.*, tb.name as boundary_name, tb.type as boundary_type
          FROM x_threat_network_threat_boundary b
          LEFT JOIN threat_boundary tb ON tb.threat_boundary_id = b.threat_boundary_id
          WHERE b.threat_network_id = $1 AND b.is_deleted = FALSE
          ORDER BY b.threat_market_threat_boundary_strategic_value DESC
        `, [id]),
        pool.query(`
          SELECT s.*, ts.name as subclass_name, ts.type as subclass_type
          FROM x_threat_network_threat_subclass s
          LEFT JOIN threat_subclass ts ON ts.threat_subclass_id = s.threat_subclass_id
          WHERE s.threat_network_id = $1 AND s.is_deleted = FALSE
        `, [id]),
        pool.query(`
          SELECT o.*, oi.name as org_name, oi.type as org_type
          FROM x_organization_interest_threat_network o
          LEFT JOIN organization_interest oi ON oi.organization_interest_id = o.organization_interest_id
          WHERE o.threat_network_id = $1 AND o.is_deleted = FALSE
          ORDER BY o.organization_threat_network_status
        `, [id]),
        pool.query(`
          SELECT xst.*, ps.source_name, ps.source_type
          FROM x_source_threat_network xst
          LEFT JOIN provenance.citation_source ps ON ps.source_id = xst.source_id
          WHERE xst.threat_network_id = $1 AND xst.is_deleted = FALSE
        `, [id]),
      ]);

    res.json({
      ...main.rows[0],
      relationships: relationships.rows,
      persons: persons.rows,
      countries: countries.rows,
      threat_boundaries: boundaries.rows,
      threat_subclasses: subclasses.rows,
      organizations: organizations.rows,
      linked_sources: sources.rows,
    });
  } catch (err) { next(err); }
});


// ── UPDATE (SCD2 upsert) ────────────────────────────────────────────────────
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { change_reason, user_id = 1, ...data } = req.body;

    await withUser(user_id, async (client) => {
      await client.query(
        'CALL sp_threat_network_upsert($1, $2, $3, $4)',
        [parseInt(id), change_reason || 'Update via API', user_id, JSON.stringify(data)]
      );
    });

    // Return the new current version
    const result = await pool.query(
      'SELECT * FROM v_threat_network_current WHERE threat_network_id = $1', [id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── SOFT DELETE ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Deleted via API', user_id = 1 } = req.body;

    await withUser(user_id, async (client) => {
      await client.query(
        'CALL sp_threat_network_soft_delete($1, $2, $3)',
        [parseInt(id), reason, user_id]
      );
    });

    res.json({ success: true, message: `Threat network ${id} soft-deleted` });
  } catch (err) { next(err); }
});


// ── ROLLBACK to a specific version ───────────────────────────────────────────
router.post('/:id/rollback', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { restore_to_sk, reason, user_id = 1 } = req.body;

    if (!restore_to_sk) return res.status(400).json({ error: 'restore_to_sk required' });

    await withUser(user_id, async (client) => {
      await client.query(
        'CALL sp_threat_network_rollback($1, $2, $3, $4)',
        [parseInt(id), parseInt(restore_to_sk), reason || 'Rollback via API', user_id]
      );
    });

    const result = await pool.query(
      'SELECT * FROM v_threat_network_current WHERE threat_network_id = $1', [id]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── VERSION HISTORY ──────────────────────────────────────────────────────────
router.get('/:id/history', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM audit.v_threat_network_history
       WHERE threat_network_id = $1
       ORDER BY version_number DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});


// ── COMPARE TWO VERSIONS ────────────────────────────────────────────────────
router.get('/:id/compare', async (req, res, next) => {
  try {
    const { sk_old, sk_new } = req.query;
    if (!sk_old || !sk_new) return res.status(400).json({ error: 'sk_old and sk_new required' });

    const result = await pool.query(
      'SELECT * FROM audit.fn_compare_versions($1, $2)',
      [parseInt(sk_old), parseInt(sk_new)]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});


// ── POINT-IN-TIME ────────────────────────────────────────────────────────────
router.get('/as-of/:timestamp', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fn_threat_network_as_of($1)',
      [req.params.timestamp]
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});


module.exports = router;
