// ─────────────────────────────────────────────────────────────────────────────
// Junction Table CRUD API Routes
// ─────────────────────────────────────────────────────────────────────────────
// POST   /api/junctions/:type               → create a junction record
// PUT    /api/junctions/:type/:id           → update a junction record
// DELETE /api/junctions/:type/:id           → soft-delete a junction record
// GET    /api/junctions/lookup/:entityType  → get entity list for dropdowns
// ─────────────────────────────────────────────────────────────────────────────

const { Router } = require('express');
const { pool, withUser } = require('../db/pool');

const router = Router();

// Junction table configuration
const JUNCTION_CONFIG = {
  relationships: {
    table: 'threat_network_relationship',
    pk: 'threat_networks_relationship_id',
    fields: ['primary_threat_network_id', 'secondary_threat_network_id', 'relationship_type', 'formal_relationship_ind', 'notes', 'start_date', 'end_date', 'sources'],
  },
  persons: {
    table: 'x_person_interest_threat_network',
    pk: 'person_threat_network_id',
    fields: ['person_interest_id', 'threat_network_id', 'person_threat_network_role', 'person_threat_network_initial_date', 'person_threat_network_notes', 'person_threat_network_status'],
  },
  organizations: {
    table: 'x_organization_interest_threat_network',
    pk: 'organization_threat_network_id',
    fields: ['organization_interest_id', 'threat_network_id', 'organization_threat_network_function', 'organization_threat_network_function_notes', 'organization_threat_network_status', 'organization_threat_network_ofac', 'organization_threat_network_un', 'organization_threat_network_eu_listing', 'organization_threat_network_notes'],
  },
  countries: {
    table: 'x_threat_network_country',
    pk: 'threat_network_country_id',
    fields: ['country_id', 'threat_network_id', 'threat_network_country_status', 'threat_network_country_start', 'threat_network_country_presence_level', 'threat_network_country_presence_notes'],
  },
  boundaries: {
    table: 'x_threat_network_threat_boundary',
    pk: 'threat_network_threat_boundary_id',
    fields: ['threat_network_id', 'threat_boundary_id', 'threat_market_threat_boundary_type', 'threat_market_threat_boundary_initial_detections', 'threat_market_threat_boundary_strategic_value', 'threat_market_threat_boundary_primary_dominance', 'threat_market_threat_boundary_notes'],
  },
  subclasses: {
    table: 'x_threat_network_threat_subclass',
    pk: 'id_jt_tn_im',
    fields: ['threat_network_id', 'threat_subclass_id', 'threat_network_threat_subclass_initial_date', 'threat_network_threat_subclass_geographic_extension', 'threat_network_threat_subclass_value', 'threat_network_threat_subclass_level_segmentation', 'threat_network_threat_subclass_notes'],
  },
  // Phase 5 junction tables
  person_org: {
    table: 'x_person_organization_interest',
    pk: 'person_organization_id',
    fields: ['person_interest_id', 'organization_interest_id', 'person_organization_role', 'person_organization_role_status', 'person_organization_role_notes', 'person_organization_start_day'],
  },
  person_ttp: {
    table: 'x_person_interest_ttp',
    pk: 'person_ttp_id',
    fields: ['person_interest_id', 'ttp_id'],
  },
  person_fi: {
    table: 'x_person_interest_fi',
    pk: 'person_interest_fi_id',
    fields: ['person_interest_id', 'fi_id', 'person_interest_fi_relationship', 'person_interest_fi_status', 'person_interest_fi_initial_date', 'person_interest_fi_end_date', 'person_interest_fi_rela_notes'],
  },
  org_fi: {
    table: 'x_organization_interest_fi',
    pk: 'organization_interest_fi_id',
    fields: ['fi_id', 'organization_interest_id', 'organization_interest_fi_link_type', 'organization_interest_fi_status', 'organization_interest_fi_start_date', 'organization_interest_fi_end_date', 'organization_interest_fi_notes'],
  },
  source_country: {
    table: 'x_source_country',
    pk: 'source_country_id',
    fields: ['source_id', 'country_id', 'source_country_notes'],
  },
  source_fi: {
    table: 'x_source_fi',
    pk: 'source_fi_id',
    fields: ['source_id', 'fi_id', 'source_fi_type_involvement', 'source_fi_notes'],
  },
  source_org: {
    table: 'x_source_organization_interest',
    pk: 'source_oi_id',
    fields: ['source_id', 'organization_interest_id', 'source_organization_function', 'source_organization_notes', 'source_organization_initial_date', 'source_organization_terminal_date'],
  },
  source_person: {
    table: 'x_source_person_interest',
    pk: 'source_pi_id',
    fields: ['source_id', 'person_interest_id', 'source_person_interest_role', 'source_person_interest_notes'],
  },
  source_boundary: {
    table: 'x_source_threat_boundary',
    pk: 'source_threat_boundary_id',
    fields: ['source_id', 'threat_boundary_id', 'source_threat_boundary_notes'],
  },
  source_subclass: {
    table: 'x_source_threat_subclass',
    pk: 'source_im_id',
    fields: ['source_id', 'threat_subclass_id', 'source_im_supply', 'source_im_logistics', 'source_im_markets'],
  },
  subclass_boundary: {
    table: 'x_threat_subclass_threat_boundary',
    pk: 'threat_subclass_threat_boundary_id',
    fields: ['threat_subclass_id', 'threat_boundary_id', 'threat_subclass_threat_boundary_type', 'threat_subclass_threat_boundary_raw_material', 'threat_subclass_threat_boundary_manufacturing', 'threat_subclass_threat_boundary_bulk_shipping', 'threat_subclass_threat_boundary_shipping_notes', 'threat_subclass_threat_boundary_contraband_routes', 'threat_subclass_threat_boundary_contr_notes', 'threat_subclass_threat_boundary_services_types', 'threat_subclass_threat_boundary_services_notes', 'threat_subclass_threat_boundary_primary_market', 'threat_subclass_threat_boundary_market_notes'],
  },
  ttp_record_signal: {
    table: 'htf.x_ttp_records_ttp_signals',
    pk: 'ttp_record_signal_id',
    fields: ['ttp_record_id', 'ttp_signal_id', 'ttp_signal_weight'],
  },
};


