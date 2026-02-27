-- =============================================================================
-- THREAT NETWORK DATABASE — STANDALONE ENTITY TABLES
-- =============================================================================
-- Run AFTER 01_scd2_audit.sql, 02_provenance.sql, and 03_seed.sql
-- Creates: person_interest, organization_interest, country,
--          threat_boundary, threat_subclass
-- Attaches audit triggers to all new tables
-- =============================================================================

SELECT set_config('app.current_user_id', '1', FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PERSON OF INTEREST
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS person_interest (
    person_interest_id          SERIAL PRIMARY KEY,
    name                        VARCHAR(255) NOT NULL,
    alias_primary               VARCHAR(255),
    alias_secondary             VARCHAR(255),
    dob                         VARCHAR(255),
    pob                         VARCHAR(255),
    nationality_type            VARCHAR(255),
    geographic_nationality      VARCHAR(255),
    nationality_2               VARCHAR(255),
    por_primary                 VARCHAR(255),
    por_secondary               VARCHAR(255),
    status                      VARCHAR(255),
    primary_role                VARCHAR(255),
    secondary_role              VARCHAR(255),
    hierarchy                   VARCHAR(255),
    profession                  VARCHAR(255),
    criminal_history            VARCHAR(255),
    criminal_hist_notes         TEXT,
    asset_control               VARCHAR(255),
    asset_types_notes           TEXT,
    ofac_listed                 VARCHAR(255),
    ofac_notes                  TEXT,
    un_listed                   VARCHAR(255),
    un_notes                    TEXT,
    eu_listed                   VARCHAR(255),
    eu_notes                    TEXT,
    photo                       TEXT,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_person_name ON person_interest (name);
CREATE INDEX idx_person_status ON person_interest (status) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_audit_person_interest
    AFTER INSERT OR UPDATE OR DELETE ON person_interest
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('person_interest_id');

COMMENT ON TABLE person_interest IS 'Persons of interest linked to threat networks via x_person_interest_threat_network.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ORGANIZATION OF INTEREST
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organization_interest (
    organization_interest_id    SERIAL PRIMARY KEY,
    name                        VARCHAR(255) NOT NULL,
    type                        VARCHAR(255),
    acronym                     VARCHAR(255),
    dba                         VARCHAR(255),
    legal_nm                    VARCHAR(255),
    product_type                VARCHAR(255),
    use                         VARCHAR(255),
    notes                       TEXT,
    foundation                  VARCHAR(255),
    status                      VARCHAR(255),
    if_high_risk                VARCHAR(255),
    if_risk_notes               TEXT,
    terrorism_risk              VARCHAR(255),
    terrorism_notes             TEXT,
    supply                      TEXT,
    fi_sup_primary              VARCHAR(255),
    fi_sup_prim_notes           TEXT,
    logistics_support           TEXT,
    professional_ser            TEXT,
    pub_sec_facilitation        TEXT,
    political_facilitation      TEXT,
    lea_military_facilitation   TEXT,
    social_facilitation         TEXT,
    logo_1                      TEXT,
    logo_2                      TEXT,
    sanctions                   TEXT,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_name ON organization_interest (name);
CREATE INDEX idx_org_status ON organization_interest (status) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_audit_organization_interest
    AFTER INSERT OR UPDATE OR DELETE ON organization_interest
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('organization_interest_id');

COMMENT ON TABLE organization_interest IS 'Organizations of interest linked to threat networks via x_organization_interest_threat_network.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. COUNTRY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS country (
    country_id                  SERIAL PRIMARY KEY,
    name                        VARCHAR(255) NOT NULL,
    capital                     VARCHAR(255),
    type_government             VARCHAR(255),
    governance                  VARCHAR(255),
    m49_code                    VARCHAR(255) NOT NULL,
    iso_alpha3                  VARCHAR(255) NOT NULL,
    general_notes               TEXT,
    hdi                         VARCHAR(255),
    gini                        VARCHAR(255),
    fatf                        TEXT,
    juim                        VARCHAR(255),
    basel_index                 VARCHAR(255),
    wb_income                   VARCHAR(255),
    ofac_sanctioned             TEXT,
    ofac_notes                  TEXT,
    un_sanctions                TEXT,
    eu_sanctions                TEXT,
    uk_sanctions                TEXT,
    ti_index                    VARCHAR(255),
    pci                         VARCHAR(255),
    crf                         VARCHAR(255),
    oecd_membership             VARCHAR(255),
    oecd_longevity              VARCHAR(255),
    geojson_border              TEXT,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_country_iso ON country (iso_alpha3) WHERE is_deleted = FALSE;
CREATE INDEX idx_country_name ON country (name);

CREATE TRIGGER trg_audit_country
    AFTER INSERT OR UPDATE OR DELETE ON country
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('country_id');

COMMENT ON TABLE country IS 'Country reference table with governance, sanctions, and risk indicators.';


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. THREAT BOUNDARY
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS threat_boundary (
    threat_boundary_id          SERIAL PRIMARY KEY,
    name                        VARCHAR(255) NOT NULL,
    description                 TEXT NOT NULL,
    type                        VARCHAR(255) NOT NULL,
    definition                  TEXT NOT NULL,
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tb_name ON threat_boundary (name);

CREATE TRIGGER trg_audit_threat_boundary
    AFTER INSERT OR UPDATE OR DELETE ON threat_boundary
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('threat_boundary_id');

COMMENT ON TABLE threat_boundary IS 'Geographic threat boundaries (corridors, routes, borders).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. THREAT SUBCLASS (illicit markets / commodities)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS threat_subclass (
    threat_subclass_id          SERIAL PRIMARY KEY,
    name                        VARCHAR(255) NOT NULL,
    type                        VARCHAR(255) NOT NULL,
    threat_class_id             INTEGER NOT NULL,
    customer_base               VARCHAR(255),
    cust_base_notes             TEXT,
    raw_material_notes          TEXT,
    manufacture_facility        VARCHAR(255),
    man_facility_notes          TEXT,
    commodity_flow_geography    VARCHAR(255),
    primary_market_geography    VARCHAR(255),
    primary_market_geo_notes    TEXT,
    estimated_value             VARCHAR(255),
    esti_value_notes            TEXT,
    logistics_complexity        VARCHAR(255),
    logistics_perishability     VARCHAR(255),
    commodity_environment_control VARCHAR(255),
    commodity_smuggling_tactics VARCHAR(255),
    typical_front_setup         VARCHAR(255),
    is_deleted                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_ts                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ts_name ON threat_subclass (name);
CREATE INDEX idx_ts_class ON threat_subclass (threat_class_id);

CREATE TRIGGER trg_audit_threat_subclass
    AFTER INSERT OR UPDATE OR DELETE ON threat_subclass
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('threat_subclass_id');

COMMENT ON TABLE threat_subclass IS 'Illicit market subclasses (fentanyl, cocaine, counterfeit goods, etc.).';


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SEED DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- Persons (matching the person_interest_id values used in 03_seed.sql junction data)
INSERT INTO person_interest (person_interest_id, name, alias_primary, status, primary_role, hierarchy, geographic_nationality, dob, criminal_history) VALUES
(1, 'Ismael Zambada García', 'El Mayo', 'Arrested', 'Co-founder / Leader', 'Supreme Leadership', 'Mexican', '1948-01-01', 'Drug trafficking, money laundering, murder conspiracy'),
(2, 'Ovidio Guzmán López', 'El Ratón', 'Arrested', 'Faction Leader — Los Chapitos', 'Senior Leadership', 'Mexican', '1990-03-29', 'Drug trafficking, fentanyl manufacturing'),
(3, 'Néstor Isidro Pérez Salas', 'El Nini', 'Active', 'Enforcement / Security Chief', 'Operational Command', 'Mexican', '1990-01-01', 'Kidnapping, murder, drug trafficking'),
(4, 'Nemesio Oseguera Cervantes', 'El Mencho', 'Fugitive', 'Supreme Leader', 'Supreme Leadership', 'Mexican', '1966-07-17', 'Drug trafficking, terrorism, murder — $10M DEA reward'),
(5, 'Naim Qassem', NULL, 'Active', 'Secretary General', 'Supreme Leadership', 'Lebanese', '1953-01-01', 'Designated FTO leader');

SELECT setval(pg_get_serial_sequence('person_interest', 'person_interest_id'),
       (SELECT MAX(person_interest_id) FROM person_interest));

-- Organizations (matching junction data)
INSERT INTO organization_interest (organization_interest_id, name, type, status, use, notes) VALUES
(1, 'Grupo Aéreo del Pacífico', 'Shell Company / Aviation', 'LEA shut down', 'Logistics / Air Transport', 'Shell company used for procuring aircraft for CDS operations. Seized by Mexican FGR in 2022.'),
(2, 'Exportadora Agrícola del Pacífico', 'Import/Export', 'Active', 'TBML / Commerce Front', 'Agricultural export company used for trade-based money laundering. OFAC designation Sept 2023.'),
(3, 'Al-Qard Al-Hassan Association', 'Financial Services / Microfinance', 'Active', 'Financial Services / Quasi-Bank', 'Shia microfinance institution functioning as Hezbollah de facto banking arm. OFAC listed 2007. Targeted by Israeli strikes in 2024.');

SELECT setval(pg_get_serial_sequence('organization_interest', 'organization_interest_id'),
       (SELECT MAX(organization_interest_id) FROM organization_interest));

-- Countries (matching junction data)
INSERT INTO country (country_id, name, m49_code, iso_alpha3, capital, type_government) VALUES
(1, 'Mexico', '484', 'MEX', 'Mexico City', 'Federal presidential constitutional republic'),
(2, 'United States', '840', 'USA', 'Washington, D.C.', 'Federal presidential constitutional republic'),
(3, 'Colombia', '170', 'COL', 'Bogotá', 'Unitary presidential constitutional republic'),
(4, 'Lebanon', '422', 'LBN', 'Beirut', 'Unitary parliamentary confessionalist republic');

SELECT setval(pg_get_serial_sequence('country', 'country_id'),
       (SELECT MAX(country_id) FROM country));

-- Threat Boundaries (matching junction data)
INSERT INTO threat_boundary (threat_boundary_id, name, description, type, definition) VALUES
(1, 'US-Mexico Southwest Border', 'Primary land border between the United States and Mexico spanning ~1,954 miles from the Pacific Ocean to the Gulf of Mexico.', 'Land Border', 'US-MEX border corridor'),
(2, 'Eastern Pacific Maritime Corridor', 'Maritime smuggling routes along the Pacific coast from South America through Central America to Mexico.', 'Maritime Corridor', 'Eastern Pacific shipping lanes'),
(3, 'Port of Manzanillo', 'Mexico''s busiest commercial seaport on the Pacific coast. Primary entry point for Asian fentanyl precursors and South American cocaine.', 'Maritime Entry Point', 'Manzanillo port zone');

SELECT setval(pg_get_serial_sequence('threat_boundary', 'threat_boundary_id'),
       (SELECT MAX(threat_boundary_id) FROM threat_boundary));

-- Threat Subclasses (matching junction data)
INSERT INTO threat_subclass (threat_subclass_id, name, type, threat_class_id, customer_base, estimated_value, commodity_flow_geography, logistics_complexity) VALUES
(1, 'Fentanyl (synthetic opioid)', 'Product', 1, 'End users, wholesale distributors', '$50–70 billion (US market)', 'International — China→Mexico→USA', 'High'),
(2, 'Cocaine', 'Product', 1, 'End users, wholesale distributors', '$70–100 billion (global)', 'International — Colombia→Central America→Mexico→USA/Europe', 'High'),
(3, 'Methamphetamine', 'Product', 1, 'End users, wholesale distributors', '$30–50 billion (global)', 'International — Mexico→USA, Myanmar→SE Asia', 'Moderate'),
(4, 'Military / Paramilitary Operations', 'Service', 2, 'State sponsors, allied organizations', 'N/A — state-sponsored', 'Regional — Lebanon, Syria, Iraq, Yemen', 'Very High');

SELECT setval(pg_get_serial_sequence('threat_subclass', 'threat_subclass_id'),
       (SELECT MAX(threat_subclass_id) FROM threat_subclass));

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ADD TO PROVENANCE FIELD REGISTRY
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO provenance.field_registry (table_name, field_name, display_name, description) VALUES
('person_interest', 'name', 'Name', 'Name of the person of interest.'),
('person_interest', 'alias_primary', 'Primary Alias', 'Primary alias or AKA.'),
('person_interest', 'status', 'Status', 'Activity status.'),
('person_interest', 'primary_role', 'Primary Role', 'Primary role within TN or as facilitator.'),
('person_interest', 'hierarchy', 'Hierarchy', 'Ranking within a TN.'),
('person_interest', 'criminal_history', 'Criminal History', 'Recorded or alleged criminal activity.'),
('person_interest', 'ofac_listed', 'OFAC Listed', 'OFAC sanctions listing.'),

('organization_interest', 'name', 'Name', 'Name of the organization.'),
('organization_interest', 'type', 'Type', 'Type of organization.'),
('organization_interest', 'status', 'Status', 'Operational status.'),
('organization_interest', 'use', 'Use', 'How threat networks use this organization.'),
('organization_interest', 'sanctions', 'Sanctions', 'Sanctions listing information.'),

('country', 'name', 'Name', 'Country name.'),
('country', 'governance', 'Governance', 'Status of governance and stability.'),
('country', 'fatf', 'FATF', 'FATF assessment.'),
('country', 'basel_index', 'Basel Index', 'Basel AML Index ranking.'),

('threat_boundary', 'name', 'Name', 'Boundary name.'),
('threat_boundary', 'description', 'Description', 'Boundary description.'),
('threat_boundary', 'type', 'Type', 'Boundary type.'),

('threat_subclass', 'name', 'Name', 'Subclass name.'),
('threat_subclass', 'type', 'Type', 'Product or service.'),
('threat_subclass', 'estimated_value', 'Estimated Value', 'Aggregated annual market value.')
ON CONFLICT (table_name, field_name) DO NOTHING;

DO $$ BEGIN RAISE NOTICE 'Entity tables created and seeded successfully.'; END $$;
