-- =============================================================================
-- RENAME provenance.source → provenance.citation_source
-- =============================================================================
-- Eliminates naming collision with the new public.source (DD entity table).
-- provenance.citation_source = NATO Admiralty citation registry
-- public.source = intelligence case/event entity (32 DD fields)
-- =============================================================================

-- Rename the table
ALTER TABLE provenance.source RENAME TO citation_source;

-- Rename indexes (PostgreSQL auto-renames constraints but not indexes)
ALTER INDEX IF EXISTS provenance.idx_source_type RENAME TO idx_citation_source_type;
ALTER INDEX IF EXISTS provenance.idx_source_name RENAME TO idx_citation_source_name;

-- Update the FK on field_citation to point to renamed table
-- (FK name auto-follows the table rename, but let's update the comment)
COMMENT ON TABLE provenance.citation_source IS 'Central registry of all citation sources (reports, HUMINT, SIGINT, OSINT, etc.) for field-level provenance. Distinct from public.source (intelligence case entity).';

-- Update audit trigger (need to drop and recreate since table name changed)
DROP TRIGGER IF EXISTS trg_audit_source ON provenance.citation_source;
CREATE TRIGGER trg_audit_citation_source
    AFTER INSERT OR UPDATE OR DELETE ON provenance.citation_source
    FOR EACH ROW EXECUTE FUNCTION audit.fn_log_change('source_id');

-- The FK reference from provenance.field_citation → provenance.citation_source(source_id)
-- automatically follows the rename. No ALTER needed.

-- The FK reference from htf.ttp_record → provenance.citation_source(source_id)  
-- also automatically follows. No ALTER needed.
