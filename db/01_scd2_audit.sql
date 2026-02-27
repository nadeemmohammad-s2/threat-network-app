-- =============================================================================
-- THREAT NETWORK DATABASE — SCD TYPE 2 + AUDIT LOG HYBRID
-- =============================================================================
-- Target: PostgreSQL 14+
-- Pattern: SCD2 on core entity (threat_network) for point-in-time analysis
--          Audit log on all tables for compliance, accountability, rollback
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. EXTENSIONS & SCHEMA SETUP
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "hstore";       -- for compact change tracking

CREATE SCHEMA IF NOT EXISTS audit;
COMMENT ON SCHEMA audit IS 'Audit trail tables and functions for compliance and rollback';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SCD TYPE 2 — THREAT_NETWORK (core analytical entity)
-- ─────────────────────────────────────────────────────────────────────────────
-- Design decisions:
--   • threat_network_sk (surrogate key) = unique per VERSION of the record
--   • threat_network_id (natural key)   = stable business identifier across versions
--   • effective_start_ts / effective_end_ts = version validity window
--   • is_current = convenience flag for simple queries
--   • All FK references from junction tables point to threat_network_id (natural key)
--     so they always resolve to the current record via views
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE threat_network (
    -- SCD2 versioning columns
    threat_network_sk           BIGSERIAL PRIMARY KEY,
    threat_network_id           SERIAL NOT NULL,          -- natural/business key
    effective_start_ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_end_ts            TIMESTAMPTZ,              -- NULL = current version
    is_current                  BOOLEAN NOT NULL DEFAULT TRUE,
    version_number              INTEGER NOT NULL DEFAULT 1,
    change_reason               TEXT,                     -- why was this version created?

    -- original business columns
    name                        VARCHAR(255) NOT NULL,
    acronym                     VARCHAR(255),
    category                    VARCHAR(255) NOT NULL,
    subcategory                 VARCHAR(255) NOT NULL,
    primary_motivation          VARCHAR(255) NOT NULL,
    longevity                   VARCHAR(255),
    geo_area_operations         VARCHAR(255) NOT NULL,
    network_type                VARCHAR(255) NOT NULL,
    network_configuration       VARCHAR(255),
    estimated_membership        VARCHAR(255),
    est_membership_notes        TEXT,
    est_revenue_annual          VARCHAR(255),
    network_notes               TEXT,
    hq_location                 VARCHAR(255),
    hq_notes                    TEXT,
    demographics                VARCHAR(255),
    diaspora_operations         VARCHAR(255),

    -- 8/8 model columns
    commerce_front_control      VARCHAR(255),
    commerce_notes              TEXT,
    fsi_exploitation            VARCHAR(255),
    fsi_notes                   TEXT,
    fsi_banking                 BOOLEAN,
    fsi_remittance              BOOLEAN,
    fsi_currency_exchange       BOOLEAN,
    fsi_digital_asset_exchange  BOOLEAN,
    fsi_hawala                  BOOLEAN,
    fsi_wealth_management       BOOLEAN,
    fsi_p2p                     BOOLEAN,
    fsi_service_loan_association BOOLEAN,
    fsi_credit_unions           BOOLEAN,
    fsi_insurance_company       BOOLEAN,
    fsi_mortgage                BOOLEAN,
    fsi_others                  BOOLEAN,
    logistics_control           VARCHAR(255),
    logistics_notes             TEXT,
    professional_services       VARCHAR(255),
    professional_serv_notes     TEXT,
    public_sector_facilitation  VARCHAR(255),
    public_sector_fac_notes     TEXT,
    political_facilitation      VARCHAR(255),
    political_notes             TEXT,
    police_military_facilitation VARCHAR(255),
    police_military_notes       TEXT,
    social_communal_facilitation VARCHAR(255),
    social_notes                TEXT,

    -- operational classification
    tbml                        VARCHAR(255),
    ml_intensity                VARCHAR(255),
    violence                    VARCHAR(255),
    ofac_designation            VARCHAR(255),
    fto_designation             VARCHAR(255),
    status                      VARCHAR(255),
    ops_outsourcing             VARCHAR(255),
    ops_out_notes               TEXT,

    -- descriptive / reference
    history_notes               TEXT,
    general_notes               TEXT,
    emblem_1                    TEXT,
    emblem_2                    TEXT,
    colors                      VARCHAR(255),
    sources                     TEXT NOT NULL,

    -- metadata
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id                     INTEGER
);

