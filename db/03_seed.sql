-- =============================================================================
-- THREAT NETWORK DATABASE — SEED DATA
-- =============================================================================
-- Run AFTER 01_scd2_audit.sql and 02_provenance.sql
-- Inserts sample threat networks and junction table data
-- =============================================================================

-- Set a default user for audit tracking
SELECT set_config('app.current_user_id', '1', FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. THREAT NETWORKS (via sp_threat_network_upsert for proper SCD2)
-- ─────────────────────────────────────────────────────────────────────────────

-- We need to insert the first version directly since the upsert expects
-- an existing natural key sequence. Let's create a helper sequence.
-- For the initial load, we INSERT directly then rely on procedures for updates.

INSERT INTO threat_network (
    threat_network_id, version_number, change_reason, user_id,
    name, acronym, category, subcategory, primary_motivation,
    longevity, geo_area_operations, network_type, network_configuration,
    estimated_membership, est_membership_notes, est_revenue_annual,
    network_notes, hq_location, hq_notes, demographics, diaspora_operations,
    commerce_front_control, commerce_notes, fsi_exploitation, fsi_notes,
    fsi_banking, fsi_remittance, fsi_currency_exchange, fsi_digital_asset_exchange,
    fsi_hawala, fsi_wealth_management, fsi_p2p, fsi_service_loan_association,
    fsi_credit_unions, fsi_insurance_company, fsi_mortgage, fsi_others,
    logistics_control, logistics_notes, professional_services, professional_serv_notes,
    public_sector_facilitation, public_sector_fac_notes, political_facilitation, political_notes,
    police_military_facilitation, police_military_notes, social_communal_facilitation, social_notes,
    tbml, ml_intensity, violence, ofac_designation, fto_designation, status,
    ops_outsourcing, ops_out_notes, history_notes, general_notes,
    emblem_1, emblem_2, colors, sources
) VALUES
(1, 1, 'Initial load', 1,
 'Sinaloa Cartel', 'CDS', 'TCO', 'Drug Trafficking', 'Financial',
 'Established 1989', 'North America, Central America, Europe', 'Hybrid', 'Decentralized',
 '20,000–60,000', 'Estimates vary widely. DEA 2024 NDTA estimates 20K core operators; academic sources suggest broader affiliate network up to 60K.', '$3–5 billion',
 'Post-2024 arrests have accelerated internal fragmentation. Two main factions now operate semi-independently.',
 'Culiacán, Sinaloa, Mexico', 'Traditional HQ in Culiacán; operational hubs in Guadalajara, CDMX, and Durango.',
 'Mexican nationals, primarily Sinaloa state origin', 'Extensive — US, Central America, Europe, Australia',
 'Extensive', 'Front companies in agriculture, real estate, import/export, and restaurants across Mexico and the US.',
 'Extensive', 'Sophisticated ML operations spanning bulk cash smuggling, TBML, and crypto.',
 TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, TRUE, TRUE,
 'Extensive', 'Controls key Pacific port and land border corridors.',
 'Moderate', 'Retains attorneys, accountants, and IT specialists.',
 'Extensive', 'Documented corruption of customs officials and port authorities.',
 'High', 'Historical ties to PRI-era politicians.',
 'Extensive', 'Documented infiltration of municipal police in northern Mexico.',
 'Moderate', 'Infrastructure investment in rural Sinaloa.',
 'Extensive', 'Very High', 'Very High', 'Yes', 'No', 'Active',
 'Moderate', 'Outsources transport logistics to independent cells.',
 'Founded in late 1980s from the Guadalajara Cartel split.',
 'Considered the most powerful TCO globally. Primary fentanyl distributor to the US.',
 NULL, NULL, 'No official colors',
 'DEA NDTA 2024; CRS Report R44921; Treasury OFAC SDN List; InSight Crime Profile'),

(2, 1, 'Initial load', 1,
 'Cártel Jalisco Nueva Generación', 'CJNG', 'TCO', 'Drug Trafficking', 'Financial',
 'Established 2010', 'North America, Central America, South America, Europe, Asia-Pacific', 'Hybrid', 'Centralized',
 '15,000–20,000', 'Aggressive expansion since 2010. Known for recruiting ex-military.', '$2–4 billion',
 'Vertical integration from production to retail distribution.',
 'Guadalajara, Jalisco, Mexico', 'Guadalajara metro area. Operational presence across 28 Mexican states.',
 'Mexican nationals, Jalisco origin', 'Moderate — expanding in US, Europe',
 'High', 'Real estate, restaurants, tequila industry fronts.',
 'Extensive', 'Chinese underground banking, crypto, real estate ML.',
 TRUE, TRUE, TRUE, TRUE, FALSE, TRUE, TRUE, FALSE, FALSE, FALSE, TRUE, TRUE,
 'Extensive', 'Port of Manzanillo control. Expanding drone and tunnel operations.',
 'Moderate', 'Attorneys and financial advisors in Guadalajara.',
 'High', 'Port authority and customs corruption documented.',
 'Moderate', 'Alleged connections to Jalisco state officials.',
 'High', 'Former military recruits form enforcement arm.',
 'Moderate', 'COVID-era food distribution in Jalisco communities.',
 'Extensive', 'Very High', 'Very High', 'Yes', 'No', 'Active',
 'Low', 'Prefers direct operational control.',
 'Emerged from Milenio Cartel remnants circa 2010.',
 'Most aggressive TCO in Mexico. Known for use of armored vehicles and IEDs.',
 NULL, NULL, 'No official colors',
 'DEA NDTA 2024; OFAC SDN; InSight Crime'),

(3, 1, 'Initial load', 1,
 'Hezbollah', 'HZB', 'FTO', 'Terrorist Organization', 'Ideological / Political',
 'Established 1982', 'Middle East, Latin America, Africa, Europe', 'State-sponsored Hybrid', 'Centralized',
 '30,000–50,000', 'Includes military wing, political apparatus, and social services network.', '$700M–1B+',
 'Post-2024 conflict has significantly degraded military capabilities and leadership structure.',
 'Dahiyeh, Beirut, Lebanon', 'Dahiyeh suburbs of southern Beirut. Regional command centers in Bekaa Valley.',
 'Shia Lebanese, transnational diaspora', 'Extensive — Tri-Border Area, West Africa, Southeast Asia',
 'Extensive', 'Used car dealerships, trade companies, and import/export businesses globally.',
 'Extensive', 'Lebanese Canadian Bank case as exemplar. Hawala networks, trade-based ML.',
 TRUE, TRUE, TRUE, FALSE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE,
 'High', 'Global logistics via front companies and sympathetic shippers.',
 'High', 'Attorneys in Lebanon and diaspora.',
 'Extensive', 'Hezbollah operates as a state-within-a-state in Lebanon.',
 'Extensive', 'Political party with parliamentary seats.',
 'Extensive', 'Military wing with advanced capabilities.',
 'Extensive', 'Operates hospitals, schools, reconstruction programs.',
 'Extensive', 'High', 'Very High', 'Yes', 'Yes', 'Active',
 'Moderate', 'Partners with IRGC-QF for operations.',
 'Founded 1982 during Israeli occupation of Lebanon. Iranian-backed.',
 'Dual nature: political party/social services AND military/terrorist organization.',
 NULL, NULL, 'Yellow and green',
 'CRS Report RL33566; OFAC SDN; Treasury Analytical Reports');

-- Set the sequence to continue after our manual inserts
SELECT setval(pg_get_serial_sequence('threat_network', 'threat_network_id'), 
       (SELECT MAX(threat_network_id) FROM threat_network));


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. JUNCTION TABLE DATA
-- ─────────────────────────────────────────────────────────────────────────────

-- Relationships
INSERT INTO threat_network_relationship (primary_threat_network_id, secondary_threat_network_id, relationship_type, formal_relationship_ind, notes, start_date, sources) VALUES
(1, 2, 'Enemy', FALSE, 'Primary territorial rival since 2015. Competing for control of Pacific corridor and fentanyl precursor routes.', '2015-03-01', 'DEA NDTA 2024; InSight Crime'),
(1, 2, 'Alliance', TRUE, 'European cocaine distribution partnership documented since early 2000s.', '2002-06-01', 'Europol SOCTA 2024; Italian DIA Reports'),
(2, 1, 'Enemy', FALSE, 'Primary rival across multiple territories.', '2015-01-01', 'DEA NDTA 2024');

-- Persons
INSERT INTO x_person_interest_threat_network (person_interest_id, threat_network_id, person_threat_network_role, person_threat_network_initial_date, person_threat_network_notes, person_threat_network_status) VALUES
(1, 1, 'Leader (historical)', '1989', 'Co-founder. Arrested July 2024 in US.', 'Arrested'),
(2, 1, 'Faction Leader — Los Chapitos', '2015', 'Los Chapitos faction leader. Arrested Jan 2024.', 'Arrested'),
(3, 1, 'Operational Commander', '2018', 'Known as El Nini. Heads enforcement/security arm.', 'Active'),
(4, 2, 'Supreme Leader', '2010', 'Known as El Mencho. $10M DEA reward.', 'Fugitive'),
(5, 3, 'Secretary General', '2024', 'Became leader after Nasrallah killing Sept 2024.', 'Active');

-- Countries
INSERT INTO x_threat_network_country (country_id, threat_network_id, threat_network_country_status, threat_network_country_start, threat_network_country_presence_level, threat_network_country_presence_notes) VALUES
(1, 1, 'Active', '1989', 'Extensive', 'Primary base of operations in Sinaloa, Sonora, Durango, Chihuahua.'),
(2, 1, 'Active', '1990', 'Extensive', 'Primary market. Distribution cells in Chicago, LA, Phoenix, Denver, Atlanta.'),
(3, 1, 'Active', '1995', 'Moderate', 'Source country coordination with local cocaine producers.'),
(1, 2, 'Active', '2010', 'Extensive', 'Operational in 28+ states. Strongest in Jalisco, Colima, Michoacán.'),
(2, 2, 'Active', '2012', 'Extensive', 'DEA identifies CJNG presence in all 50 states.'),
(4, 3, 'Active', '1982', 'Extensive', 'State-within-a-state. Controls southern Lebanon and parts of Beirut.');

-- Threat boundaries
INSERT INTO x_threat_network_threat_boundary (threat_network_id, threat_boundary_id, threat_market_threat_boundary_type, threat_market_threat_boundary_initial_detections, threat_market_threat_boundary_strategic_value, threat_market_threat_boundary_primary_dominance, threat_market_threat_boundary_notes) VALUES
(1, 1, 'Primary Transit Corridor', '1989', 'Very High/Vital', 'Yes — western sector', 'Controls Nogales, Tijuana, and Agua Prieta crossing points.'),
(1, 2, 'Smuggling Route', '1995', 'Very High/Vital', 'Yes', 'Semi-submersible fleet and go-fast boats.'),
(2, 3, 'Maritime Entry Point', '2012', 'Very High/Vital', 'Yes', 'Primary Pacific port for fentanyl precursor and cocaine importation.');

-- Threat subclasses
INSERT INTO x_threat_network_threat_subclass (threat_network_id, threat_subclass_id, threat_network_threat_subclass_initial_date, threat_network_threat_subclass_geographic_extension, threat_network_threat_subclass_value, threat_network_threat_subclass_level_segmentation, threat_network_threat_subclass_notes) VALUES
(1, 1, '2015', 'Global', '$2–3 billion (est.)', 'Full vertical — precursor procurement, synthesis, distribution', 'Primary fentanyl supplier to US market.'),
(1, 2, '1989', 'International', '$1–2 billion (est.)', 'Transshipment, logistics, wholesale distribution', 'Long-standing cocaine logistics.'),
(2, 1, '2016', 'International', '$1–2 billion (est.)', 'Full vertical', 'Second largest fentanyl supplier to US.'),
(2, 3, '2010', 'Global', '$1–2 billion (est.)', 'Full vertical', 'Dominant meth producer and exporter.'),
(3, 4, '1982', 'Global', 'N/A — state-sponsored', 'Full operational capability', 'Rocket arsenal, tunnel warfare, drone capabilities.');

-- Organizations
INSERT INTO x_organization_interest_threat_network (organization_interest_id, threat_network_id, organization_threat_network_function, organization_threat_network_function_notes, organization_threat_network_status, organization_threat_network_ofac, organization_threat_network_un, organization_threat_network_eu_listing, organization_threat_network_notes) VALUES
(1, 1, 'Logistics / Air Transport', 'Shell company used for procuring aircraft.', 'LEA shut down', 'Listed 2022', 'Not listed', 'Not listed', 'Seized by Mexican FGR in 2022.'),
(2, 1, 'TBML / Commerce Front', 'Agricultural export company used for trade-based money laundering.', 'Active', 'Listed 2023', 'Not listed', 'Not listed', 'OFAC designation Sept 2023.'),
(3, 3, 'Financial Services / Quasi-Bank', 'Shia microfinance institution. Functions as Hezbollah de facto banking arm.', 'Active', 'Listed 2007', 'Not listed', 'Not listed', 'Targeted by Israeli strikes in 2024.');


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PROVENANCE SEED DATA — Sources and sample citations
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO provenance.source (source_type, source_name, source_reference, source_date, source_reliability, source_credibility) VALUES
('LEA', 'DEA NDTA 2024', 'https://www.dea.gov/ndta2024', '2024-05-15', 'A', '2'),
('Report', 'CRS Report R44921', 'https://crsreports.congress.gov/R44921', '2024-09-01', 'A', '2'),
('OSINT', 'InSight Crime — Sinaloa Profile', 'https://insightcrime.org/sinaloa-cartel/', '2024-11-22', 'B', '3'),
('Report', 'FinCEN Advisory FIN-2024-A003', 'https://www.fincen.gov/advisory-2024-A003', '2024-09-15', 'A', '1'),
('LEA', 'Treasury OFAC SDN List', 'https://www.treasury.gov/sdn', '2025-01-01', 'A', '1');

-- Sample citations for Sinaloa Cartel
CALL provenance.sp_add_citation('threat_network', '1', 'estimated_membership', 1, 'high', 1, '2025-01-10', TRUE, NULL, 'Page 47, Table 3.2');
CALL provenance.sp_add_citation('threat_network', '1', 'estimated_membership', 3, 'moderate', 1, '2024-11-22', FALSE, NULL, 'Broader estimate including affiliates');
CALL provenance.sp_add_citation('threat_network', '1', 'primary_motivation', 2, 'very_high', 1, '2025-01-10', TRUE, NULL, 'Congressional research assessment');
CALL provenance.sp_add_citation('threat_network', '1', 'violence', 1, 'high', 1, '2025-01-10', TRUE, NULL, 'Chapter 3 assessment');
CALL provenance.sp_add_citation('threat_network', '1', 'fsi_exploitation', 4, 'very_high', 1, '2024-09-15', TRUE, NULL, 'ML typologies specific to CDS operations');
CALL provenance.sp_add_citation('threat_network', '1', 'geo_area_operations', 1, 'high', 1, '2025-01-10', TRUE, NULL, 'Geographic footprint analysis');

RAISE NOTICE 'Seed data loaded successfully.';