// ── ENTITY LOOKUPS (for dropdown population) ─────────────────────────────────
// MUST be defined before /:type routes to avoid param conflict
router.get('/lookup/:entityType', async (req, res, next) => {
  const lookups = {
    threat_networks: {
      query: `SELECT threat_network_id as id, name, acronym, category FROM v_threat_network_current ORDER BY name`,
    },
    persons: {
      query: `SELECT person_interest_id as id, name, alias_primary, status FROM person_interest WHERE is_deleted = FALSE ORDER BY name`,
    },
    organizations: {
      query: `SELECT organization_interest_id as id, name, type, status FROM organization_interest WHERE is_deleted = FALSE ORDER BY name`,
    },
    countries: {
      query: `SELECT country_id as id, name, iso_alpha3 FROM country WHERE is_deleted = FALSE ORDER BY name`,
    },
    boundaries: {
      query: `SELECT threat_boundary_id as id, name, type FROM threat_boundary WHERE is_deleted = FALSE ORDER BY name`,
    },
    subclasses: {
      query: `SELECT threat_subclass_id as id, name, type FROM threat_subclass WHERE is_deleted = FALSE ORDER BY name`,
    },
    sources: {
      query: `SELECT source_id as id, name, type, status FROM source WHERE is_deleted = FALSE ORDER BY name`,
    },
    fi: {
      query: `SELECT fi_id as id, name, type, hq_location FROM financial_institution WHERE is_deleted = FALSE ORDER BY name`,
    },
    ttps: {
      query: `SELECT ttp_id as id, name, complexity_level, scheme FROM htf.ttp WHERE is_active = TRUE ORDER BY name`,
    },
    ttp_signals: {
      query: `SELECT ttp_signal_id as id, ttp_signal_name, ttp_signal_family FROM htf.ttp_signal WHERE is_active = TRUE ORDER BY ttp_signal_name`,
    },
    ttp_records: {
      query: `SELECT ttp_record_id as id, description FROM htf.ttp_record WHERE is_active = TRUE ORDER BY created_ts DESC LIMIT 200`,
    },
  };

  const lookup = lookups[req.params.entityType];
  if (!lookup) return res.status(400).json({ error: `Unknown entity type: ${req.params.entityType}` });

  try {
    const result = await pool.query(lookup.query);
    res.json({ items: result.rows });
  } catch (err) { next(err); }
});


// ── CREATE ───────────────────────────────────────────────────────────────────
router.post('/:type', async (req, res, next) => {
  const config = JUNCTION_CONFIG[req.params.type];
  if (!config) return res.status(400).json({ error: `Unknown junction type: ${req.params.type}` });

  try {
    const { user_id = 1, ...data } = req.body;
    const cols = config.fields.filter(f => data[f] !== undefined);
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
router.put('/:type/:id', async (req, res, next) => {
  const config = JUNCTION_CONFIG[req.params.type];
  if (!config) return res.status(400).json({ error: `Unknown junction type: ${req.params.type}` });

  try {
    const { user_id = 1, ...data } = req.body;
    const cols = config.fields.filter(f => data[f] !== undefined);
    if (!cols.length) return res.status(400).json({ error: 'No fields to update' });

    const setClauses = cols.map((c, i) => `${c} = $${i + 1}`);
    setClauses.push(`updated_ts = NOW()`);
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

    if (!result.rows.length) return res.status(404).json({ error: 'Record not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});


// ── SOFT DELETE ──────────────────────────────────────────────────────────────
router.delete('/:type/:id', async (req, res, next) => {
  const config = JUNCTION_CONFIG[req.params.type];
  if (!config) return res.status(400).json({ error: `Unknown junction type: ${req.params.type}` });

  try {
    const { user_id = 1 } = req.body;
    const result = await withUser(user_id, async (client) => {
      return client.query(
        `UPDATE ${config.table}
         SET is_deleted = TRUE, updated_ts = NOW()
         WHERE ${config.pk} = $1
         RETURNING ${config.pk}`,
        [req.params.id]
      );
    });

    if (!result.rows.length) return res.status(404).json({ error: 'Record not found' });
    res.json({ success: true, deleted_id: result.rows[0][config.pk] });
  } catch (err) { next(err); }
});


module.exports = router;