-- Indexes for SCD2 query patterns
CREATE INDEX idx_tn_natural_key ON threat_network (threat_network_id);
CREATE INDEX idx_tn_current ON threat_network (threat_network_id) WHERE is_current = TRUE;
CREATE INDEX idx_tn_effective_range ON threat_network (threat_network_id, effective_start_ts, effective_end_ts);
CREATE UNIQUE INDEX idx_tn_one_current ON threat_network (threat_network_id) WHERE is_current = TRUE;

COMMENT ON TABLE threat_network IS 'SCD Type 2 versioned threat network entity. Use v_threat_network_current for operational queries.';
COMMENT ON COLUMN threat_network.threat_network_sk IS 'Surrogate key — unique per version of the record';
COMMENT ON COLUMN threat_network.threat_network_id IS 'Natural/business key — stable across all versions';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CONVENIENCE VIEW — CURRENT STATE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW v_threat_network_current AS
SELECT *
FROM threat_network
WHERE is_current = TRUE;

COMMENT ON VIEW v_threat_network_current IS 'Current-state view of threat networks. Use this for all operational queries.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. POINT-IN-TIME QUERY FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_threat_network_as_of(p_as_of TIMESTAMPTZ)
RETURNS SETOF threat_network
LANGUAGE sql STABLE
AS $$
    SELECT *
    FROM threat_network
    WHERE p_as_of >= effective_start_ts
      AND (effective_end_ts IS NULL OR p_as_of < effective_end_ts);
$$;

