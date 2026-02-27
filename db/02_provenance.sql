-- =============================================================================
-- THREAT NETWORK DATABASE — FIELD-LEVEL PROVENANCE EXTENSION
-- =============================================================================
-- Extends the SCD2 + Audit Log architecture with per-field source attribution.
-- Run AFTER threat_network_scd2_audit.sql
-- Target: PostgreSQL 14+
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROVENANCE SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS provenance;
COMMENT ON SCHEMA provenance IS 'Field-level source provenance tracking for all tables.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SOURCE REFERENCE TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- Central registry of all sources (reports, HUMINT, SIGINT, OSINT, etc.)
-- If you already have a source table elsewhere, this can be replaced with a
-- FK reference to that table.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE provenance.source (
    source_id           SERIAL PRIMARY KEY,
    source_type         VARCHAR(100) NOT NULL,     -- e.g., 'OSINT', 'HUMINT', 'SIGINT', 'Report', 'LEA', 'Academic'
    source_name         VARCHAR(500) NOT NULL,     -- human-readable name or title
    source_reference    TEXT,                      -- URL, document ID, cable reference, etc.
    source_publisher    VARCHAR(255),              -- publishing org or agency
    source_date         DATE,                      -- publication or collection date
    source_reliability  VARCHAR(50),               -- NATO Admiralty scale: A-F (source reliability)
    source_credibility  VARCHAR(50),               -- NATO Admiralty scale: 1-6 (information credibility)
    classification      VARCHAR(100),              -- classification/sensitivity level if applicable
    notes               TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_source_type ON provenance.source (source_type);
CREATE INDEX idx_source_name ON provenance.source USING gin (source_name gin_trgm_ops);

-- Enable trigram index for fuzzy source name searching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON TABLE provenance.source IS 'Central registry of all intelligence and reference sources.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FIELD-LEVEL CITATION TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- This is the core provenance table. Each row says:
--   "The value in [field_name] of [record PK] in [table_name]
--    was sourced from [source_id] with [confidence_level] confidence,
--    attributed by [analyst_user_id] on [obtained_date]."
--
-- Multiple rows per (table, record, field) = multiple sources per field.
--
-- Design decisions:
--   • Uses TEXT for table_name, record_pk, and field_name rather than FKs
--     to remain generic across all tables without requiring per-table citation tables.
--   • record_pk stores the natural/business key (threat_network_id for SCD2 tables,
--     the PK for junction tables) so citations persist across SCD2 versions.
--   • Optional version_sk links a citation to a SPECIFIC SCD2 version if needed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE provenance.field_citation (
    field_citation_id       BIGSERIAL PRIMARY KEY,

    -- What field is being cited
    table_name              TEXT NOT NULL,             -- e.g., 'threat_network'
    record_pk               TEXT NOT NULL,             -- natural key value, e.g., '42'
    field_name              TEXT NOT NULL,             -- e.g., 'estimated_membership'

    -- Optional: pin to a specific SCD2 version
    -- NULL = citation applies to the field value across versions (carried forward)
    -- Set = citation applies only to the value in that specific version
    version_sk              BIGINT,

    -- Source attribution
    source_id               INTEGER NOT NULL REFERENCES provenance.source(source_id),
    confidence_level        VARCHAR(20) NOT NULL
                            CHECK (confidence_level IN ('very_high','high','moderate','low','very_low','unverified')),

    -- Analyst attribution
    analyst_user_id         INTEGER NOT NULL,          -- who made this attribution
    obtained_date           DATE NOT NULL,             -- when the source was obtained/reviewed
    attribution_notes       TEXT,                      -- analyst's notes on why this source supports the value

    -- Provenance metadata
    is_primary_source       BOOLEAN NOT NULL DEFAULT FALSE,  -- is this the primary/authoritative source?
    is_current              BOOLEAN NOT NULL DEFAULT TRUE,    -- soft-delete for superseded citations
    superseded_by           BIGINT REFERENCES provenance.field_citation(field_citation_id),
    created_ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core query patterns
CREATE INDEX idx_fc_lookup ON provenance.field_citation (table_name, record_pk, field_name)
    WHERE is_current = TRUE;
CREATE INDEX idx_fc_source ON provenance.field_citation (source_id);
CREATE INDEX idx_fc_analyst ON provenance.field_citation (analyst_user_id);
CREATE INDEX idx_fc_table_field ON provenance.field_citation (table_name, field_name)
    WHERE is_current = TRUE;
CREATE INDEX idx_fc_confidence ON provenance.field_citation (confidence_level)
    WHERE is_current = TRUE;
CREATE INDEX idx_fc_version ON provenance.field_citation (version_sk)
    WHERE version_sk IS NOT NULL;

COMMENT ON TABLE provenance.field_citation IS
    'Field-level source citations. Each row links a specific field value in any table to a source, with confidence, analyst, and date metadata.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. AUDIT TRIGGER ON PROVENANCE TABLES
-- ─────────────────────────────────────────────────────────────────────────────
-- Provenance changes are themselves audited.

CREATE TRIGGER trg_audit_source
    AFTER INSERT OR UPDATE OR DELETE ON provenance.source
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_id');

CREATE TRIGGER trg_audit_field_citation
    AFTER INSERT OR UPDATE OR DELETE ON provenance.field_citation
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('field_citation_id');


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CONVENIENCE VIEWS
-- ─────────────────────────────────────────────────────────────────────────────

-- View: All current citations for a given table, with source details joined in
CREATE OR REPLACE VIEW provenance.v_citations_with_sources AS
SELECT
    fc.field_citation_id,
    fc.table_name,
    fc.record_pk,
    fc.field_name,
    fc.version_sk,
    fc.confidence_level,
    fc.is_primary_source,
    fc.obtained_date,
    fc.attribution_notes,
    fc.analyst_user_id,
    s.source_type,
    s.source_name,
    s.source_reference,
    s.source_publisher,
    s.source_date,
    s.source_reliability,
    s.source_credibility
FROM provenance.field_citation fc
JOIN provenance.source s ON s.source_id = fc.source_id
WHERE fc.is_current = TRUE
  AND s.is_active = TRUE;

COMMENT ON VIEW provenance.v_citations_with_sources IS
    'Active field citations joined with source details. Primary view for provenance queries.';


-- View: Citation coverage summary — shows which fields have sources and which don't
-- Useful for identifying intelligence gaps
CREATE OR REPLACE VIEW provenance.v_citation_coverage AS
SELECT
    fc.table_name,
    fc.record_pk,
    fc.field_name,
    COUNT(*) AS source_count,
    COUNT(*) FILTER (WHERE fc.is_primary_source) AS primary_source_count,
    MAX(fc.confidence_level) AS highest_confidence,
    MIN(fc.confidence_level) AS lowest_confidence,
    MAX(fc.obtained_date) AS most_recent_source_date,
    ARRAY_AGG(DISTINCT s.source_type ORDER BY s.source_type) AS source_types
FROM provenance.field_citation fc
JOIN provenance.source s ON s.source_id = fc.source_id
WHERE fc.is_current = TRUE
GROUP BY fc.table_name, fc.record_pk, fc.field_name;

COMMENT ON VIEW provenance.v_citation_coverage IS
    'Aggregated citation coverage per field. Use to identify intelligence gaps.';


-- View: Threat network fields with their current values AND provenance
-- Joins the current SCD2 row with all active citations
CREATE OR REPLACE VIEW provenance.v_threat_network_provenance AS
SELECT
    tn.threat_network_id,
    tn.name AS threat_network_name,
    fc.field_name,
    -- Dynamically pull the current value of the cited field
    (row_to_json(tn)::JSONB)->>fc.field_name AS current_value,
    fc.confidence_level,
    fc.is_primary_source,
    fc.obtained_date,
    fc.attribution_notes,
    fc.analyst_user_id,
    s.source_name,
    s.source_type,
    s.source_reference
FROM threat_network tn
JOIN provenance.field_citation fc
    ON fc.table_name = 'threat_network'
    AND fc.record_pk = tn.threat_network_id::TEXT
    AND fc.is_current = TRUE
JOIN provenance.source s ON s.source_id = fc.source_id AND s.is_active = TRUE
WHERE tn.is_current = TRUE;

COMMENT ON VIEW provenance.v_threat_network_provenance IS
    'Current threat network field values alongside their source citations.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. PROVENANCE MANAGEMENT PROCEDURES
-- ─────────────────────────────────────────────────────────────────────────────

-- Add a citation to a field
CREATE OR REPLACE PROCEDURE provenance.sp_add_citation(
    p_table_name        TEXT,
    p_record_pk         TEXT,
    p_field_name        TEXT,
    p_source_id         INTEGER,
    p_confidence_level  VARCHAR(20),
    p_analyst_user_id   INTEGER,
    p_obtained_date     DATE,
    p_is_primary        BOOLEAN DEFAULT FALSE,
    p_version_sk        BIGINT DEFAULT NULL,
    p_notes             TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_citation_id BIGINT;
BEGIN
    -- If marking as primary, demote any existing primary for this field
    IF p_is_primary THEN
        UPDATE provenance.field_citation
        SET is_primary_source = FALSE,
            updated_ts = NOW()
        WHERE table_name = p_table_name
          AND record_pk = p_record_pk
          AND field_name = p_field_name
          AND is_primary_source = TRUE
          AND is_current = TRUE;
    END IF;

    INSERT INTO provenance.field_citation (
        table_name, record_pk, field_name, version_sk,
        source_id, confidence_level, analyst_user_id, obtained_date,
        is_primary_source, attribution_notes
    )
    VALUES (
        p_table_name, p_record_pk, p_field_name, p_version_sk,
        p_source_id, p_confidence_level, p_analyst_user_id, p_obtained_date,
        p_is_primary, p_notes
    )
    RETURNING field_citation_id INTO v_citation_id;

    RAISE NOTICE 'Added citation % for %.%.%',
        v_citation_id, p_table_name, p_record_pk, p_field_name;
END;
$$;


-- Supersede a citation (soft-replace with a new one)
CREATE OR REPLACE PROCEDURE provenance.sp_supersede_citation(
    p_old_citation_id   BIGINT,
    p_source_id         INTEGER,
    p_confidence_level  VARCHAR(20),
    p_analyst_user_id   INTEGER,
    p_obtained_date     DATE,
    p_is_primary        BOOLEAN DEFAULT FALSE,
    p_notes             TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_rec provenance.field_citation;
    v_new_id BIGINT;
BEGIN
    -- Get the old citation
    SELECT * INTO v_rec
    FROM provenance.field_citation
    WHERE field_citation_id = p_old_citation_id
      AND is_current = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Citation % not found or already superseded', p_old_citation_id;
    END IF;

    -- Insert the replacement
    INSERT INTO provenance.field_citation (
        table_name, record_pk, field_name, version_sk,
        source_id, confidence_level, analyst_user_id, obtained_date,
        is_primary_source, attribution_notes
    )
    VALUES (
        v_rec.table_name, v_rec.record_pk, v_rec.field_name, v_rec.version_sk,
        p_source_id, p_confidence_level, p_analyst_user_id, p_obtained_date,
        p_is_primary, p_notes
    )
    RETURNING field_citation_id INTO v_new_id;

    -- Mark the old one as superseded
    UPDATE provenance.field_citation
    SET is_current = FALSE,
        superseded_by = v_new_id,
        updated_ts = NOW()
    WHERE field_citation_id = p_old_citation_id;

    RAISE NOTICE 'Citation % superseded by %', p_old_citation_id, v_new_id;
END;
$$;


-- Bulk-add citations for multiple fields on the same record from the same source
-- (common workflow: analyst reviews a single report that covers many fields)
CREATE OR REPLACE PROCEDURE provenance.sp_add_bulk_citations(
    p_table_name        TEXT,
    p_record_pk         TEXT,
    p_field_names       TEXT[],            -- array of field names
    p_source_id         INTEGER,
    p_confidence_level  VARCHAR(20),
    p_analyst_user_id   INTEGER,
    p_obtained_date     DATE,
    p_notes             TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_field TEXT;
BEGIN
    FOREACH v_field IN ARRAY p_field_names
    LOOP
        CALL provenance.sp_add_citation(
            p_table_name, p_record_pk, v_field,
            p_source_id, p_confidence_level, p_analyst_user_id,
            p_obtained_date, FALSE, NULL, p_notes
        );
    END LOOP;

    RAISE NOTICE 'Added % citations for %.% from source %',
        array_length(p_field_names, 1), p_table_name, p_record_pk, p_source_id;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. INTELLIGENCE GAP ANALYSIS FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns fields on a threat_network record that have NO citations.
-- Critical for identifying where the knowledge base needs strengthening.

CREATE OR REPLACE FUNCTION provenance.fn_uncited_fields(
    p_table_name TEXT,
    p_record_pk  TEXT
)
RETURNS TABLE (field_name TEXT)
LANGUAGE sql STABLE
AS $$
    -- Get all column names for the table
    WITH table_columns AS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = p_table_name
          AND table_schema = 'public'
          -- Exclude system/metadata columns
          AND column_name NOT IN (
              'threat_network_sk','threat_network_id',
              'effective_start_ts','effective_end_ts','is_current',
              'version_number','change_reason',
              'created_ts','updated_ts','user_id',
              'is_deleted','creation_ts','update_ts'
          )
          -- Exclude PK columns (end with _id and are serial)
          AND NOT (column_name LIKE '%_id' AND ordinal_position = 1)
    ),
    cited_fields AS (
        SELECT DISTINCT fc.field_name
        FROM provenance.field_citation fc
        WHERE fc.table_name = p_table_name
          AND fc.record_pk = p_record_pk
          AND fc.is_current = TRUE
    )
    SELECT tc.column_name AS field_name
    FROM table_columns tc
    LEFT JOIN cited_fields cf ON cf.field_name = tc.column_name
    WHERE cf.field_name IS NULL
    ORDER BY tc.column_name;
$$;

COMMENT ON FUNCTION provenance.fn_uncited_fields IS
    'Returns field names that have no active citations for a given record. Use for intelligence gap analysis.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. CITATION INTEGRITY CHECK
-- ─────────────────────────────────────────────────────────────────────────────
-- Validates that cited field names actually exist on the target table.
-- Run periodically to catch stale citations after schema changes.

CREATE OR REPLACE FUNCTION provenance.fn_validate_citations()
RETURNS TABLE (
    field_citation_id   BIGINT,
    table_name          TEXT,
    field_name          TEXT,
    issue               TEXT
)
LANGUAGE sql STABLE
AS $$
    -- Find citations referencing columns that don't exist
    SELECT
        fc.field_citation_id,
        fc.table_name,
        fc.field_name,
        'Field does not exist in table' AS issue
    FROM provenance.field_citation fc
    WHERE fc.is_current = TRUE
      AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns c
          WHERE c.table_name = fc.table_name
            AND c.column_name = fc.field_name
            AND c.table_schema = 'public'
      )

    UNION ALL

    -- Find citations referencing inactive sources
    SELECT
        fc.field_citation_id,
        fc.table_name,
        fc.field_name,
        'Source is inactive (source_id=' || fc.source_id || ')' AS issue
    FROM provenance.field_citation fc
    JOIN provenance.source s ON s.source_id = fc.source_id
    WHERE fc.is_current = TRUE
      AND s.is_active = FALSE

    ORDER BY table_name, field_name;
$$;

COMMENT ON FUNCTION provenance.fn_validate_citations IS
    'Validates citation integrity. Returns any citations pointing to non-existent fields or inactive sources.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. FIELD METADATA REGISTRY (OPTIONAL BUT RECOMMENDED)
-- ─────────────────────────────────────────────────────────────────────────────
-- Provides a lookup of all citable fields with descriptions.
-- Useful for building UI dropdowns and validating citations at insert time.

CREATE TABLE provenance.field_registry (
    field_registry_id   SERIAL PRIMARY KEY,
    table_name          TEXT NOT NULL,
    field_name          TEXT NOT NULL,
    display_name        VARCHAR(255),          -- human-friendly label for UI
    description         TEXT,                  -- from the original CSV schema
    is_citable          BOOLEAN NOT NULL DEFAULT TRUE,  -- FALSE for PKs, timestamps, etc.
    UNIQUE (table_name, field_name)
);

-- Seed from the original schema definition (threat_network business columns)
INSERT INTO provenance.field_registry (table_name, field_name, display_name, description) VALUES
('threat_network', 'name', 'Name', 'Threat network common name.'),
('threat_network', 'acronym', 'Acronym', 'Threat network acronym.'),
('threat_network', 'category', 'Category', 'Threat network category.'),
('threat_network', 'subcategory', 'Subcategory', 'Threat network subcategory.'),
('threat_network', 'primary_motivation', 'Primary Motivation', 'Threat network primary existential motivator.'),
('threat_network', 'longevity', 'Longevity', 'Threat network longevity.'),
('threat_network', 'geo_area_operations', 'Geographic Area of Operations', 'Threat network geographic area of operations and physical presence.'),
('threat_network', 'network_type', 'Network Type', 'Threat network (network) type.'),
('threat_network', 'network_configuration', 'Network Configuration', 'Threat network configuration (centralized, decentralized, distributed).'),
('threat_network', 'estimated_membership', 'Estimated Membership', 'Threat network estimated number of members.'),
('threat_network', 'est_membership_notes', 'Membership Notes', 'Threat network membership descriptive notes and source of data.'),
('threat_network', 'est_revenue_annual', 'Estimated Annual Revenue', 'Threat network estimated annual revenues notes and source of data.'),
('threat_network', 'network_notes', 'Network Notes', 'Threat network type and configuration notes and comments.'),
('threat_network', 'hq_location', 'HQ Location', 'Threat network primary HQ location.'),
('threat_network', 'hq_notes', 'HQ Notes', 'Threat network HQ descriptive notes or relevant information.'),
('threat_network', 'demographics', 'Demographics', 'Threat network primary demographic.'),
('threat_network', 'diaspora_operations', 'Diaspora Operations', 'Threat network exploitation of ethnic, national or cultural diasporas.'),
('threat_network', 'commerce_front_control', 'Commerce/Front Control', 'Threat network use of commerce, NGO, NFP, as fronts (1/8 model).'),
('threat_network', 'commerce_notes', 'Commerce Notes', 'Entities used as fronts or in support of logistics.'),
('threat_network', 'fsi_exploitation', 'FSI Exploitation', 'Use of financial services institutions for unlawful activity (1/8 model).'),
('threat_network', 'fsi_notes', 'FSI Notes', 'Overview of type and methods used to exploit FSI.'),
('threat_network', 'fsi_banking', 'FSI: Banking', 'Uses banking services and products?'),
('threat_network', 'fsi_remittance', 'FSI: Remittance', 'Uses remittances (MSB)?'),
('threat_network', 'fsi_currency_exchange', 'FSI: Currency Exchange', 'Uses currency exchanges (MSB)?'),
('threat_network', 'fsi_digital_asset_exchange', 'FSI: Digital Asset Exchange', 'Uses digital asset exchange (MSB)?'),
('threat_network', 'fsi_hawala', 'FSI: Hawala', 'Uses hawala (MSB)?'),
('threat_network', 'fsi_wealth_management', 'FSI: Wealth Management', 'Uses wealth management?'),
('threat_network', 'fsi_p2p', 'FSI: P2P', 'Uses p2p payment platforms?'),
('threat_network', 'fsi_service_loan_association', 'FSI: Service & Loan', 'Uses service and loan associations?'),
('threat_network', 'fsi_credit_unions', 'FSI: Credit Unions', 'Uses credit unions?'),
('threat_network', 'fsi_insurance_company', 'FSI: Insurance', 'Uses insurance companies?'),
('threat_network', 'fsi_mortgage', 'FSI: Mortgage', 'Uses mortgage companies?'),
('threat_network', 'fsi_others', 'FSI: Others', 'Uses other FSIs?'),
('threat_network', 'logistics_control', 'Logistics Control', 'Use of logistics in support of contraband operations (1/8 model).'),
('threat_network', 'logistics_notes', 'Logistics Notes', 'Overview of logistics support.'),
('threat_network', 'professional_services', 'Professional Services', 'Use of professional services (1/8 model).'),
('threat_network', 'professional_serv_notes', 'Professional Services Notes', 'Predominant professional services exploited.'),
('threat_network', 'public_sector_facilitation', 'Public Sector Facilitation', 'Enlisting/forcing public sector servants (1/8 model).'),
('threat_network', 'public_sector_fac_notes', 'Public Sector Notes', 'Predominant type of public sector officials who facilitate.'),
('threat_network', 'political_facilitation', 'Political Facilitation', 'Enlisting/forcing political sector (1/8 model).'),
('threat_network', 'political_notes', 'Political Notes', 'Exploitation of politicians (local, national).'),
('threat_network', 'police_military_facilitation', 'Police/Military Facilitation', 'Enlisting/forcing police or military (1/8 model).'),
('threat_network', 'police_military_notes', 'Police/Military Notes', 'How police/military support unlawful activities.'),
('threat_network', 'social_communal_facilitation', 'Social/Communal Facilitation', 'Investment in community for support/protection/recruiting (1/8 model).'),
('threat_network', 'social_notes', 'Social Notes', 'Social and communal support notes.'),
('threat_network', 'tbml', 'TBML', 'Use of trade based money laundering.'),
('threat_network', 'ml_intensity', 'ML Intensity', 'Level of intensity or reliance on ML.'),
('threat_network', 'violence', 'Violence', 'Propensity to use violence.'),
('threat_network', 'ofac_designation', 'OFAC Designation', 'Placed on OFAC listing.'),
('threat_network', 'fto_designation', 'FTO Designation', 'Designated as foreign terrorist organization.'),
('threat_network', 'status', 'Status', 'Operational status.'),
('threat_network', 'ops_outsourcing', 'Ops Outsourcing', 'Willingness to outsource processes.'),
('threat_network', 'ops_out_notes', 'Outsourcing Notes', 'Historical notes about outsourcing.'),
('threat_network', 'history_notes', 'History Notes', 'General historical notes.'),
('threat_network', 'general_notes', 'General Notes', 'General descriptive information.'),
('threat_network', 'colors', 'Colors', 'Identifying colors.'),

-- Junction table citable fields
('threat_network_relationship', 'relationship_type', 'Relationship Type', 'Alliance, competitor, enemy, friendly.'),
('threat_network_relationship', 'formal_relationship_ind', 'Formal Relationship', 'Indicates if formalized.'),
('threat_network_relationship', 'notes', 'Relationship Notes', 'Notes about the relationship.'),

('x_person_interest_threat_network', 'person_threat_network_role', 'Role', 'Person role within threat network.'),
('x_person_interest_threat_network', 'person_threat_network_status', 'Status', 'Activity status for person with network.'),

('x_threat_network_country', 'threat_network_country_status', 'Country Status', 'Operational status within country.'),
('x_threat_network_country', 'threat_network_country_presence_level', 'Presence Level', 'Territorial control and power level.'),

('x_threat_network_threat_boundary', 'threat_market_threat_boundary_strategic_value', 'Strategic Value', 'Value placed on geography.'),
('x_threat_network_threat_boundary', 'threat_market_threat_boundary_primary_dominance', 'Primary Dominance', 'Primary controller of geography?'),

('x_threat_network_threat_subclass', 'threat_network_threat_subclass_geographic_extension', 'Geographic Extension', 'Level of geographic dominance.'),
('x_threat_network_threat_subclass', 'threat_network_threat_subclass_value', 'Revenue Value', 'Estimated aggregated revenue.'),
('x_threat_network_threat_subclass', 'threat_network_threat_subclass_level_segmentation', 'Level of Segmentation', 'Level of control of threat subclass.');

-- Mark non-citable fields
INSERT INTO provenance.field_registry (table_name, field_name, display_name, is_citable) VALUES
('threat_network', 'emblem_1', 'Emblem 1', FALSE),
('threat_network', 'emblem_2', 'Emblem 2', FALSE),
('threat_network', 'sources', 'Sources (legacy)', FALSE);

COMMENT ON TABLE provenance.field_registry IS
    'Registry of all citable fields across all tables. Drives UI dropdowns and citation validation.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. EXAMPLE USAGE
-- ─────────────────────────────────────────────────────────────────────────────
/*
-- Register a source
INSERT INTO provenance.source (source_type, source_name, source_reference, source_date, source_reliability)
VALUES ('OSINT', 'DEA 2024 National Drug Threat Assessment', 'https://www.dea.gov/ndta2024', '2024-05-15', 'A');
-- Returns source_id = 1

-- Cite a single field
CALL provenance.sp_add_citation(
    'threat_network',       -- table
    '42',                   -- record PK (threat_network_id)
    'estimated_membership', -- field
    1,                      -- source_id
    'high',                 -- confidence
    7,                      -- analyst user_id
    '2025-02-10',           -- obtained date
    TRUE,                   -- is primary source
    NULL,                   -- version_sk (NULL = applies across versions)
    'Page 47, Table 3.2 — membership estimate for 2024'  -- notes
);

-- Bulk-cite many fields from one report
CALL provenance.sp_add_bulk_citations(
    'threat_network',
    '42',
    ARRAY['category','primary_motivation','geo_area_operations','violence','fsi_hawala'],
    1,              -- same source_id
    'moderate',     -- confidence for these fields
    7,              -- analyst
    '2025-02-10',   -- date
    'General characterization from NDTA Ch. 3'
);

-- Find uncited fields (intelligence gaps)
SELECT * FROM provenance.fn_uncited_fields('threat_network', '42');

-- View all citations for a record with source details
SELECT * FROM provenance.v_citations_with_sources
WHERE table_name = 'threat_network' AND record_pk = '42'
ORDER BY field_name, is_primary_source DESC;

-- View current values alongside their provenance
SELECT * FROM provenance.v_threat_network_provenance
WHERE threat_network_id = 42
ORDER BY field_name;

-- Validate citation integrity
SELECT * FROM provenance.fn_validate_citations();
*/
