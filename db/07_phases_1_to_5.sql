-- =============================================================================
-- THREAT NETWORK DATABASE — PHASES 1-5 BUILD COMPLETION
-- =============================================================================
-- Run AFTER 06_htf_reference_tables.sql
-- Target: PostgreSQL 14+
-- =============================================================================

SELECT set_config('app.current_user_id', '1', FALSE);


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 1A: CONTINENT & REGION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS continent (
    continent_id    SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL UNIQUE,
    geojson_border  TEXT,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_continent
    AFTER INSERT OR UPDATE OR DELETE ON continent
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('continent_id');

INSERT INTO continent (name) VALUES
('Africa'), ('Antarctica'), ('Asia'), ('Europe'),
('North America'), ('Oceania'), ('South America');


CREATE TABLE IF NOT EXISTS region (
    region_id       SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    continent_id    INTEGER NOT NULL REFERENCES continent(continent_id),
    geojson_border  TEXT,
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_region_continent ON region (continent_id);

CREATE TRIGGER trg_audit_region
    AFTER INSERT OR UPDATE OR DELETE ON region
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('region_id');

-- Seed key regions (continent_id values: 1=Africa, 3=Asia, 4=Europe, 5=N.America, 6=Oceania, 7=S.America)
INSERT INTO region (name, continent_id) VALUES
('Central Africa', 1), ('East Africa', 1), ('North Africa', 1), ('Southern Africa', 1), ('West Africa', 1),
('Central Asia', 3), ('East Asia', 3), ('South Asia', 3), ('Southeast Asia', 3), ('Western Asia', 3),
('Eastern Europe', 4), ('Northern Europe', 4), ('Southern Europe', 4), ('Western Europe', 4),
('Caribbean', 5), ('Central America', 5), ('Northern America', 5),
('Australia and New Zealand', 6), ('Melanesia', 6), ('Micronesia', 6), ('Polynesia', 6),
('Andean Region', 7), ('Southern Cone', 7), ('Northern South America', 7);


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 2: SOURCE ENTITY (DD 32-field table)
-- ─────────────────────────────────────────────────────────────────────────────
-- This is the intelligence case/event source, SEPARATE from provenance.source
-- (citation registry). Both coexist.

CREATE TABLE IF NOT EXISTS source (
    source_id                   SERIAL PRIMARY KEY,
    name                        VARCHAR(255) NOT NULL,
    type                        VARCHAR(255),
    motive                      VARCHAR(255),
    description                 TEXT NOT NULL,
    time_frame                  VARCHAR(255),
    status                      VARCHAR(255),
    geo_level                   VARCHAR(255),
    geo_notes                   TEXT,
    primary_lea                 VARCHAR(255),
    lea_cooperation             VARCHAR(255),
    lea_notes                   TEXT,
    fi_exploitation_ind         BOOLEAN,
    fi_expl_notes               TEXT,
    fi_consequence              VARCHAR(255),
    fi_internal_threat          VARCHAR(255),
    fi_internal_notes           TEXT,
    link_terrorism_ind          BOOLEAN,
    terr_notes                  TEXT,
    ofac_sanctions              VARCHAR(255),
    ofac_sanctions_status       VARCHAR(255),
    un_sanctions                VARCHAR(255),
    un_sanctions_status         VARCHAR(255),
    eu_sanctions                VARCHAR(255),
    eu_sanctions_status         VARCHAR(255),
    uk_sanctions                VARCHAR(255),
    sanction_general_notes      TEXT,
    corruption_link_ind         BOOLEAN,
    corruption_notes            TEXT,
    headline_1                  TEXT,
    headline_2                  TEXT,
    headline_3                  TEXT,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_source_name ON source (name);
CREATE INDEX idx_source_type ON source (type) WHERE is_deleted = FALSE;
CREATE INDEX idx_source_status ON source (status) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_audit_source_entity
    AFTER INSERT OR UPDATE OR DELETE ON source
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_id');

COMMENT ON TABLE source IS 'Intelligence case/event source entity (DD spec). Distinct from provenance.source (citation registry).';


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 3: FINANCIAL INSTITUTION
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS financial_institution (
    fi_id               SERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    type                VARCHAR(255),
    hq_location         VARCHAR(255),
    market_coverage     VARCHAR(255),
    regulatory_status   VARCHAR(255),
    general_notes       TEXT,
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fi_name ON financial_institution (name);

CREATE TRIGGER trg_audit_financial_institution
    AFTER INSERT OR UPDATE OR DELETE ON financial_institution
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('fi_id');


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4A: TTP RECORD EXPANSION (10 → 22 fields)
-- ─────────────────────────────────────────────────────────────────────────────
-- Add new columns per DD spec. Existing data preserved.

-- New FK columns
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS person_interest_id INTEGER REFERENCES person_interest(person_interest_id);
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS organization_interest_id INTEGER REFERENCES organization_interest(organization_interest_id);
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS threat_classification_id INTEGER;
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS threat_subclassification_id INTEGER;
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS echelon TEXT;

-- JSON array fields
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS financial_products JSONB;
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS financial_channels JSONB;
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS supporting_quotes JSONB;

-- Extraction metadata
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS extraction_date TIMESTAMPTZ;
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS extractor_model_version VARCHAR(255);
ALTER TABLE htf.ttp_record ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

-- Indexes on new FKs
CREATE INDEX IF NOT EXISTS idx_ttp_rec_person ON htf.ttp_record (person_interest_id) WHERE person_interest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ttp_rec_org ON htf.ttp_record (organization_interest_id) WHERE organization_interest_id IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 4B: x_ttp_records_ttp_signals (new junction)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS htf.x_ttp_records_ttp_signals (
    ttp_record_signal_id    SERIAL PRIMARY KEY,
    ttp_record_id           INTEGER NOT NULL REFERENCES htf.ttp_record(ttp_record_id),
    ttp_signal_id           INTEGER NOT NULL REFERENCES htf.ttp_signal(ttp_signal_id),
    ttp_signal_weight       FLOAT NOT NULL DEFAULT 1.0,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_xtrts_record ON htf.x_ttp_records_ttp_signals (ttp_record_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_xtrts_signal ON htf.x_ttp_records_ttp_signals (ttp_signal_id) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_audit_x_ttp_rec_sig
    AFTER INSERT OR UPDATE OR DELETE ON htf.x_ttp_records_ttp_signals
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('ttp_record_signal_id');


-- ─────────────────────────────────────────────────────────────────────────────
-- PHASE 5: ALL REMAINING JUNCTION TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- 5.1 Person ↔ Organization
CREATE TABLE IF NOT EXISTS x_person_organization_interest (
    person_organization_id              SERIAL PRIMARY KEY,
    person_interest_id                  INTEGER NOT NULL REFERENCES person_interest(person_interest_id),
    organization_interest_id            INTEGER NOT NULL REFERENCES organization_interest(organization_interest_id),
    person_organization_role            VARCHAR(255),
    person_organization_role_status     VARCHAR(255),
    person_organization_role_notes      TEXT,
    person_organization_start_day       VARCHAR(255),
    is_deleted                          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_person_org
    AFTER INSERT OR UPDATE OR DELETE ON x_person_organization_interest
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('person_organization_id');


-- 5.2 Person ↔ TTP
CREATE TABLE IF NOT EXISTS x_person_interest_ttp (
    person_ttp_id       SERIAL PRIMARY KEY,
    person_interest_id  INTEGER NOT NULL REFERENCES person_interest(person_interest_id),
    ttp_id              INTEGER NOT NULL REFERENCES htf.ttp(ttp_id),
    is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_person_ttp
    AFTER INSERT OR UPDATE OR DELETE ON x_person_interest_ttp
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('person_ttp_id');


-- 5.3 Person ↔ Financial Institution
CREATE TABLE IF NOT EXISTS x_person_interest_fi (
    person_interest_fi_id           SERIAL PRIMARY KEY,
    person_interest_id              INTEGER NOT NULL REFERENCES person_interest(person_interest_id),
    fi_id                           INTEGER NOT NULL REFERENCES financial_institution(fi_id),
    person_interest_fi_relationship VARCHAR(255),
    person_interest_fi_status       VARCHAR(255),
    person_interest_fi_initial_date VARCHAR(255),
    person_interest_fi_end_date     VARCHAR(255),
    person_interest_fi_rela_notes   TEXT,
    is_deleted                      BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_person_fi
    AFTER INSERT OR UPDATE OR DELETE ON x_person_interest_fi
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('person_interest_fi_id');


-- 5.4 Organization ↔ Financial Institution
CREATE TABLE IF NOT EXISTS x_organization_interest_fi (
    organization_interest_fi_id             SERIAL PRIMARY KEY,
    fi_id                                   INTEGER NOT NULL REFERENCES financial_institution(fi_id),
    organization_interest_id                INTEGER NOT NULL REFERENCES organization_interest(organization_interest_id),
    organization_interest_fi_link_type      VARCHAR(255),
    organization_interest_fi_status         VARCHAR(255),
    organization_interest_fi_start_date     VARCHAR(255),
    organization_interest_fi_end_date       VARCHAR(255),
    organization_interest_fi_notes          TEXT,
    is_deleted                              BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_org_fi
    AFTER INSERT OR UPDATE OR DELETE ON x_organization_interest_fi
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('organization_interest_fi_id');


-- 5.5 Source ↔ Country
CREATE TABLE IF NOT EXISTS x_source_country (
    source_country_id       SERIAL PRIMARY KEY,
    source_id               INTEGER NOT NULL REFERENCES source(source_id),
    country_id              INTEGER NOT NULL REFERENCES country(country_id),
    source_country_notes    TEXT,
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_source_country
    AFTER INSERT OR UPDATE OR DELETE ON x_source_country
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_country_id');


-- 5.6 Source ↔ Financial Institution
CREATE TABLE IF NOT EXISTS x_source_fi (
    source_fi_id                SERIAL PRIMARY KEY,
    source_id                   INTEGER NOT NULL REFERENCES source(source_id),
    fi_id                       INTEGER NOT NULL REFERENCES financial_institution(fi_id),
    source_fi_type_involvement  VARCHAR(255),
    source_fi_notes             TEXT,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_source_fi
    AFTER INSERT OR UPDATE OR DELETE ON x_source_fi
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_fi_id');


-- 5.7 Source ↔ Organization
CREATE TABLE IF NOT EXISTS x_source_organization_interest (
    source_oi_id                        SERIAL PRIMARY KEY,
    source_id                           INTEGER NOT NULL REFERENCES source(source_id),
    organization_interest_id            INTEGER NOT NULL REFERENCES organization_interest(organization_interest_id),
    source_organization_function        VARCHAR(255),
    source_organization_notes           TEXT,
    source_organization_initial_date    VARCHAR(255),
    source_organization_terminal_date   VARCHAR(255),
    is_deleted                          BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_source_org
    AFTER INSERT OR UPDATE OR DELETE ON x_source_organization_interest
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_oi_id');


-- 5.8 Source ↔ Person
CREATE TABLE IF NOT EXISTS x_source_person_interest (
    source_pi_id                    SERIAL PRIMARY KEY,
    source_id                       INTEGER NOT NULL REFERENCES source(source_id),
    person_interest_id              INTEGER NOT NULL REFERENCES person_interest(person_interest_id),
    source_person_interest_role     VARCHAR(255),
    source_person_interest_notes    TEXT,
    is_deleted                      BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_source_person
    AFTER INSERT OR UPDATE OR DELETE ON x_source_person_interest
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_pi_id');


-- 5.9 Source ↔ Threat Boundary
CREATE TABLE IF NOT EXISTS x_source_threat_boundary (
    source_threat_boundary_id       SERIAL PRIMARY KEY,
    source_id                       INTEGER NOT NULL REFERENCES source(source_id),
    threat_boundary_id              INTEGER NOT NULL REFERENCES threat_boundary(threat_boundary_id),
    source_threat_boundary_notes    TEXT,
    is_deleted                      BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_source_boundary
    AFTER INSERT OR UPDATE OR DELETE ON x_source_threat_boundary
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_threat_boundary_id');


-- 5.10 Source ↔ Threat Subclass
CREATE TABLE IF NOT EXISTS x_source_threat_subclass (
    source_im_id            SERIAL PRIMARY KEY,
    source_id               INTEGER NOT NULL REFERENCES source(source_id),
    threat_subclass_id      INTEGER NOT NULL REFERENCES threat_subclass(threat_subclass_id),
    source_im_supply        TEXT,
    source_im_logistics     TEXT,
    source_im_markets       VARCHAR(255),
    is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_source_subclass
    AFTER INSERT OR UPDATE OR DELETE ON x_source_threat_subclass
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_im_id');


-- 5.11 Threat Subclass ↔ Threat Boundary (complex 14-field junction)
CREATE TABLE IF NOT EXISTS x_threat_subclass_threat_boundary (
    threat_subclass_threat_boundary_id                      SERIAL PRIMARY KEY,
    threat_subclass_id                                      INTEGER NOT NULL REFERENCES threat_subclass(threat_subclass_id),
    threat_boundary_id                                      INTEGER NOT NULL REFERENCES threat_boundary(threat_boundary_id),
    threat_subclass_threat_boundary_type                    VARCHAR(255),
    threat_subclass_threat_boundary_raw_material            VARCHAR(255),
    threat_subclass_threat_boundary_manufacturing           VARCHAR(255),
    threat_subclass_threat_boundary_bulk_shipping           VARCHAR(255),
    threat_subclass_threat_boundary_shipping_notes          TEXT,
    threat_subclass_threat_boundary_contraband_routes       VARCHAR(255),
    threat_subclass_threat_boundary_contr_notes             TEXT,
    threat_subclass_threat_boundary_services_types          VARCHAR(255),
    threat_subclass_threat_boundary_services_notes          TEXT,
    threat_subclass_threat_boundary_primary_market          VARCHAR(255),
    threat_subclass_threat_boundary_market_notes            TEXT,
    is_deleted                                              BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                                              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                                              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_audit_x_subclass_boundary
    AFTER INSERT OR UPDATE OR DELETE ON x_threat_subclass_threat_boundary
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('threat_subclass_threat_boundary_id');


-- ─────────────────────────────────────────────────────────────────────────────
-- SUMMARY
-- ─────────────────────────────────────────────────────────────────────────────
-- New tables created: continent, region, source, financial_institution,
--   x_ttp_records_ttp_signals, x_person_organization_interest,
--   x_person_interest_ttp, x_person_interest_fi, x_organization_interest_fi,
--   x_source_country, x_source_fi, x_source_organization_interest,
--   x_source_person_interest, x_source_threat_boundary, x_source_threat_subclass,
--   x_threat_subclass_threat_boundary
-- Altered tables: htf.ttp_record (12 new columns)
-- All tables have audit triggers attached.