COMMENT ON FUNCTION fn_threat_network_as_of IS 'Returns the version of every threat network that was active at the given timestamp.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SCD2 UPSERT PROCEDURE
-- ─────────────────────────────────────────────────────────────────────────────
-- Call this instead of raw INSERT/UPDATE to maintain SCD2 integrity.
-- It closes the current version and inserts a new one.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE PROCEDURE sp_threat_network_upsert(
    p_threat_network_id INTEGER,
    p_change_reason     TEXT,
    p_user_id           INTEGER,
    -- Pass all business columns as a JSONB payload for flexibility
    p_data              JSONB
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_version INTEGER;
    v_new_sk          BIGINT;
BEGIN
    -- Close the current version
    UPDATE threat_network
    SET effective_end_ts = NOW(),
        is_current = FALSE,
        updated_ts = NOW()
    WHERE threat_network_id = p_threat_network_id
      AND is_current = TRUE
    RETURNING version_number INTO v_current_version;

    -- If no current version found, this is a new record
    IF v_current_version IS NULL THEN
        v_current_version := 0;
    END IF;

    -- Insert new version (using JSONB fields with COALESCE for defaults)
    INSERT INTO threat_network (
        threat_network_id, version_number, change_reason, user_id,
        effective_start_ts, effective_end_ts, is_current,
        name, acronym, category, subcategory, primary_motivation,
        longevity, geo_area_operations, network_type, network_configuration,
        estimated_membership, est_membership_notes, est_revenue_annual,
        network_notes, hq_location, hq_notes, demographics, diaspora_operations,
        commerce_front_control, commerce_notes, fsi_exploitation, fsi_notes,
        fsi_banking, fsi_remittance, fsi_currency_exchange, fsi_digital_asset_exchange,
        fsi_hawala, fsi_wealth_management, fsi_p2p, fsi_service_loan_association,
        fsi_credit_unions, fsi_insurance_company, fsi_mortgage, fsi_others,
        logistics_control, logistics_notes, professional_services, professional_serv_notes,
        public_sector_facilitation, public_sector_fac_notes, political_facilitation,
        political_notes, police_military_facilitation, police_military_notes,
        social_communal_facilitation, social_notes, tbml, ml_intensity,
        violence, ofac_designation, fto_designation, status,
        ops_outsourcing, ops_out_notes, history_notes, general_notes,
        emblem_1, emblem_2, colors, sources
    )
    VALUES (
        p_threat_network_id,
        v_current_version + 1,
        p_change_reason,
        p_user_id,
        NOW(), NULL, TRUE,
        p_data->>'name',
        p_data->>'acronym',
        p_data->>'category',
        p_data->>'subcategory',
        p_data->>'primary_motivation',
        p_data->>'longevity',
        p_data->>'geo_area_operations',
        p_data->>'network_type',
        p_data->>'network_configuration',
        p_data->>'estimated_membership',
        p_data->>'est_membership_notes',
        p_data->>'est_revenue_annual',
        p_data->>'network_notes',
        p_data->>'hq_location',
        p_data->>'hq_notes',
        p_data->>'demographics',
        p_data->>'diaspora_operations',
        p_data->>'commerce_front_control',
        p_data->>'commerce_notes',
        p_data->>'fsi_exploitation',
        p_data->>'fsi_notes',
        (p_data->>'fsi_banking')::BOOLEAN,
        (p_data->>'fsi_remittance')::BOOLEAN,
        (p_data->>'fsi_currency_exchange')::BOOLEAN,
        (p_data->>'fsi_digital_asset_exchange')::BOOLEAN,
        (p_data->>'fsi_hawala')::BOOLEAN,
        (p_data->>'fsi_wealth_management')::BOOLEAN,
        (p_data->>'fsi_p2p')::BOOLEAN,
        (p_data->>'fsi_service_loan_association')::BOOLEAN,
        (p_data->>'fsi_credit_unions')::BOOLEAN,
        (p_data->>'fsi_insurance_company')::BOOLEAN,
        (p_data->>'fsi_mortgage')::BOOLEAN,
        (p_data->>'fsi_others')::BOOLEAN,
        p_data->>'logistics_control',
        p_data->>'logistics_notes',
        p_data->>'professional_services',
        p_data->>'professional_serv_notes',
        p_data->>'public_sector_facilitation',
        p_data->>'public_sector_fac_notes',
        p_data->>'political_facilitation',
        p_data->>'political_notes',
        p_data->>'police_military_facilitation',
        p_data->>'police_military_notes',
        p_data->>'social_communal_facilitation',
        p_data->>'social_notes',
        p_data->>'tbml',
        p_data->>'ml_intensity',
        p_data->>'violence',
        p_data->>'ofac_designation',
        p_data->>'fto_designation',
        p_data->>'status',
        p_data->>'ops_outsourcing',
        p_data->>'ops_out_notes',
        p_data->>'history_notes',
        p_data->>'general_notes',
        p_data->>'emblem_1',
        p_data->>'emblem_2',
        p_data->>'colors',
        p_data->>'sources'
    )
    RETURNING threat_network_sk INTO v_new_sk;

    RAISE NOTICE 'Created version % for threat_network_id %, sk = %',
        v_current_version + 1, p_threat_network_id, v_new_sk;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SOFT DELETE PROCEDURE
-- ─────────────────────────────────────────────────────────────────────────────
-- Rather than physically deleting, we close the current version with no successor.
-- The record becomes invisible through v_threat_network_current but fully recoverable.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE PROCEDURE sp_threat_network_soft_delete(
    p_threat_network_id INTEGER,
    p_reason            TEXT,
    p_user_id           INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE threat_network
    SET effective_end_ts = NOW(),
        is_current = FALSE,
        change_reason = COALESCE(change_reason, '') || ' [SOFT DELETED: ' || p_reason || ']',
        updated_ts = NOW(),
        user_id = p_user_id
    WHERE threat_network_id = p_threat_network_id
      AND is_current = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No current version found for threat_network_id %', p_threat_network_id;
    END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ROLLBACK / RESTORE PROCEDURE
-- ─────────────────────────────────────────────────────────────────────────────
-- Restores a specific historical version by creating a NEW version with the
-- old data. This preserves the full audit trail (no rewriting history).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE PROCEDURE sp_threat_network_rollback(
    p_threat_network_id INTEGER,
    p_restore_to_sk     BIGINT,      -- which historical version to restore
    p_reason            TEXT,
    p_user_id           INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_old_data JSONB;
BEGIN
    -- Grab the historical version as JSONB
    SELECT to_jsonb(t) - '{threat_network_sk,effective_start_ts,effective_end_ts,is_current,version_number,change_reason,created_ts,updated_ts,user_id}'::text[]
    INTO v_old_data
    FROM threat_network t
    WHERE threat_network_sk = p_restore_to_sk
      AND threat_network_id = p_threat_network_id;

    IF v_old_data IS NULL THEN
        RAISE EXCEPTION 'Version sk=% not found for threat_network_id %', p_restore_to_sk, p_threat_network_id;
    END IF;

    -- Use the standard upsert to close current + create new version
    CALL sp_threat_network_upsert(
        p_threat_network_id,
        'ROLLBACK to sk=' || p_restore_to_sk || ': ' || p_reason,
        p_user_id,
        v_old_data
    );
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. JUNCTION / RELATIONSHIP TABLES (unchanged from original, with timestamps)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE threat_network_relationship (
    threat_networks_relationship_id SERIAL PRIMARY KEY,
    primary_threat_network_id       INTEGER NOT NULL,
    secondary_threat_network_id     INTEGER NOT NULL,
    formal_relationship_ind         BOOLEAN,
    relationship_type               VARCHAR(255),
    notes                           TEXT,
    start_date                      DATE,
    end_date                        DATE,
    sources                         TEXT,
    is_deleted                      BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE x_organization_interest_threat_network (
    organization_threat_network_id              SERIAL PRIMARY KEY,
    organization_interest_id                    INTEGER NOT NULL,
    threat_network_id                           INTEGER NOT NULL,
    organization_threat_network_function        VARCHAR(255),
    organization_threat_network_function_notes  TEXT,
    organization_threat_network_status          VARCHAR(255),
    organization_threat_network_ofac            VARCHAR(255),
    organization_threat_network_un              VARCHAR(255),
    organization_threat_network_eu_listing      VARCHAR(255),
    organization_threat_network_notes           TEXT,
    is_deleted                                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE x_person_interest_threat_network (
    person_threat_network_id            SERIAL PRIMARY KEY,
    person_interest_id                  INTEGER NOT NULL,
    threat_network_id                   INTEGER NOT NULL,
    person_threat_network_role          VARCHAR(255),
    person_threat_network_initial_date  VARCHAR(255),
    person_threat_network_notes         TEXT,
    person_threat_network_status        VARCHAR(255),
    is_deleted                          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE x_source_threat_network (
    source_threat_network_id    SERIAL PRIMARY KEY,
    source_id                   INTEGER NOT NULL,
    threat_network_id           INTEGER NOT NULL,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE x_threat_network_country (
    threat_network_country_id               SERIAL PRIMARY KEY,
    country_id                              INTEGER NOT NULL,
    threat_network_id                       INTEGER NOT NULL,
    threat_network_country_status           VARCHAR(255),
    threat_network_country_start            VARCHAR(255),
    threat_network_country_presence_level   VARCHAR(255),
    threat_network_country_presence_notes   TEXT,
    is_deleted                              BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE x_threat_network_threat_boundary (
    threat_network_threat_boundary_id                   SERIAL PRIMARY KEY,
    threat_network_id                                   INTEGER NOT NULL,
    threat_boundary_id                                  INTEGER NOT NULL,
    threat_market_threat_boundary_type                  VARCHAR(255),
    threat_market_threat_boundary_initial_detections    VARCHAR(255),
    threat_market_threat_boundary_strategic_value       VARCHAR(255),
    threat_market_threat_boundary_primary_dominance     VARCHAR(255),
    threat_market_threat_boundary_notes                 TEXT,
    is_deleted                                          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE x_threat_network_threat_subclass (
    id_jt_tn_im                                         SERIAL PRIMARY KEY,
    threat_network_id                                   INTEGER NOT NULL,
    threat_subclass_id                                  INTEGER NOT NULL,
    threat_network_threat_subclass_initial_date         VARCHAR(255),
    threat_network_threat_subclass_geographic_extension VARCHAR(255),
    threat_network_threat_subclass_value                VARCHAR(255),
    threat_network_threat_subclass_level_segmentation   VARCHAR(255),
    threat_network_threat_subclass_notes                TEXT,
    is_deleted                                          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. GENERIC AUDIT LOG TABLE
-- ─────────────────────────────────────────────────────────────────────────────
-- One audit table for ALL tables. Uses JSONB to store old/new values.
-- This is the compliance and rollback backbone for junction tables.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE audit.change_log (
    change_log_id       BIGSERIAL PRIMARY KEY,
    table_name          TEXT NOT NULL,
    record_pk           TEXT NOT NULL,          -- serialized PK value(s)
    operation           TEXT NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
    old_values          JSONB,                  -- NULL for INSERT
    new_values          JSONB,                  -- NULL for DELETE
    changed_fields      TEXT[],                 -- which columns changed (UPDATE only)
    changed_by          INTEGER,                -- user_id
    changed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason       TEXT,
    session_info        JSONB                   -- optional: app context, IP, etc.
);

CREATE INDEX idx_audit_table_pk ON audit.change_log (table_name, record_pk);
CREATE INDEX idx_audit_changed_at ON audit.change_log (changed_at);
CREATE INDEX idx_audit_changed_by ON audit.change_log (changed_by);
CREATE INDEX idx_audit_table_time ON audit.change_log (table_name, changed_at);

COMMENT ON TABLE audit.change_log IS 'Universal audit log capturing every INSERT, UPDATE, DELETE across all tracked tables.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 9. GENERIC AUDIT TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────
-- Attach this to any table to automatically log changes.
-- Uses hstore diff to identify exactly which columns changed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit.fn_log_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_json  JSONB;
    v_new_json  JSONB;
    v_pk_val    TEXT;
    v_changed   TEXT[];
    v_key       TEXT;
    v_user_id   INTEGER;
BEGIN
    -- Try to extract user_id from the record if it exists
    BEGIN
        IF TG_OP = 'DELETE' THEN
            v_user_id := (row_to_json(OLD)::JSONB->>'user_id')::INTEGER;
        ELSE
            v_user_id := (row_to_json(NEW)::JSONB->>'user_id')::INTEGER;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    -- Try to get session-level user_id if not on the record
    IF v_user_id IS NULL THEN
        BEGIN
            v_user_id := current_setting('app.current_user_id', TRUE)::INTEGER;
        EXCEPTION WHEN OTHERS THEN
            v_user_id := NULL;
        END;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_new_json := row_to_json(NEW)::JSONB;
        v_pk_val := v_new_json->>TG_ARGV[0];  -- PK column name passed as trigger arg

        INSERT INTO audit.change_log (table_name, record_pk, operation, new_values, changed_by)
        VALUES (TG_TABLE_NAME, v_pk_val, 'INSERT', v_new_json, v_user_id);

        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        v_old_json := row_to_json(OLD)::JSONB;
        v_new_json := row_to_json(NEW)::JSONB;
        v_pk_val := v_new_json->>TG_ARGV[0];

        -- Find changed fields
        v_changed := ARRAY[]::TEXT[];
        FOR v_key IN SELECT jsonb_object_keys(v_new_json)
        LOOP
            IF v_old_json->v_key IS DISTINCT FROM v_new_json->v_key THEN
                v_changed := v_changed || v_key;
            END IF;
        END LOOP;

        -- Only log if something actually changed
        IF array_length(v_changed, 1) > 0 THEN
            INSERT INTO audit.change_log (table_name, record_pk, operation, old_values, new_values, changed_fields, changed_by)
            VALUES (TG_TABLE_NAME, v_pk_val, 'UPDATE', v_old_json, v_new_json, v_changed, v_user_id);
        END IF;

        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        v_old_json := row_to_json(OLD)::JSONB;
        v_pk_val := v_old_json->>TG_ARGV[0];

        INSERT INTO audit.change_log (table_name, record_pk, operation, old_values, changed_by)
        VALUES (TG_TABLE_NAME, v_pk_val, 'DELETE', v_old_json, v_user_id);

        RETURN OLD;
    END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 10. ATTACH AUDIT TRIGGERS TO ALL TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Core entity (SCD2 table — audit captures the versioning operations too)
CREATE TRIGGER trg_audit_threat_network
    AFTER INSERT OR UPDATE OR DELETE ON threat_network
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('threat_network_sk');

-- Junction / relationship tables
CREATE TRIGGER trg_audit_tn_relationship
    AFTER INSERT OR UPDATE OR DELETE ON threat_network_relationship
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('threat_networks_relationship_id');

CREATE TRIGGER trg_audit_x_org_tn
    AFTER INSERT OR UPDATE OR DELETE ON x_organization_interest_threat_network
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('organization_threat_network_id');

CREATE TRIGGER trg_audit_x_person_tn
    AFTER INSERT OR UPDATE OR DELETE ON x_person_interest_threat_network
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('person_threat_network_id');

CREATE TRIGGER trg_audit_x_source_tn
    AFTER INSERT OR UPDATE OR DELETE ON x_source_threat_network
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_threat_network_id');

CREATE TRIGGER trg_audit_x_tn_country
    AFTER INSERT OR UPDATE OR DELETE ON x_threat_network_country
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('threat_network_country_id');

CREATE TRIGGER trg_audit_x_tn_boundary
    AFTER INSERT OR UPDATE OR DELETE ON x_threat_network_threat_boundary
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('threat_network_threat_boundary_id');

CREATE TRIGGER trg_audit_x_tn_subclass
    AFTER INSERT OR UPDATE OR DELETE ON x_threat_network_threat_subclass
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('id_jt_tn_im');


-- ─────────────────────────────────────────────────────────────────────────────
-- 11. AUDIT QUERY HELPERS
-- ─────────────────────────────────────────────────────────────────────────────

-- View: full change history for a specific threat network
CREATE OR REPLACE VIEW audit.v_threat_network_history AS
SELECT
    tn.threat_network_id,
    tn.threat_network_sk,
    tn.version_number,
    tn.name,
    tn.category,
    tn.status,
    tn.change_reason,
    tn.effective_start_ts,
    tn.effective_end_ts,
    tn.is_current,
    tn.user_id AS modified_by,
    CASE
        WHEN tn.effective_end_ts IS NULL THEN 'CURRENT'
        WHEN tn.change_reason LIKE '%SOFT DELETED%' THEN 'DELETED'
        ELSE 'SUPERSEDED'
    END AS version_status
FROM threat_network tn
ORDER BY tn.threat_network_id, tn.version_number;

COMMENT ON VIEW audit.v_threat_network_history IS 'Human-readable version history of all threat networks.';


-- Function: get the audit trail for any table/record
CREATE OR REPLACE FUNCTION audit.fn_get_record_history(
    p_table_name TEXT,
    p_record_pk  TEXT
)
RETURNS TABLE (
    change_log_id   BIGINT,
    operation       TEXT,
    changed_fields  TEXT[],
    old_values      JSONB,
    new_values      JSONB,
    changed_by      INTEGER,
    changed_at      TIMESTAMPTZ
)
LANGUAGE sql STABLE
AS $$
    SELECT change_log_id, operation, changed_fields, old_values, new_values, changed_by, changed_at
    FROM audit.change_log
    WHERE table_name = p_table_name
      AND record_pk = p_record_pk
    ORDER BY changed_at;
$$;


-- Function: compare two versions of a threat network side-by-side
CREATE OR REPLACE FUNCTION audit.fn_compare_versions(
    p_sk_old BIGINT,
    p_sk_new BIGINT
)
RETURNS TABLE (
    field_name  TEXT,
    old_value   TEXT,
    new_value   TEXT
)
LANGUAGE sql STABLE
AS $$
    WITH old_rec AS (
        SELECT to_jsonb(t) AS j FROM threat_network t WHERE threat_network_sk = p_sk_old
    ),
    new_rec AS (
        SELECT to_jsonb(t) AS j FROM threat_network t WHERE threat_network_sk = p_sk_new
    )
    SELECT
        k AS field_name,
        old_rec.j->>k AS old_value,
        new_rec.j->>k AS new_value
    FROM old_rec, new_rec,
         LATERAL jsonb_object_keys(new_rec.j) AS k
    WHERE old_rec.j->k IS DISTINCT FROM new_rec.j->k
      AND k NOT IN ('threat_network_sk','effective_start_ts','effective_end_ts',
                     'is_current','version_number','change_reason','created_ts','updated_ts','user_id')
    ORDER BY k;
$$;

COMMENT ON FUNCTION audit.fn_compare_versions IS 'Shows field-level diff between two SCD2 versions of a threat network.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 12. AUDIT LOG RETENTION MANAGEMENT
-- ─────────────────────────────────────────────────────────────────────────────

-- Partition strategy hint (implement when data volume warrants it):
-- ALTER TABLE audit.change_log RENAME TO change_log_old;
-- CREATE TABLE audit.change_log (...) PARTITION BY RANGE (changed_at);
-- CREATE TABLE audit.change_log_2025 PARTITION OF audit.change_log
--     FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Archive procedure for compliance retention
CREATE OR REPLACE PROCEDURE audit.sp_archive_old_entries(
    p_older_than INTERVAL DEFAULT '7 years'
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- In production, INSERT INTO audit.change_log_archive SELECT ... first
    DELETE FROM audit.change_log
    WHERE changed_at < NOW() - p_older_than;

    RAISE NOTICE 'Archived audit entries older than %', p_older_than;
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 13. APPLICATION HELPER: SET SESSION USER
-- ─────────────────────────────────────────────────────────────────────────────
-- Call this at the start of each application transaction so the audit
-- trigger can capture who is making changes.
-- ─────────────────────────────────────────────────────────────────────────────

-- Usage from application code:
--   SELECT set_config('app.current_user_id', '42', TRUE);  -- TRUE = local to transaction
--   UPDATE x_person_interest_threat_network SET ... ;
--   COMMIT;

-- Example wrapper:
CREATE OR REPLACE FUNCTION fn_set_app_user(p_user_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
END;
$$;
