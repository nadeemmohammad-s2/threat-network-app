-- =============================================================================
-- THREAT NETWORK DATABASE — REFERENCE / LOOKUP TABLES
-- =============================================================================
-- Run AFTER 04_entity_tables.sql
-- Creates normalized lookup tables for all constrained-value fields.
-- Each ref table follows a standard pattern:
--   id SERIAL PK, value VARCHAR UNIQUE, display_order, description, is_active
-- =============================================================================

SELECT set_config('app.current_user_id', '1', FALSE);
CREATE SCHEMA IF NOT EXISTS ref;
COMMENT ON SCHEMA ref IS 'Reference/lookup tables for constrained field values.';

-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER: generate a standard ref table
-- ─────────────────────────────────────────────────────────────────────────────
-- We'll create each one explicitly for clarity and auditability.

-- ═══════════════════════════════════════════════════════════════════════════════
-- THREAT NETWORK REFERENCE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Category (TCO, FTO, etc.)
CREATE TABLE ref.tn_category (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.tn_category (value, description, display_order) VALUES
('TCO', 'Transnational Criminal Organization', 1),
('FTO', 'Foreign Terrorist Organization', 2),
('Hybrid', 'Combined criminal and terrorist characteristics', 3);

-- 2. Subcategory
CREATE TABLE ref.tn_subcategory (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    category_id INTEGER REFERENCES ref.tn_category(id),
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.tn_subcategory (value, description, display_order) VALUES
('Drug Trafficking', 'Primary narcotics trafficking operations', 1),
('Human Trafficking', 'Trafficking in persons', 2),
('Arms Trafficking', 'Illicit weapons trade', 3),
('Money Laundering', 'Primary ML operations', 4),
('Cybercrime', 'Cyber-enabled criminal operations', 5),
('Terrorism', 'Terrorist organization', 6),
('State-Sponsored', 'State-sponsored or proxy organization', 7),
('Militant / Paramilitary', 'Armed militant or paramilitary group', 8),
('Hybrid Criminal-Terrorist', 'Combined criminal and terrorist activity', 9);

-- 3. Primary Motivation
CREATE TABLE ref.tn_primary_motivation (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.tn_primary_motivation (value, description, display_order) VALUES
('Financial', 'Profit-driven operations', 1),
('Political', 'Political power or influence', 2),
('Ideological', 'Religious or ideological goals', 3),
('Territorial', 'Geographic control and expansion', 4),
('Ethnic / Nationalist', 'Ethnic or nationalist objectives', 5),
('Hybrid', 'Multiple concurrent motivations', 6);

-- 4. Status (shared across TN, persons, orgs)
CREATE TABLE ref.status (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    applies_to TEXT[] NOT NULL DEFAULT '{all}',
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.status (value, applies_to, description, display_order) VALUES
('Active', '{all}', 'Currently operational', 1),
('Inactive', '{all}', 'No longer operational', 2),
('Weakened', '{threat_network}', 'Degraded but still operational', 3),
('Dormant', '{threat_network}', 'Temporarily inactive', 4),
('LEA shut down', '{threat_network,organization}', 'Shut down by law enforcement', 5),
('Arrested', '{person}', 'Arrested by law enforcement', 6),
('Incarcerated', '{person}', 'Currently imprisoned', 7),
('Fugitive', '{person}', 'At large with active warrant', 8),
('Deceased', '{person}', 'Confirmed deceased', 9),
('Extradited', '{person}', 'Extradited to another jurisdiction', 10),
('Unknown', '{all}', 'Status not determined', 11);

-- 5. Violence Level
CREATE TABLE ref.violence_level (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.violence_level (value, description, display_order) VALUES
('Very High', 'Systematic use of extreme violence including mass killings', 1),
('High', 'Regular use of violence including targeted killings', 2),
('Moderate', 'Selective or occasional use of violence', 3),
('Low', 'Minimal direct violence, primarily intimidation', 4),
('None', 'No known use of violence', 5);

-- 6. Network Type
CREATE TABLE ref.network_type (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.network_type (value, description, display_order) VALUES
('Cartel', 'Large-scale organized criminal syndicate', 1),
('Mafia', 'Traditional organized crime family structure', 2),
('Gang', 'Street or regional gang organization', 3),
('Militia', 'Armed paramilitary organization', 4),
('Hybrid', 'Combined criminal-terrorist network', 5),
('Cell-Based', 'Decentralized cell structure', 6),
('State Proxy', 'State-sponsored proxy organization', 7),
('Clan / Tribal', 'Clan or tribal-based organization', 8);

-- 7. Network Configuration
CREATE TABLE ref.network_configuration (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.network_configuration (value, description, display_order) VALUES
('Centralized', 'Single command authority with hierarchical structure', 1),
('Decentralized', 'Multiple semi-autonomous nodes with loose coordination', 2),
('Distributed', 'No central authority, independent cells', 3),
('Hybrid', 'Mix of centralized leadership with decentralized operations', 4);

-- 8. Longevity
CREATE TABLE ref.longevity (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.longevity (value, description, display_order) VALUES
('Established (20+ years)', 'Operating for more than 20 years', 1),
('Mature (10-20 years)', 'Operating for 10 to 20 years', 2),
('Developing (5-10 years)', 'Operating for 5 to 10 years', 3),
('Emerging (< 5 years)', 'Operating for less than 5 years', 4),
('Unknown', 'Longevity not determined', 5);

-- 9. 8/8 Model Levels (used for commerce, FSI, logistics, etc.)
CREATE TABLE ref.model88_level (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.model88_level (value, description, display_order) VALUES
('Extensive', 'Deep, systematic exploitation', 1),
('High', 'Significant and regular use', 2),
('Moderate', 'Selective or periodic use', 3),
('Low', 'Minimal or opportunistic use', 4),
('None', 'No known exploitation', 5),
('Unknown', 'Not assessed', 6);

-- 10. ML Intensity
CREATE TABLE ref.ml_intensity (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.ml_intensity (value, description, display_order) VALUES
('Very High', 'Core operational function — primary revenue channel', 1),
('High', 'Regular large-scale money laundering operations', 2),
('Moderate', 'Periodic or selective ML activity', 3),
('Low', 'Minimal ML — primarily cash-based', 4),
('Unknown', 'Not assessed', 5);

-- 11. TBML Level
CREATE TABLE ref.tbml_level (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.tbml_level (value, description, display_order) VALUES
('Extensive', 'Systematic trade-based money laundering', 1),
('High', 'Regular TBML operations', 2),
('Moderate', 'Periodic TBML activity', 3),
('Low', 'Minimal TBML', 4),
('None', 'No known TBML', 5),
('Unknown', 'Not assessed', 6);

-- 12. Ops Outsourcing
CREATE TABLE ref.ops_outsourcing (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.ops_outsourcing (value, description, display_order) VALUES
('Extensive', 'Routinely outsources key operations', 1),
('Selective', 'Outsources specific functions', 2),
('Minimal', 'Rarely outsources', 3),
('None', 'Entirely self-contained operations', 4),
('Unknown', 'Not assessed', 5);

-- 13. OFAC/FTO Designation
CREATE TABLE ref.designation_status (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.designation_status (value, description, display_order) VALUES
('Designated', 'Currently on designation list', 1),
('Formerly Designated', 'Previously designated, now removed', 2),
('Under Review', 'Under consideration for designation', 3),
('Not Designated', 'Not on any designation list', 4),
('Unknown', 'Designation status unknown', 5);

-- 14. Diaspora Operations
CREATE TABLE ref.diaspora_level (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.diaspora_level (value, description, display_order) VALUES
('Extensive', 'Systematic exploitation of diaspora communities', 1),
('High', 'Significant diaspora operations', 2),
('Moderate', 'Selective diaspora engagement', 3),
('Low', 'Minimal diaspora activity', 4),
('None', 'No known diaspora operations', 5),
('Unknown', 'Not assessed', 6);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PERSON OF INTEREST REFERENCE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 15. Person Hierarchy
CREATE TABLE ref.person_hierarchy (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.person_hierarchy (value, description, display_order) VALUES
('Supreme Leadership', 'Top-level leader / founder', 1),
('Senior Leadership', 'Senior decision-maker / faction leader', 2),
('Operational Command', 'Regional or operational commander', 3),
('Lieutenant', 'Mid-level manager', 4),
('Operative', 'Field operator / soldier', 5),
('Facilitator', 'External enabler (lawyer, accountant, etc.)', 6),
('Associate', 'Loosely affiliated individual', 7);

-- 16. Person Role
CREATE TABLE ref.person_role (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.person_role (value, description, display_order) VALUES
('Leader', 'Organization leader or co-leader', 1),
('Co-founder / Leader', 'Co-founder with leadership role', 2),
('Faction Leader', 'Leader of an internal faction', 3),
('Secretary General', 'Political/organizational head', 4),
('Financial Officer', 'Controls finances or money laundering', 5),
('Enforcement / Security Chief', 'Heads enforcement or security arm', 6),
('Logistics Chief', 'Manages supply chain and logistics', 7),
('Political Liaison', 'Manages political connections', 8),
('Recruiter', 'Recruitment operations', 9),
('Operative', 'General operational role', 10),
('Facilitator', 'External facilitation role', 11);

-- 17. Nationality Type
CREATE TABLE ref.nationality_type (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.nationality_type (value, description, display_order) VALUES
('Single', 'Single nationality', 1),
('Dual', 'Dual nationality', 2),
('Multiple', 'Three or more nationalities', 3),
('Stateless', 'No recognized nationality', 4),
('Unknown', 'Nationality type not determined', 5);

-- 18. Sanctions Listing Status (OFAC, UN, EU for persons/orgs)
CREATE TABLE ref.sanctions_status (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.sanctions_status (value, description, display_order) VALUES
('Listed', 'Currently on sanctions list', 1),
('Formerly Listed', 'Previously listed, now removed', 2),
('Under Review', 'Under consideration for listing', 3),
('Not Listed', 'Not on sanctions list', 4),
('Unknown', 'Listing status unknown', 5);

-- 19. Asset Control
CREATE TABLE ref.asset_control (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.asset_control (value, description, display_order) VALUES
('Yes', 'Confirmed asset ownership or control', 1),
('No', 'No known asset control', 2),
('Suspected', 'Suspected but unconfirmed', 3),
('Unknown', 'Not assessed', 4);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATION REFERENCE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 20. Organization Type
CREATE TABLE ref.organization_type (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.organization_type (value, description, display_order) VALUES
('Business', 'Legitimate or front business entity', 1),
('Shell Company / Aviation', 'Shell company for aviation logistics', 2),
('Import/Export', 'Import/export business', 3),
('NGO', 'Non-governmental organization', 4),
('NFP', 'Not-for-profit organization', 5),
('Financial Services / Microfinance', 'Financial services or microfinance institution', 6),
('Real Estate', 'Real estate company or holdings', 7),
('Professional Services', 'Legal, accounting, consulting firms', 8),
('Government Entity', 'Government-affiliated organization', 9),
('Religious', 'Religious institution', 10),
('Other', 'Other organization type', 11);

-- 21. Organization Risk Level
CREATE TABLE ref.risk_level (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.risk_level (value, description, display_order) VALUES
('Very High', 'Very high risk of illicit financial activity', 1),
('High', 'High risk', 2),
('Moderate', 'Moderate risk', 3),
('Low', 'Low risk', 4),
('None', 'No identified risk', 5),
('Unknown', 'Not assessed', 6);

-- ═══════════════════════════════════════════════════════════════════════════════
-- JUNCTION TABLE REFERENCE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 22. Relationship Type
CREATE TABLE ref.relationship_type (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.relationship_type (value, description, display_order) VALUES
('Alliance', 'Cooperative relationship', 1),
('Competitor', 'Competing for same markets or territory', 2),
('Enemy', 'Hostile / adversarial', 3),
('Friendly', 'Non-hostile, occasional cooperation', 4),
('Subordinate', 'Reports to or controlled by', 5),
('Supplier', 'Provides goods or services to', 6),
('Customer', 'Purchases goods or services from', 7);

-- 23. Country Presence Level
CREATE TABLE ref.presence_level (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.presence_level (value, description, display_order) VALUES
('Dominant', 'Primary controller of territory or market', 1),
('Extensive', 'Major presence with significant influence', 2),
('High', 'Substantial operations and influence', 3),
('Moderate', 'Notable but not dominant presence', 4),
('Low', 'Limited or emerging presence', 5),
('Negligible', 'Minimal or suspected presence only', 6),
('Unknown', 'Presence level not assessed', 7);

-- 24. Strategic Value
CREATE TABLE ref.strategic_value (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.strategic_value (value, description, display_order) VALUES
('Very High', 'Critical strategic importance', 1),
('High', 'Significant strategic value', 2),
('Moderate', 'Moderate strategic value', 3),
('Low', 'Limited strategic value', 4),
('Unknown', 'Not assessed', 5);

-- 25. Geographic Extension / Segmentation Level
CREATE TABLE ref.level_scale (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.level_scale (value, description, display_order) VALUES
('Dominant', 'Controls the market or geography', 1),
('Extensive', 'Major geographic or market coverage', 2),
('High', 'Significant coverage', 3),
('Moderate', 'Moderate coverage', 4),
('Low', 'Limited coverage', 5),
('Negligible', 'Minimal or no coverage', 6),
('Unknown', 'Not assessed', 7);

-- 26. Threat Boundary Type
CREATE TABLE ref.boundary_type (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.boundary_type (value, description, display_order) VALUES
('Land Border', 'International land border crossing', 1),
('Maritime Corridor', 'Maritime smuggling route', 2),
('Maritime Entry Point', 'Port or coastal entry point', 3),
('Air Corridor', 'Aerial smuggling route', 4),
('Overland Route', 'Inland transportation corridor', 5),
('Urban Zone', 'Urban distribution or staging area', 6),
('Conflict Zone', 'Active conflict area', 7);

-- 27. Threat Subclass Type
CREATE TABLE ref.subclass_type (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.subclass_type (value, description, display_order) VALUES
('Product', 'Physical commodity (drugs, weapons, etc.)', 1),
('Service', 'Illicit service (money laundering, smuggling, etc.)', 2);

-- 28. Commodity Flow Geography
CREATE TABLE ref.flow_geography (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.flow_geography (value, description, display_order) VALUES
('Local', 'Within a single city or region', 1),
('National', 'Within a single country', 2),
('Regional', 'Across multiple countries in a region', 3),
('International', 'Cross-continental supply chains', 4),
('Global', 'Worldwide distribution network', 5);

-- 29. Logistics Complexity
CREATE TABLE ref.complexity_level (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.complexity_level (value, description, display_order) VALUES
('Very High', 'Extremely complex multi-stage operations', 1),
('High', 'Complex logistics requiring coordination', 2),
('Moderate', 'Standard complexity', 3),
('Low', 'Simple or direct operations', 4);

-- 30. Yes/No/Unknown (for boolean-like varchars)
CREATE TABLE ref.yes_no (
    id SERIAL PRIMARY KEY,
    value VARCHAR(100) NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO ref.yes_no (value, display_order) VALUES
('Yes', 1), ('No', 2), ('Suspected', 3), ('Unknown', 4);


-- ═══════════════════════════════════════════════════════════════════════════════
-- FIELD → REFERENCE TABLE MAPPING
-- ═══════════════════════════════════════════════════════════════════════════════
-- This table tells the UI which ref table drives which field's dropdown.

CREATE TABLE ref.field_lookup_map (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    field_name TEXT NOT NULL,
    ref_table TEXT NOT NULL,
    ref_schema TEXT NOT NULL DEFAULT 'ref',
    UNIQUE (table_name, field_name)
);

INSERT INTO ref.field_lookup_map (table_name, field_name, ref_table) VALUES
-- threat_network fields
('threat_network', 'category', 'tn_category'),
('threat_network', 'subcategory', 'tn_subcategory'),
('threat_network', 'primary_motivation', 'tn_primary_motivation'),
('threat_network', 'status', 'status'),
('threat_network', 'longevity', 'longevity'),
('threat_network', 'violence', 'violence_level'),
('threat_network', 'network_type', 'network_type'),
('threat_network', 'network_configuration', 'network_configuration'),
('threat_network', 'diaspora_operations', 'diaspora_level'),
('threat_network', 'commerce_front_control', 'model88_level'),
('threat_network', 'fsi_exploitation', 'model88_level'),
('threat_network', 'logistics_control', 'model88_level'),
('threat_network', 'professional_services', 'model88_level'),
('threat_network', 'public_sector_facilitation', 'model88_level'),
('threat_network', 'political_facilitation', 'model88_level'),
('threat_network', 'police_military_facilitation', 'model88_level'),
('threat_network', 'social_communal_facilitation', 'model88_level'),
('threat_network', 'tbml', 'tbml_level'),
('threat_network', 'ml_intensity', 'ml_intensity'),
('threat_network', 'ofac_designation', 'designation_status'),
('threat_network', 'fto_designation', 'designation_status'),
('threat_network', 'ops_outsourcing', 'ops_outsourcing'),
-- person_interest fields
('person_interest', 'status', 'status'),
('person_interest', 'hierarchy', 'person_hierarchy'),
('person_interest', 'primary_role', 'person_role'),
('person_interest', 'secondary_role', 'person_role'),
('person_interest', 'nationality_type', 'nationality_type'),
('person_interest', 'asset_control', 'asset_control'),
('person_interest', 'ofac_listed', 'sanctions_status'),
('person_interest', 'un_listed', 'sanctions_status'),
('person_interest', 'eu_listed', 'sanctions_status'),
-- organization_interest fields
('organization_interest', 'type', 'organization_type'),
('organization_interest', 'status', 'status'),
('organization_interest', 'if_high_risk', 'risk_level'),
('organization_interest', 'terrorism_risk', 'risk_level'),
-- junction table fields
('threat_network_relationship', 'relationship_type', 'relationship_type'),
('x_person_interest_threat_network', 'person_threat_network_role', 'person_role'),
('x_person_interest_threat_network', 'person_threat_network_status', 'status'),
('x_threat_network_country', 'threat_network_country_status', 'status'),
('x_threat_network_country', 'threat_network_country_presence_level', 'presence_level'),
('x_threat_network_threat_boundary', 'threat_market_threat_boundary_strategic_value', 'strategic_value'),
('x_threat_network_threat_boundary', 'threat_market_threat_boundary_primary_dominance', 'yes_no'),
('x_threat_network_threat_subclass', 'threat_network_threat_subclass_geographic_extension', 'level_scale'),
('x_threat_network_threat_subclass', 'threat_network_threat_subclass_level_segmentation', 'level_scale'),
-- threat_boundary fields
('threat_boundary', 'type', 'boundary_type'),
-- threat_subclass fields
('threat_subclass', 'type', 'subclass_type'),
('threat_subclass', 'commodity_flow_geography', 'flow_geography'),
('threat_subclass', 'logistics_complexity', 'complexity_level'),
('threat_subclass', 'logistics_perishability', 'yes_no'),
('threat_subclass', 'commodity_environment_control', 'yes_no'),
('threat_subclass', 'typical_front_setup', 'complexity_level');

COMMENT ON TABLE ref.field_lookup_map IS 'Maps each constrained field to its reference lookup table. Drives UI dropdown population.';

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT TRIGGERS ON ALL REF TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'ref' AND table_type = 'BASE TABLE'
          AND table_name != 'field_lookup_map'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON ref.%I FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change(''id'')',
            tbl, tbl
        );
    END LOOP;
END $$;

DO $$ BEGIN RAISE NOTICE 'Reference tables created and seeded successfully. Total: 30 tables.'; END $$;
