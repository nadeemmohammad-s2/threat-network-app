import { useState, useEffect, useRef, useCallback } from "react";

// ─── API ─────────────────────────────────────────────────────────────────────
const API_BASE = typeof window !== "undefined" && window.location.port === "3000" ? "/api" : "http://localhost:3001/api";
async function api(path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, { headers: { "Content-Type": "application/json", ...opts.headers }, ...opts });
  if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `API ${r.status}`); }
  return r.json();
}
function useDebounce(v, d = 300) { const [s, set] = useState(v); useEffect(() => { const t = setTimeout(() => set(v), d); return () => clearTimeout(t); }, [v, d]); return s; }

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  bg: "#f8f9fc", surface: "#ffffff", surfaceAlt: "#f1f3f8",
  border: "#e2e6ef", borderLight: "#edf0f7", borderFocus: "#6366f1",
  text: "#1a1d26", textSec: "#5a6178", textTer: "#8b92a8", textMuted: "#b0b7cc",
  accent: "#4f46e5", accentBg: "#eef2ff",
  ok: "#059669", okBg: "#ecfdf5", warn: "#d97706", warnBg: "#fffbeb",
  bad: "#dc2626", badBg: "#fef2f2", purple: "#7c3aed",
  r: 10, rs: 6,
  sh: "0 1px 3px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.03)",
  shM: "0 4px 12px rgba(0,0,0,.06),0 1px 3px rgba(0,0,0,.04)",
  shL: "0 12px 40px rgba(0,0,0,.08),0 4px 12px rgba(0,0,0,.04)",
};

// ─── OPTIONS ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["All", "TCO", "FTO"];
const STATUSES = ["All", "Active", "Weakened", "Inactive"];
const VIOLENCE_LEVELS = ["All", "Very High", "High", "Moderate", "Low"];

const OVERVIEW_FIELDS = [
  { key: "name", label: "Name", required: true }, { key: "acronym", label: "Acronym" },
  { key: "category", label: "Category", required: true }, { key: "subcategory", label: "Subcategory", required: true },
  { key: "primary_motivation", label: "Primary Motivation", required: true }, { key: "status", label: "Status" },
  { key: "longevity", label: "Longevity" }, { key: "estimated_membership", label: "Est. Membership" },
  { key: "est_membership_notes", label: "Membership Notes", type: "text" }, { key: "est_revenue_annual", label: "Est. Annual Revenue" },
  { key: "hq_location", label: "HQ Location" }, { key: "hq_notes", label: "HQ Notes", type: "text" },
  { key: "geo_area_operations", label: "Geographic Area of Ops", required: true }, { key: "network_type", label: "Network Type", required: true },
  { key: "network_configuration", label: "Configuration" }, { key: "network_notes", label: "Network Notes", type: "text" },
  { key: "demographics", label: "Demographics" }, { key: "diaspora_operations", label: "Diaspora Operations" },
];
const MODEL_88_SECTIONS = [
  { title: "Commerce & Fronts", indicator: "commerce_front_control", notes: "commerce_notes" },
  { title: "FSI Exploitation", indicator: "fsi_exploitation", notes: "fsi_notes", booleans: [
    { key: "fsi_banking", label: "Banking" }, { key: "fsi_remittance", label: "Remittance" },
    { key: "fsi_currency_exchange", label: "Currency Exchange" }, { key: "fsi_digital_asset_exchange", label: "Digital Assets" },
    { key: "fsi_hawala", label: "Hawala" }, { key: "fsi_wealth_management", label: "Wealth Mgmt" },
    { key: "fsi_p2p", label: "P2P" }, { key: "fsi_service_loan_association", label: "S&L" },
    { key: "fsi_credit_unions", label: "Credit Unions" }, { key: "fsi_insurance_company", label: "Insurance" },
    { key: "fsi_mortgage", label: "Mortgage" }, { key: "fsi_others", label: "Others" },
  ]},
  { title: "Logistics", indicator: "logistics_control", notes: "logistics_notes" },
  { title: "Professional Services", indicator: "professional_services", notes: "professional_serv_notes" },
  { title: "Public Sector", indicator: "public_sector_facilitation", notes: "public_sector_fac_notes" },
  { title: "Political", indicator: "political_facilitation", notes: "political_notes" },
  { title: "Police / Military", indicator: "police_military_facilitation", notes: "police_military_notes" },
  { title: "Social / Communal", indicator: "social_communal_facilitation", notes: "social_notes" },
];
const OPS_FIELDS = [
  { key: "tbml", label: "Trade-Based ML" }, { key: "ml_intensity", label: "ML Intensity" },
  { key: "violence", label: "Violence" }, { key: "ofac_designation", label: "OFAC Designation" },
  { key: "fto_designation", label: "FTO Designation" }, { key: "ops_outsourcing", label: "Ops Outsourcing" },
  { key: "ops_out_notes", label: "Outsourcing Notes", type: "text" }, { key: "history_notes", label: "History Notes", type: "text" },
  { key: "general_notes", label: "General Notes", type: "text" }, { key: "colors", label: "Identifying Colors" },
  { key: "sources", label: "Sources (legacy)", type: "text", required: true },
];

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ type, size = 16, color = "currentColor" }) => {
  const s = { fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const P = {
    search: <><circle cx="11" cy="11" r="8" {...s}/><line x1="21" y1="21" x2="16.65" y2="16.65" {...s}/></>,
    back: <><polyline points="15 18 9 12 15 6" {...s}/></>,
    chevDown: <><polyline points="6 9 12 15 18 9" {...s}/></>,
    chevUp: <><polyline points="18 15 12 9 6 15" {...s}/></>,
    cite: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" {...s}/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" {...s}/></>,
    edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...s}/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...s}/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" {...s}/><line x1="6" y1="6" x2="18" y2="18" {...s}/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...s}/></>,
    users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...s}/><circle cx="9" cy="7" r="4" {...s}/><path d="M23 21v-2a4 4 0 0 0-3-3.87" {...s}/><path d="M16 3.13a4 4 0 0 1 0 7.75" {...s}/></>,
    globe: <><circle cx="12" cy="12" r="10" {...s}/><line x1="2" y1="12" x2="22" y2="12" {...s}/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...s}/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" {...s}/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" {...s}/></>,
    check: <><polyline points="20 6 9 17 4 12" {...s}/></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" {...s}/><line x1="5" y1="12" x2="19" y2="12" {...s}/></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" {...s}/><polyline points="17 21 17 13 7 13 7 21" {...s}/><polyline points="7 3 7 8 15 8" {...s}/></>,
    clock: <><circle cx="12" cy="12" r="10" {...s}/><polyline points="12 6 12 12 16 14" {...s}/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...s}/><line x1="12" y1="9" x2="12" y2="13" {...s}/><line x1="12" y1="17" x2="12.01" y2="17" {...s}/></>,
    building: <><rect x="4" y="2" width="16" height="20" rx="2" {...s}/><path d="M9 22v-4h6v4" {...s}/><line x1="8" y1="6" x2="8.01" y2="6" {...s}/><line x1="16" y1="6" x2="16.01" y2="6" {...s}/><line x1="12" y1="6" x2="12.01" y2="6" {...s}/><line x1="8" y1="10" x2="8.01" y2="10" {...s}/><line x1="16" y1="10" x2="16.01" y2="10" {...s}/><line x1="12" y1="10" x2="12.01" y2="10" {...s}/></>,
    map: <><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" {...s}/><line x1="8" y1="2" x2="8" y2="18" {...s}/><line x1="16" y1="6" x2="16" y2="22" {...s}/></>,
    target: <><circle cx="12" cy="12" r="10" {...s}/><circle cx="12" cy="12" r="6" {...s}/><circle cx="12" cy="12" r="2" {...s}/></>,
    layers: <><polygon points="12 2 2 7 12 12 22 7 12 2" {...s}/><polyline points="2 17 12 22 22 17" {...s}/><polyline points="2 12 12 17 22 12" {...s}/></>,
    file: <><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" {...s}/><polyline points="13 2 13 9 20 9" {...s}/></>,
    settings: <><circle cx="12" cy="12" r="3" {...s}/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...s}/></>,
    trash: <><polyline points="3 6 5 6 21 6" {...s}/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" {...s}/></>,
  };
  return <svg viewBox="0 0 24 24" style={{ width: size, height: size, flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}>{P[type]}</svg>;
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const confColor = (l) => ({ very_high: "#059669", high: "#10b981", moderate: "#d97706", low: "#ea580c", very_low: "#dc2626", unverified: "#9ca3af" }[l] || "#9ca3af");
const statColor = (s) => s === "Active" ? T.ok : (s === "Weakened" || s === "Arrested" || s === "LEA shut down") ? T.warn : s === "Fugitive" ? T.bad : s === "Imprisoned" ? T.purple : "#6b7280";
const vioColor = (v) => v === "Very High" ? T.bad : v === "High" ? "#ea580c" : v === "Moderate" ? T.warn : "#6b7280";

const Badge = ({ children, color, bg }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 0.2, background: bg || (color + "14"), color: color || T.textSec, whiteSpace: "nowrap" }}>{children}</span>
);
const ConfBadge = ({ level }) => <Badge color={confColor(level)}><span style={{ width: 5, height: 5, borderRadius: "50%", background: confColor(level) }}/>{level?.replace("_", " ")}</Badge>;

// ─── CITATION DOT ────────────────────────────────────────────────────────────
const CitDot = ({ citations = {}, fieldKey, onOpen }) => {
  const fc = citations[fieldKey] || [];
  if (!fc.length) return <button onClick={() => onOpen?.(fieldKey)} style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px dashed ${T.textMuted}`, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.textMuted, flexShrink: 0, marginLeft: 6 }} title="No citations">?</button>;
  const best = fc.find(c => c.is_primary_source) || fc[0];
  const dc = confColor(best.confidence_level || best.confidence);
  return <button onClick={() => onOpen?.(fieldKey)} style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${dc}`, background: dc + "18", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: dc, flexShrink: 0, marginLeft: 6 }} title={`${fc.length} citation(s)`}>{fc.length}</button>;
};

// ─── CITATION PANEL ──────────────────────────────────────────────────────────
const CitPanel = ({ fieldKey, fieldLabel, citations = {}, sources = [], onClose, onAddCitation }) => {
  const fc = citations[fieldKey] || [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source_id: "", confidence_level: "moderate", obtained_date: new Date().toISOString().split("T")[0], is_primary: false, notes: "", analyst_user_id: 1 });
  const [sub, setSub] = useState(false);
  const doSubmit = async () => {
    if (!form.source_id) return; setSub(true);
    try { await onAddCitation?.(fieldKey, { source_id: parseInt(form.source_id), confidence_level: form.confidence_level, obtained_date: form.obtained_date, is_primary: form.is_primary, notes: form.notes || null, analyst_user_id: form.analyst_user_id }); setShowForm(false); setForm({ source_id: "", confidence_level: "moderate", obtained_date: new Date().toISOString().split("T")[0], is_primary: false, notes: "", analyst_user_id: 1 }); } catch {}
    setSub(false);
  };
  const inp = { width: "100%", padding: "11px 14px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" };
  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 480, background: T.surface, borderLeft: `1px solid ${T.border}`, zIndex: 1000, display: "flex", flexDirection: "column", boxShadow: T.shL, animation: "slideIn .25s ease-out" }}>
      <div style={{ padding: "24px 28px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: T.textTer, marginBottom: 4, fontWeight: 600 }}>Field Provenance</div><div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{fieldLabel || fieldKey}</div></div>
        <button onClick={onClose} style={{ background: T.surfaceAlt, border: "none", color: T.textSec, cursor: "pointer", padding: 6, borderRadius: T.rs, display: "flex" }}><Icon type="x" size={16}/></button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {!fc.length && !showForm ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: T.warnBg, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><Icon type="alert" size={24} color={T.warn}/></div>
            <div style={{ color: T.text, fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Intelligence Gap</div>
            <div style={{ color: T.textTer, fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>No citations exist for this field.</div>
            <button onClick={() => setShowForm(true)} style={{ padding: "12px 24px", background: T.accent, color: "#fff", border: "none", borderRadius: T.rs, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon type="plus" size={14} color="#fff"/> Add Citation</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {fc.map((c, i) => (
              <div key={c.field_citation_id || i} style={{ background: T.surfaceAlt, borderRadius: T.r, padding: 16, border: c.is_primary_source ? `2px solid ${T.accent}` : `1px solid ${T.borderLight}` }}>
                {c.is_primary_source && <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: T.accent, fontWeight: 700, marginBottom: 8 }}>★ Primary Source</div>}
                <div style={{ fontWeight: 600, color: T.text, marginBottom: 6, fontSize: 14 }}>{c.source_name}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}><Badge color={T.textSec} bg={T.surfaceAlt}>{c.source_type}</Badge><ConfBadge level={c.confidence_level}/></div>
                {c.attribution_notes && <div style={{ fontSize: 14, color: T.textSec, marginBottom: 10, lineHeight: 1.65 }}>{c.attribution_notes}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.textTer }}><span>Analyst: {c.analyst_user_id}</span><span>{c.obtained_date}</span></div>
              </div>
            ))}
            {showForm ? (
              <div style={{ background: T.surface, borderRadius: T.r, padding: 16, border: `2px solid ${T.accent}` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 16 }}>New Citation</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={lbl}>Source</label><select value={form.source_id} onChange={e => setForm(p => ({...p, source_id: e.target.value}))} style={{...inp, cursor: "pointer"}}><option value="">Select a source...</option>{sources.map(s => <option key={s.source_id} value={s.source_id}>{s.source_name} ({s.source_type})</option>)}</select></div>
                  <div><label style={lbl}>Confidence</label><select value={form.confidence_level} onChange={e => setForm(p => ({...p, confidence_level: e.target.value}))} style={{...inp, cursor: "pointer"}}>{["very_high","high","moderate","low","very_low","unverified"].map(l => <option key={l} value={l}>{l.replace("_"," ")}</option>)}</select></div>
                  <div><label style={lbl}>Date Obtained</label><input type="date" value={form.obtained_date} onChange={e => setForm(p => ({...p, obtained_date: e.target.value}))} style={inp}/></div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={form.is_primary} onChange={e => setForm(p => ({...p, is_primary: e.target.checked}))}/><span style={{ fontSize: 14, color: T.textSec }}>Primary source</span></label>
                  <div><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={3} style={{...inp, resize: "vertical"}}/></div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowForm(false)} style={{ padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Cancel</button>
                    <button onClick={doSubmit} disabled={!form.source_id || sub} style={{ padding: "12px 22px", background: form.source_id ? T.accent : T.surfaceAlt, border: "none", borderRadius: T.rs, color: "#fff", cursor: form.source_id ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: sub ? .6 : 1 }}>{sub ? "Saving..." : "Save Citation"}</button>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowForm(true)} style={{ padding: "12px 20px", background: "transparent", color: T.accent, border: `1.5px dashed ${T.border}`, borderRadius: T.rs, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}><Icon type="plus" size={14} color={T.accent}/> Add {fc.length ? "Another " : ""}Citation</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── FIELD ROW ───────────────────────────────────────────────────────────────
const FieldRow = ({ field, value, citations, onCiteClick, isEditing, editValues, onEditChange }) => {
  const dv = value === true ? "Yes" : value === false ? "No" : value;
  const inp = { width: "100%", padding: "11px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ width: 200, flexShrink: 0, paddingTop: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: T.textTer }}>{field.label}</span>
        {field.required && <span style={{ color: T.bad, marginLeft: 3 }}>*</span>}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 8 }}>
        {isEditing ? (field.type === "text" ? <textarea value={editValues[field.key] ?? value ?? ""} onChange={e => onEditChange(field.key, e.target.value)} rows={3} style={{...inp, resize: "vertical"}}/> : <input value={editValues[field.key] ?? value ?? ""} onChange={e => onEditChange(field.key, e.target.value)} style={inp}/>) : (
          <div style={{ fontSize: 15, color: dv ? T.text : T.textMuted, lineHeight: 1.65, flex: 1 }}>{dv || "—"}</div>
        )}
        <CitDot citations={citations} fieldKey={field.key} onOpen={onCiteClick}/>
      </div>
    </div>
  );
};

// ─── TABS ────────────────────────────────────────────────────────────────────
const OverviewTab = ({ network, citations, onCiteClick, isEditing, editValues, onEditChange }) => <div>{OVERVIEW_FIELDS.map(f => <FieldRow key={f.key} field={f} value={network[f.key]} citations={citations} onCiteClick={onCiteClick} isEditing={isEditing} editValues={editValues} onEditChange={onEditChange}/>)}</div>;
const OpsTab = ({ network, citations, onCiteClick, isEditing, editValues, onEditChange }) => <div>{OPS_FIELDS.map(f => <FieldRow key={f.key} field={f} value={network[f.key]} citations={citations} onCiteClick={onCiteClick} isEditing={isEditing} editValues={editValues} onEditChange={onEditChange}/>)}</div>;

const Model88Tab = ({ network, citations, onCiteClick, isEditing, editValues, onEditChange }) => {
  const [open, setOpen] = useState({});
  const lvC = (v) => !v || v === "None" ? T.textMuted : v.includes("Extensive") || v.includes("High") ? T.bad : v.includes("Moderate") ? T.warn : T.ok;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {MODEL_88_SECTIONS.map((sec, i) => {
        const val = network[sec.indicator], isO = open[i];
        return (
          <div key={i} style={{ background: T.surface, borderRadius: T.r, border: `1px solid ${T.borderLight}`, overflow: "hidden" }}>
            <button onClick={() => setOpen(p => ({...p, [i]: !p[i]}))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: lvC(val), flexShrink: 0 }}/><span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: T.text }}>{sec.title}</span>
              <Badge color={lvC(val)}>{val || "Not assessed"}</Badge><Icon type={isO ? "chevUp" : "chevDown"} size={16} color={T.textTer}/>
            </button>
            {isO && <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${T.borderLight}` }}>
              <FieldRow field={{ key: sec.indicator, label: "Level" }} value={val} citations={citations} onCiteClick={onCiteClick} isEditing={isEditing} editValues={editValues} onEditChange={onEditChange}/>
              <FieldRow field={{ key: sec.notes, label: "Notes", type: "text" }} value={network[sec.notes]} citations={citations} onCiteClick={onCiteClick} isEditing={isEditing} editValues={editValues} onEditChange={onEditChange}/>
              {sec.booleans && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>{sec.booleans.map(b => (
                <span key={b.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 20, fontSize: 13, fontWeight: 500, background: network[b.key] ? T.okBg : T.surfaceAlt, color: network[b.key] ? T.ok : T.textMuted, border: `1px solid ${network[b.key] ? T.ok+"30" : T.borderLight}` }}>{network[b.key] && <Icon type="check" size={12} color={T.ok}/>}{b.label}</span>
              ))}</div>}
            </div>}
          </div>
        );
      })}
    </div>
  );
};

const SecHdr = ({ icon, title, count }) => <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 }}><Icon type={icon} size={16} color={T.textTer}/><span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: T.textTer, fontWeight: 700 }}>{title}</span>{count != null && <span style={{ fontSize: 12, color: T.textMuted }}>({count})</span>}</div>;
const Empty = ({ label }) => <div style={{ padding: "20px 0", textAlign: "center", color: T.textMuted, fontSize: 14, fontStyle: "italic" }}>No {label} recorded.</div>;
const Card = ({ children, hl }) => <div style={{ background: T.surface, borderRadius: T.r, border: `1px solid ${hl ? T.accent+"40" : T.borderLight}`, padding: 16, boxShadow: T.sh }}>{children}</div>;

const RelationshipsTab = ({ network }) => {
  const { relationships=[], organizations=[], persons=[], countries=[], threat_boundaries=[], threat_subclasses=[], linked_sources=[] } = network;
  const rc = t => t==="Enemy"?T.bad:t==="Alliance"?T.ok:t==="Competitor"?T.warn:T.accent;
  const lc = v => v==="Extensive"?T.bad:v==="High"||v==="Moderate"?T.warn:T.ok;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div><SecHdr icon="link" title="Relationships" count={relationships.length}/>{!relationships.length?<Empty label="relationships"/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>{relationships.map(r=><Card key={r.threat_networks_relationship_id}><div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}><div style={{width:32,height:32,borderRadius:8,background:rc(r.relationship_type)+"12",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon type="link" size={14} color={rc(r.relationship_type)}/></div><div style={{flex:1}}><div style={{fontWeight:600,color:T.text,fontSize:14}}>{r.target_name}</div></div><Badge color={rc(r.relationship_type)}>{r.relationship_type}</Badge>{r.formal_relationship_ind&&<Badge color={T.textSec} bg={T.surfaceAlt}>Formal</Badge>}</div>{r.notes&&<div style={{fontSize:13,color:T.textSec,lineHeight:1.6}}>{r.notes}</div>}</Card>)}</div>}</div>
      <div><SecHdr icon="building" title="Organizations" count={organizations.length}/>{!organizations.length?<Empty label="organizations"/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>{organizations.map(o=><Card key={o.organization_threat_network_id}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:600,color:T.text,fontSize:14}}>{o.organization_threat_network_function||"Organization"}</span><Badge color={statColor(o.organization_threat_network_status)}>{o.organization_threat_network_status}</Badge></div>{o.organization_threat_network_function_notes&&<div style={{fontSize:13,color:T.textSec,lineHeight:1.6}}>{o.organization_threat_network_function_notes}</div>}</Card>)}</div>}</div>
      <div><SecHdr icon="users" title="Persons" count={persons.length}/>{!persons.length?<Empty label="persons"/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>{persons.map(p=><Card key={p.person_threat_network_id}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:36,height:36,borderRadius:"50%",background:T.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon type="users" size={16} color={T.textTer}/></div><div style={{flex:1}}><div style={{fontWeight:600,color:T.text,fontSize:14}}>Person {p.person_interest_id}</div><div style={{fontSize:13,color:T.textSec}}>{p.person_threat_network_role}</div></div><Badge color={statColor(p.person_threat_network_status)}>{p.person_threat_network_status}</Badge></div></Card>)}</div>}</div>
      <div><SecHdr icon="globe" title="Countries" count={countries.length}/>{!countries.length?<Empty label="countries"/>:<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{countries.map(c=><Card key={c.threat_network_country_id}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontWeight:600,color:T.text,fontSize:14}}>Country {c.country_id}</span><Badge color={lc(c.threat_network_country_presence_level)}>{c.threat_network_country_presence_level}</Badge></div><div style={{fontSize:12,color:T.textTer}}>{c.threat_network_country_status}</div>{c.threat_network_country_presence_notes&&<div style={{fontSize:12,color:T.textSec,marginTop:4,lineHeight:1.5}}>{c.threat_network_country_presence_notes}</div>}</Card>)}</div>}</div>
      <div><SecHdr icon="map" title="Threat Boundaries" count={threat_boundaries.length}/>{!threat_boundaries.length?<Empty label="boundaries"/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>{threat_boundaries.map(b=><Card key={b.threat_network_threat_boundary_id}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:600,color:T.text,fontSize:14}}>Boundary {b.threat_boundary_id}</span><Badge color={T.warn}>Strategic: {b.threat_market_threat_boundary_strategic_value}</Badge></div>{b.threat_market_threat_boundary_notes&&<div style={{fontSize:13,color:T.textSec,lineHeight:1.6}}>{b.threat_market_threat_boundary_notes}</div>}</Card>)}</div>}</div>
      <div><SecHdr icon="target" title="Threat Subclasses" count={threat_subclasses.length}/>{!threat_subclasses.length?<Empty label="subclasses"/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>{threat_subclasses.map(ts=><Card key={ts.id_jt_tn_im}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:600,color:T.text,fontSize:14}}>Subclass {ts.threat_subclass_id}</span>{ts.threat_network_threat_subclass_value&&<span style={{fontSize:13,fontWeight:600,color:T.ok}}>{ts.threat_network_threat_subclass_value}</span>}</div>{ts.threat_network_threat_subclass_notes&&<div style={{fontSize:13,color:T.textSec,lineHeight:1.6}}>{ts.threat_network_threat_subclass_notes}</div>}</Card>)}</div>}</div>
      <div><SecHdr icon="file" title="Linked Sources" count={linked_sources.length}/>{!linked_sources.length?<Empty label="linked sources"/>:<div style={{display:"flex",flexWrap:"wrap",gap:8}}>{linked_sources.map(s=><div key={s.source_threat_network_id} style={{background:T.surface,borderRadius:T.r,border:`1px solid ${T.borderLight}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}><Icon type="file" size={14} color={T.textTer}/><span style={{fontSize:13,fontWeight:600,color:T.text}}>{s.source_name||`Source ${s.source_id}`}</span>{s.source_type&&<Badge color={T.textSec} bg={T.surfaceAlt}>{s.source_type}</Badge>}</div>)}</div>}</div>
    </div>
  );
};

// ─── CITATION MODAL ──────────────────────────────────────────────────────────
const CitModal = ({ changedFields, onSave, onSkip }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <div style={{ background: T.surface, borderRadius: 16, padding: 32, width: 500, boxShadow: T.shL }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 50, height: 50, borderRadius: 12, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type="cite" size={22} color={T.accent}/></div>
        <div><div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Cite Your Sources</div><div style={{ fontSize: 14, color: T.textSec }}>Add provenance for changed fields</div></div>
      </div>
      <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 6 }}>{changedFields.map(f => <Badge key={f} color={T.accent}>{f.replace(/_/g, " ")}</Badge>)}</div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button onClick={onSkip} style={{ padding: "12px 24px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Save Without Citing</button>
        <button onClick={onSave} style={{ padding: "12px 24px", background: T.accent, border: "none", borderRadius: T.rs, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Icon type="cite" size={14} color="#fff"/> Add Citations</button>
      </div>
    </div>
  </div>
);

// ─── ADD NETWORK MODAL ───────────────────────────────────────────────────────
const AddNetworkModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({ name: "", acronym: "", category: "TCO", subcategory: "", primary_motivation: "", geo_area_operations: "", network_type: "", sources: "", status: "Active" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(p => ({...p, [k]: v}));
  const inp = { width: "100%", padding: "14px 16px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" };
  const ok = form.name && form.category && form.subcategory && form.primary_motivation && form.geo_area_operations && form.network_type && form.sources;

  const handleCreate = async () => {
    setSaving(true); setError(null);
    try {
      const list = await api("/threat-networks?limit=1000");
      const maxId = Math.max(0, ...list.data.map(n => n.threat_network_id));
      const result = await api(`/threat-networks/${maxId + 1}`, { method: "PUT", body: JSON.stringify({ ...form, change_reason: "Initial creation", user_id: 1 }) });
      onCreated(result);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 600, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: T.shL, overflow: "hidden" }}>
        <div style={{ padding: "28px 32px 24px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type="plus" size={22} color={T.accent}/></div>
            <div><div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>New Threat Network</div><div style={{ fontSize: 14, color: T.textSec }}>Create a new entity record</div></div>
          </div>
          <button onClick={onClose} style={{ background: T.surfaceAlt, border: "none", color: T.textSec, cursor: "pointer", padding: 6, borderRadius: T.rs, display: "flex" }}><Icon type="x" size={16}/></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Name <span style={{ color: T.bad }}>*</span></label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Sinaloa Cartel" style={inp}/></div>
            <div><label style={lbl}>Acronym</label><input value={form.acronym} onChange={e => set("acronym", e.target.value)} placeholder="e.g. CDS" style={inp}/></div>
            <div><label style={lbl}>Category <span style={{ color: T.bad }}>*</span></label><select value={form.category} onChange={e => set("category", e.target.value)} style={{...inp, cursor: "pointer"}}><option value="TCO">TCO</option><option value="FTO">FTO</option></select></div>
            <div><label style={lbl}>Subcategory <span style={{ color: T.bad }}>*</span></label><input value={form.subcategory} onChange={e => set("subcategory", e.target.value)} placeholder="e.g. Drug Trafficking" style={inp}/></div>
            <div><label style={lbl}>Primary Motivation <span style={{ color: T.bad }}>*</span></label><input value={form.primary_motivation} onChange={e => set("primary_motivation", e.target.value)} placeholder="e.g. Financial" style={inp}/></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Geographic Area of Operations <span style={{ color: T.bad }}>*</span></label><input value={form.geo_area_operations} onChange={e => set("geo_area_operations", e.target.value)} placeholder="e.g. North America, Central America" style={inp}/></div>
            <div><label style={lbl}>Network Type <span style={{ color: T.bad }}>*</span></label><input value={form.network_type} onChange={e => set("network_type", e.target.value)} placeholder="e.g. Hybrid" style={inp}/></div>
            <div><label style={lbl}>Status</label><input value={form.status} onChange={e => set("status", e.target.value)} placeholder="e.g. Active" style={inp}/></div>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Sources <span style={{ color: T.bad }}>*</span></label><textarea value={form.sources} onChange={e => set("sources", e.target.value)} placeholder="Source references..." rows={2} style={{...inp, resize: "vertical"}}/></div>
          </div>
          {error && <div style={{ marginTop: 16, padding: "14px 20px", background: T.badBg, borderRadius: T.rs, color: T.bad, fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: "20px 32px", borderTop: `1px solid ${T.borderLight}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "12px 24px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleCreate} disabled={!ok || saving} style={{ padding: "12px 24px", background: ok ? T.accent : T.surfaceAlt, border: "none", borderRadius: T.rs, color: ok ? "#fff" : T.textMuted, cursor: ok ? "pointer" : "not-allowed", fontWeight: 600, fontSize: 14, opacity: saving ? .6 : 1, display: "flex", alignItems: "center", gap: 8 }}>{saving ? "Creating..." : <><Icon type="plus" size={14} color={ok ? "#fff" : T.textMuted}/> Create Network</>}</button>
        </div>
      </div>
    </div>
  );
};

// ─── DETAIL VIEW ─────────────────────────────────────────────────────────────
const DTABS = [{ key: "overview", label: "Overview", icon: "shield" }, { key: "model88", label: "8/8 Model", icon: "layers" }, { key: "ops", label: "Operations", icon: "alert" }, { key: "relationships", label: "Relationships & Links", icon: "link" }];

const DetailView = ({ networkSummary, onBack }) => {
  const [tab, setTab] = useState("overview");
  const [citPanel, setCitPanel] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editVals, setEditVals] = useState({});
  const [showCitModal, setShowCitModal] = useState(false);
  const [net, setNet] = useState(networkSummary);
  const [cits, setCits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [d, p, s] = await Promise.all([api(`/threat-networks/${networkSummary.threat_network_id}`), api(`/provenance/citations/threat_network/${networkSummary.threat_network_id}`), api("/provenance/sources")]);
        if (!c) { setNet(d); setCits(p.citations || {}); setSources(s || []); }
      } catch { if (!c) setCits({}); }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [networkSummary.threat_network_id]);

  const handleSave = () => { Object.keys(editVals).length ? setShowCitModal(true) : setIsEditing(false); };
  const execSave = async (withCit) => {
    setSaving(true);
    try {
      const p = {};
      for (const f of [...OVERVIEW_FIELDS, ...OPS_FIELDS]) p[f.key] = editVals[f.key] ?? net[f.key] ?? "";
      for (const sec of MODEL_88_SECTIONS) { p[sec.indicator] = editVals[sec.indicator] ?? net[sec.indicator] ?? ""; p[sec.notes] = editVals[sec.notes] ?? net[sec.notes] ?? ""; if (sec.booleans) for (const b of sec.booleans) p[b.key] = editVals[b.key] ?? net[b.key] ?? false; }
      p.change_reason = "Updated via UI"; p.user_id = 1;
      await api(`/threat-networks/${net.threat_network_id}`, { method: "PUT", body: JSON.stringify(p) });
      const d = await api(`/threat-networks/${net.threat_network_id}`);
      setNet(d); setEditVals({}); setIsEditing(false); setShowCitModal(false);
      if (withCit && Object.keys(editVals).length) setCitPanel(Object.keys(editVals)[0]);
    } catch (err) { alert("Save failed: " + err.message); }
    finally { setSaving(false); }
  };
  const addCit = async (fk, data) => {
    try {
      await api("/provenance/citations", { method: "POST", body: JSON.stringify({ table_name: "threat_network", record_pk: String(net.threat_network_id), field_name: fk, ...data }) });
      const p = await api(`/provenance/citations/threat_network/${net.threat_network_id}`);
      setCits(p.citations || {});
    } catch (err) { alert("Citation failed: " + err.message); }
  };

  const sc = statColor(net.status), vc = vioColor(net.violence);
  const totalCitable = OVERVIEW_FIELDS.length + MODEL_88_SECTIONS.length * 2 + OPS_FIELDS.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* Header */}
      <div style={{ padding: "24px 36px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.textTer, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}><Icon type="back" size={18}/> Back</button>
          <div style={{ flex: 1 }}/>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} disabled={loading} style={{ padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, cursor: loading ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, opacity: loading ? .5 : 1 }}><Icon type="edit" size={14}/> Edit</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setIsEditing(false); setEditVals({}); }} disabled={saving} style={{ padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "12px 22px", background: T.accent, border: "none", borderRadius: T.rs, color: "#fff", cursor: saving ? "not-allowed" : "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, opacity: saving ? .6 : 1 }}><Icon type="save" size={14} color="#fff"/> {saving ? "Saving..." : "Save"}</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
          <div style={{ width: 62, height: 62, borderRadius: 14, background: `linear-gradient(135deg, ${sc}20, ${sc}08)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${sc}25` }}><Icon type="shield" size={28} color={sc}/></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.text, marginBottom: 4, letterSpacing: -.3 }}>{net.name}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {net.acronym && <Badge color={T.textSec} bg={T.surfaceAlt}>{net.acronym}</Badge>}
              <Badge color={T.textSec} bg={T.surfaceAlt}>{net.category}</Badge>
              <Badge color={sc}>{net.status}</Badge>
              <Badge color={vc}>Violence: {net.violence}</Badge>
              {net.version_number && <Badge color={T.textTer} bg={T.surfaceAlt}>v{net.version_number}</Badge>}
            </div>
            <CoverageBar citations={cits} totalFields={totalCitable}/>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {DTABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "12px 22px", background: tab === t.key ? T.accentBg : "transparent", border: "none", borderRadius: T.rs, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, color: tab === t.key ? T.accent : T.textTer, display: "flex", alignItems: "center", gap: 8, transition: "all .15s" }}>
              <Icon type={t.icon} size={15} color={tab === t.key ? T.accent : T.textTer}/>{t.label}
            </button>
          ))}
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
        {loading ? <div style={{ textAlign: "center", padding: 48, color: T.textTer }}><div style={{ fontSize: 15, fontWeight: 600 }}>Loading...</div></div> : (<>
          {isEditing && <div style={{ marginBottom: 16, padding: "14px 20px", background: T.accentBg, borderRadius: T.r, border: `1px solid ${T.accent}30`, display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: T.accent }}><Icon type="edit" size={16} color={T.accent}/><span><strong>Edit Mode</strong> — modify fields below. You'll be prompted to cite sources on save.</span></div>}
          {tab === "overview" && <OverviewTab network={net} citations={cits} onCiteClick={setCitPanel} isEditing={isEditing} editValues={editVals} onEditChange={(k,v) => setEditVals(p => ({...p,[k]:v}))}/>}
          {tab === "model88" && <Model88Tab network={net} citations={cits} onCiteClick={setCitPanel} isEditing={isEditing} editValues={editVals} onEditChange={(k,v) => setEditVals(p => ({...p,[k]:v}))}/>}
          {tab === "ops" && <OpsTab network={net} citations={cits} onCiteClick={setCitPanel} isEditing={isEditing} editValues={editVals} onEditChange={(k,v) => setEditVals(p => ({...p,[k]:v}))}/>}
          {tab === "relationships" && <RelationshipsTab network={net}/>}
        </>)}
      </div>
      {/* Citation Panel */}
      {citPanel && <><div onClick={() => setCitPanel(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.15)", zIndex: 999 }}/><CitPanel fieldKey={citPanel} fieldLabel={citPanel} citations={cits} sources={sources} onClose={() => setCitPanel(null)} onAddCitation={addCit}/></>}
      {showCitModal && <CitModal changedFields={Object.keys(editVals)} onSave={() => execSave(true)} onSkip={() => execSave(false)}/>}
    </div>
  );
};

const CoverageBar = ({ citations, totalFields }) => {
  const cited = Object.keys(citations).filter(k => citations[k]?.length > 0).length;
  const pct = totalFields > 0 ? Math.round((cited / totalFields) * 100) : 0;
  const color = pct > 60 ? T.ok : pct > 30 ? T.warn : T.bad;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1, height: 4, background: T.surfaceAlt, borderRadius: 2, overflow: "hidden", maxWidth: 240 }}><div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2, transition: "width .5s" }}/></div>
      <span style={{ fontSize: 13, fontWeight: 600, color, whiteSpace: "nowrap" }}>{cited}/{totalFields} cited ({pct}%)</span>
    </div>
  );
};

// ─── LIST VIEW ───────────────────────────────────────────────────────────────
const ListView = ({ onSelect }) => {
  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState("All");
  const [statF, setStatF] = useState("All");
  const [vioF, setVioF] = useState("All");
  const [nets, setNets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const searchRef = useRef(null);
  const dSearch = useDebounce(search, 300);

  const fetchNets = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (dSearch) p.set("search", dSearch);
      if (catF !== "All") p.set("category", catF);
      if (statF !== "All") p.set("status", statF);
      if (vioF !== "All") p.set("violence", vioF);
      const qs = p.toString();
      const r = await api(`/threat-networks${qs ? "?" + qs : ""}`);
      setNets(r.data || []); setTotal(r.total || 0);
    } catch (err) { setError(err.message); setNets([]); }
    finally { setLoading(false); }
  }, [dSearch, catF, statF, vioF]);

  useEffect(() => { fetchNets(); }, [fetchNets]);
  useEffect(() => { searchRef.current?.focus(); }, []);

  const FilterDD = ({ label, value, options, onChange }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: T.textTer }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rs, padding: "8px 32px 8px 12px", color: T.text, fontSize: 14, cursor: "pointer", fontFamily: "inherit", outline: "none", appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%238b92a8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center", backgroundSize: 12 }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "28px 36px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type="shield" size={22} color={T.accent}/></div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: 0, letterSpacing: -.5 }}>Threat Networks</h1>
            <div style={{ fontSize: 13, color: T.textTer }}>{loading ? "Loading..." : `${total} entities tracked`}</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding: "11px 22px", background: T.accent, color: "#fff", border: "none", borderRadius: T.rs, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 2px 8px ${T.accent}40` }}>
            <Icon type="plus" size={15} color="#fff"/> New Network
          </button>
        </div>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><Icon type="search" size={16} color={T.textMuted}/></div>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, acronym, category, or location..." style={{ width: "100%", boxSizing: "border-box", padding: "14px 18px 14px 44px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r, color: T.text, fontSize: 15, fontFamily: "inherit", outline: "none", transition: "border-color .15s" }} onFocus={e => e.target.style.borderColor = T.borderFocus} onBlur={e => e.target.style.borderColor = T.border}/>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <FilterDD label="Category" value={catF} options={CATEGORIES} onChange={setCatF}/>
          <FilterDD label="Status" value={statF} options={STATUSES} onChange={setStatF}/>
          <FilterDD label="Violence" value={vioF} options={VIOLENCE_LEVELS} onChange={setVioF}/>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "20px 36px" }}>
        {error ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ color: T.bad, fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
            <div style={{ color: T.textTer, fontSize: 13 }}>{error}</div>
            <button onClick={fetchNets} style={{ marginTop: 16, padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, cursor: "pointer", fontSize: 13 }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: 48, color: T.textTer }}><div style={{ fontSize: 15, fontWeight: 600 }}>Loading threat networks...</div></div>
        ) : !nets.length ? (
          <div style={{ textAlign: "center", padding: 48, color: T.textTer }}>No threat networks match your filters.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2.5fr .8fr 1fr 1fr 1fr .6fr", gap: 16, padding: "12px 22px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: T.textTer }}>
              <span>Name</span><span>Category</span><span>Status</span><span>Violence</span><span>HQ</span><span>Ver.</span>
            </div>
            {nets.map(n => {
              const sC = statColor(n.status), vC = vioColor(n.violence);
              return (
                <button key={n.threat_network_id} onClick={() => onSelect(n)} style={{ display: "grid", gridTemplateColumns: "2.5fr .8fr 1fr 1fr 1fr .6fr", gap: 16, padding: "16px 20px", background: T.surface, border: `1px solid ${T.borderLight}`, borderRadius: T.r, cursor: "pointer", textAlign: "left", color: T.text, fontSize: 14, fontFamily: "inherit", transition: "all .15s", alignItems: "center", boxShadow: T.sh }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent + "40"; e.currentTarget.style.boxShadow = T.shM; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderLight; e.currentTarget.style.boxShadow = T.sh; }}>
                  <div><div style={{ fontWeight: 600, marginBottom: 2 }}>{n.name}</div>{n.acronym && <div style={{ fontSize: 12, color: T.textTer }}>{n.acronym}</div>}</div>
                  <Badge color={T.textSec} bg={T.surfaceAlt}>{n.category}</Badge>
                  <Badge color={sC}>{n.status}</Badge>
                  <Badge color={vC}>{n.violence}</Badge>
                  <span style={{ fontSize: 13, color: T.textSec }}>{n.hq_location?.split(",")[0]}</span>
                  <span style={{ fontSize: 13, color: T.textTer }}>v{n.version_number}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      {showAdd && <AddNetworkModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); fetchNets(); }}/>}
    </div>
  );
};


// ─── ENTITY FIELD DEFINITIONS ────────────────────────────────────────────────
const ENTITY_DEFS = {
  persons: {
    key: "persons", apiPath: "persons", label: "Persons of Interest", singular: "Person",
    icon: "users", pk: "person_interest_id",
    columns: [
      { key: "name", label: "Name", list: true },
      { key: "alias_primary", label: "Alias", list: true },
      { key: "status", label: "Status", list: true, badge: true },
      { key: "primary_role", label: "Role", list: true },
      { key: "hierarchy", label: "Hierarchy" },
    ],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "alias_primary", label: "Primary Alias" },
      { key: "alias_secondary", label: "Secondary Alias" }, { key: "dob", label: "Date of Birth" },
      { key: "pob", label: "Place of Birth" }, { key: "nationality_type", label: "Nationality Type" },
      { key: "geographic_nationality", label: "Nationality" }, { key: "nationality_2", label: "Second Nationality" },
      { key: "por_primary", label: "Primary Residence" }, { key: "por_secondary", label: "Secondary Residence" },
      { key: "status", label: "Status" }, { key: "primary_role", label: "Primary Role" },
      { key: "secondary_role", label: "Secondary Role" }, { key: "hierarchy", label: "Hierarchy" },
      { key: "profession", label: "Profession" }, { key: "criminal_history", label: "Criminal History" },
      { key: "criminal_hist_notes", label: "Criminal History Notes", type: "text" },
      { key: "asset_control", label: "Asset Control" }, { key: "asset_types_notes", label: "Asset Notes", type: "text" },
      { key: "ofac_listed", label: "OFAC Listed" }, { key: "ofac_notes", label: "OFAC Notes", type: "text" },
      { key: "un_listed", label: "UN Listed" }, { key: "un_notes", label: "UN Notes", type: "text" },
      { key: "eu_listed", label: "EU Listed" }, { key: "eu_notes", label: "EU Notes", type: "text" },
    ],
    createFields: ["name", "alias_primary", "status", "primary_role", "hierarchy", "geographic_nationality", "dob"],
  },
  organizations: {
    key: "organizations", apiPath: "organizations", label: "Organizations", singular: "Organization",
    icon: "building", pk: "organization_interest_id",
    columns: [
      { key: "name", label: "Name", list: true },
      { key: "type", label: "Type", list: true },
      { key: "status", label: "Status", list: true, badge: true },
      { key: "use", label: "Use", list: true },
    ],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "type", label: "Type" },
      { key: "acronym", label: "Acronym" }, { key: "dba", label: "DBA" },
      { key: "legal_nm", label: "Legal Name" }, { key: "product_type", label: "Product Type" },
      { key: "use", label: "Use by TN" }, { key: "notes", label: "Notes", type: "text" },
      { key: "foundation", label: "Foundation Date" }, { key: "status", label: "Status" },
      { key: "if_high_risk", label: "High Risk?" }, { key: "if_risk_notes", label: "Risk Notes", type: "text" },
      { key: "terrorism_risk", label: "Terrorism Risk" }, { key: "terrorism_notes", label: "Terrorism Notes", type: "text" },
      { key: "supply", label: "Supply", type: "text" },
      { key: "fi_sup_primary", label: "FI Support Primary" }, { key: "fi_sup_prim_notes", label: "FI Support Notes", type: "text" },
      { key: "logistics_support", label: "Logistics Support", type: "text" },
      { key: "professional_ser", label: "Professional Services", type: "text" },
      { key: "pub_sec_facilitation", label: "Public Sector Facilitation", type: "text" },
      { key: "political_facilitation", label: "Political Facilitation", type: "text" },
      { key: "lea_military_facilitation", label: "LEA/Military Facilitation", type: "text" },
      { key: "social_facilitation", label: "Social Facilitation", type: "text" },
      { key: "sanctions", label: "Sanctions", type: "text" },
    ],
    createFields: ["name", "type", "status", "use"],
  },
  countries: {
    key: "countries", apiPath: "countries", label: "Countries", singular: "Country",
    icon: "globe", pk: "country_id",
    columns: [
      { key: "name", label: "Name", list: true },
      { key: "iso_alpha3", label: "ISO", list: true },
      { key: "capital", label: "Capital", list: true },
      { key: "type_government", label: "Government", list: true },
    ],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "capital", label: "Capital" },
      { key: "type_government", label: "Government Type" }, { key: "governance", label: "Governance" },
      { key: "m49_code", label: "M49 Code", required: true }, { key: "iso_alpha3", label: "ISO Alpha-3", required: true },
      { key: "general_notes", label: "General Notes", type: "text" },
      { key: "hdi", label: "HDI" }, { key: "gini", label: "Gini" },
      { key: "fatf", label: "FATF", type: "text" }, { key: "juim", label: "JUIM" },
      { key: "basel_index", label: "Basel Index" }, { key: "wb_income", label: "WB Income" },
      { key: "ofac_sanctioned", label: "OFAC Sanctioned", type: "text" }, { key: "ofac_notes", label: "OFAC Notes", type: "text" },
      { key: "un_sanctions", label: "UN Sanctions", type: "text" }, { key: "eu_sanctions", label: "EU Sanctions", type: "text" },
      { key: "uk_sanctions", label: "UK Sanctions", type: "text" },
      { key: "ti_index", label: "TI Index" }, { key: "pci", label: "PCI" }, { key: "crf", label: "CRF" },
      { key: "oecd_membership", label: "OECD Membership" }, { key: "oecd_longevity", label: "OECD Longevity" },
    ],
    createFields: ["name", "m49_code", "iso_alpha3", "capital", "type_government"],
  },
  boundaries: {
    key: "boundaries", apiPath: "boundaries", label: "Threat Boundaries", singular: "Boundary",
    icon: "map", pk: "threat_boundary_id",
    columns: [
      { key: "name", label: "Name", list: true },
      { key: "type", label: "Type", list: true },
    ],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "type", label: "Type", required: true },
      { key: "description", label: "Description", type: "text", required: true },
      { key: "definition", label: "Definition", type: "text", required: true },
    ],
    createFields: ["name", "type", "description", "definition"],
  },
  subclasses: {
    key: "subclasses", apiPath: "subclasses", label: "Threat Subclasses", singular: "Subclass",
    icon: "target", pk: "threat_subclass_id",
    columns: [
      { key: "name", label: "Name", list: true },
      { key: "type", label: "Type", list: true },
      { key: "estimated_value", label: "Est. Value", list: true },
      { key: "commodity_flow_geography", label: "Flow", list: true },
    ],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "type", label: "Type (Product/Service)", required: true },
      { key: "threat_class_id", label: "Threat Class ID", required: true },
      { key: "customer_base", label: "Customer Base" }, { key: "cust_base_notes", label: "Customer Notes", type: "text" },
      { key: "raw_material_notes", label: "Raw Material Notes", type: "text" },
      { key: "manufacture_facility", label: "Manufacture Facility" }, { key: "man_facility_notes", label: "Facility Notes", type: "text" },
      { key: "commodity_flow_geography", label: "Commodity Flow" }, { key: "primary_market_geography", label: "Primary Market" },
      { key: "primary_market_geo_notes", label: "Market Notes", type: "text" },
      { key: "estimated_value", label: "Estimated Value" }, { key: "esti_value_notes", label: "Value Notes", type: "text" },
      { key: "logistics_complexity", label: "Logistics Complexity" }, { key: "logistics_perishability", label: "Perishability" },
      { key: "commodity_environment_control", label: "Environment Control" },
      { key: "commodity_smuggling_tactics", label: "Smuggling Tactics" }, { key: "typical_front_setup", label: "Front Setup Complexity" },
    ],
    createFields: ["name", "type", "threat_class_id", "estimated_value", "commodity_flow_geography"],
  },
};

// ─── ENTITY LIST VIEW ────────────────────────────────────────────────────────
const EntityListView = ({ def, onSelect }) => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const dSearch = useDebounce(search, 300);
  const searchRef = useRef(null);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (dSearch) p.set("search", dSearch);
      const qs = p.toString();
      const r = await api(`/entities/${def.apiPath}${qs ? "?" + qs : ""}`);
      setItems(r.data || []); setTotal(r.total || 0);
    } catch (err) { setError(err.message); setItems([]); }
    finally { setLoading(false); }
  }, [dSearch, def.apiPath]);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => { searchRef.current?.focus(); }, [def.key]);

  const listCols = def.columns.filter(c => c.list);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "28px 36px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type={def.icon} size={22} color={T.accent}/></div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: 0, letterSpacing: -.5 }}>{def.label}</h1>
            <div style={{ fontSize: 13, color: T.textTer }}>{loading ? "Loading..." : `${total} records`}</div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ padding: "11px 22px", background: T.accent, color: "#fff", border: "none", borderRadius: T.rs, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, boxShadow: `0 2px 8px ${T.accent}40` }}>
            <Icon type="plus" size={15} color="#fff"/> New {def.singular}
          </button>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><Icon type="search" size={16} color={T.textMuted}/></div>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${def.label.toLowerCase()}...`} style={{ width: "100%", boxSizing: "border-box", padding: "14px 18px 14px 44px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r, color: T.text, fontSize: 15, fontFamily: "inherit", outline: "none", transition: "border-color .15s" }} onFocus={e => e.target.style.borderColor = T.borderFocus} onBlur={e => e.target.style.borderColor = T.border}/>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "20px 36px" }}>
        {error ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ color: T.bad, fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
            <div style={{ color: T.textTer, fontSize: 13 }}>{error}</div>
            <button onClick={fetch_} style={{ marginTop: 16, padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, cursor: "pointer", fontSize: 13 }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: 48, color: T.textTer }}><div style={{ fontSize: 15, fontWeight: 600 }}>Loading...</div></div>
        ) : !items.length ? (
          <div style={{ textAlign: "center", padding: 48, color: T.textTer }}>No {def.label.toLowerCase()} found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: listCols.map(() => "1fr").join(" "), gap: 16, padding: "12px 22px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: T.textTer }}>
              {listCols.map(c => <span key={c.key}>{c.label}</span>)}
            </div>
            {items.map(item => (
              <button key={item[def.pk]} onClick={() => onSelect(item)} style={{ display: "grid", gridTemplateColumns: listCols.map(() => "1fr").join(" "), gap: 16, padding: "16px 20px", background: T.surface, border: `1px solid ${T.borderLight}`, borderRadius: T.r, cursor: "pointer", textAlign: "left", color: T.text, fontSize: 14, fontFamily: "inherit", transition: "all .15s", alignItems: "center", boxShadow: T.sh }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent + "40"; e.currentTarget.style.boxShadow = T.shM; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderLight; e.currentTarget.style.boxShadow = T.sh; }}>
                {listCols.map(c => c.badge ? <Badge key={c.key} color={statColor(item[c.key])}>{item[c.key] || "—"}</Badge> : <span key={c.key} style={{ fontWeight: c.key === "name" ? 600 : 400, color: item[c.key] ? T.text : T.textMuted }}>{item[c.key] || "—"}</span>)}
              </button>
            ))}
          </div>
        )}
      </div>
      {showAdd && <EntityCreateModal def={def} onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); fetch_(); }}/>}
    </div>
  );
};

// ─── ENTITY CREATE MODAL ─────────────────────────────────────────────────────
const EntityCreateModal = ({ def, onClose, onCreated }) => {
  const createFieldDefs = def.fields.filter(f => def.createFields.includes(f.key));
  const [form, setForm] = useState(() => { const o = {}; createFieldDefs.forEach(f => o[f.key] = ""); return o; });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm(p => ({...p, [k]: v}));
  const inp = { width: "100%", padding: "14px 16px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" };
  const reqFilled = createFieldDefs.filter(f => f.required).every(f => form[f.key]);

  const handleCreate = async () => {
    setSaving(true); setError(null);
    try {
      await api(`/entities/${def.apiPath}`, { method: "POST", body: JSON.stringify({ ...form, user_id: 1 }) });
      onCreated();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 580, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: T.shL, overflow: "hidden" }}>
        <div style={{ padding: "28px 32px 24px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type={def.icon} size={22} color={T.accent}/></div>
            <div><div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>New {def.singular}</div></div>
          </div>
          <button onClick={onClose} style={{ background: T.surfaceAlt, border: "none", color: T.textSec, cursor: "pointer", padding: 6, borderRadius: T.rs, display: "flex" }}><Icon type="x" size={16}/></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {createFieldDefs.map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label} {f.required && <span style={{ color: T.bad }}>*</span>}</label>
                {f.type === "text" ? <textarea value={form[f.key]} onChange={e => set(f.key, e.target.value)} rows={3} style={{...inp, resize: "vertical"}}/> : <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={inp}/>}
              </div>
            ))}
          </div>
          {error && <div style={{ marginTop: 16, padding: "14px 20px", background: T.badBg, borderRadius: T.rs, color: T.bad, fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: "20px 32px", borderTop: `1px solid ${T.borderLight}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "12px 24px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleCreate} disabled={!reqFilled || saving} style={{ padding: "12px 24px", background: reqFilled ? T.accent : T.surfaceAlt, border: "none", borderRadius: T.rs, color: reqFilled ? "#fff" : T.textMuted, cursor: reqFilled ? "pointer" : "not-allowed", fontWeight: 600, fontSize: 14, opacity: saving ? .6 : 1 }}>{saving ? "Creating..." : `Create ${def.singular}`}</button>
        </div>
      </div>
    </div>
  );
};

// ─── ENTITY DETAIL VIEW ──────────────────────────────────────────────────────
const EntityDetailView = ({ def, item: initial, onBack }) => {
  const [item, setItem] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editVals, setEditVals] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try { const d = await api(`/entities/${def.apiPath}/${initial[def.pk]}`); if (!c) setItem(d); }
      catch { /* keep initial */ }
      finally { if (!c) setLoading(false); }
    })();
    return () => { c = true; };
  }, [initial[def.pk], def.apiPath, def.pk]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {};
      def.fields.forEach(f => { payload[f.key] = editVals[f.key] ?? item[f.key] ?? ""; });
      payload.user_id = 1;
      const updated = await api(`/entities/${def.apiPath}/${item[def.pk]}`, { method: "PUT", body: JSON.stringify(payload) });
      setItem(updated); setEditVals({}); setIsEditing(false);
    } catch (err) { alert("Save failed: " + err.message); }
    finally { setSaving(false); }
  };

  const inp = { width: "100%", padding: "11px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "24px 36px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.textTer, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600 }}><Icon type="back" size={18}/> Back</button>
          <div style={{ flex: 1 }}/>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} disabled={loading} style={{ padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}><Icon type="edit" size={14}/> Edit</button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setIsEditing(false); setEditVals({}); }} style={{ padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "12px 22px", background: T.accent, border: "none", borderRadius: T.rs, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14, opacity: saving ? .6 : 1 }}>{saving ? "Saving..." : "Save"}</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 58, height: 58, borderRadius: 14, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon type={def.icon} size={26} color={T.accent}/></div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.text, letterSpacing: -.3 }}>{item.name}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              {item.status && <Badge color={statColor(item.status)}>{item.status}</Badge>}
              {item.type && <Badge color={T.textSec} bg={T.surfaceAlt}>{item.type}</Badge>}
              {item.primary_role && <Badge color={T.textSec} bg={T.surfaceAlt}>{item.primary_role}</Badge>}
            </div>
          </div>
        </div>
      </div>
      {/* Fields */}
      <div style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
        {loading ? <div style={{ textAlign: "center", padding: 48, color: T.textTer }}>Loading...</div> : (
          <>
            {isEditing && <div style={{ marginBottom: 16, padding: "14px 20px", background: T.accentBg, borderRadius: T.r, border: `1px solid ${T.accent}30`, display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: T.accent }}><Icon type="edit" size={16} color={T.accent}/><strong>Edit Mode</strong></div>}
            {def.fields.map(f => {
              const val = item[f.key];
              const dv = val === true ? "Yes" : val === false ? "No" : val;
              return (
                <div key={f.key} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                  <div style={{ width: 210, flexShrink: 0, paddingTop: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.textTer }}>{f.label}</span>
                    {f.required && <span style={{ color: T.bad, marginLeft: 3 }}>*</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    {isEditing ? (f.type === "text" ? <textarea value={editVals[f.key] ?? val ?? ""} onChange={e => setEditVals(p => ({...p, [f.key]: e.target.value}))} rows={3} style={{...inp, resize: "vertical"}}/> : <input value={editVals[f.key] ?? val ?? ""} onChange={e => setEditVals(p => ({...p, [f.key]: e.target.value}))} style={inp}/>) : (
                      <div style={{ fontSize: 15, color: dv ? T.text : T.textMuted, lineHeight: 1.65 }}>{dv || "—"}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Linked Threat Networks */}
            {item.linked_threat_networks?.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <SecHdr icon="shield" title="Linked Threat Networks" count={item.linked_threat_networks.length}/>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {item.linked_threat_networks.map((tn, i) => (
                    <Card key={i}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, color: T.text, fontSize: 14 }}>{tn.threat_network_name}</div>
                          {tn.person_threat_network_role && <div style={{ fontSize: 14, color: T.textSec, marginTop: 2 }}>Role: {tn.person_threat_network_role}</div>}
                          {tn.organization_threat_network_function && <div style={{ fontSize: 14, color: T.textSec, marginTop: 2 }}>Function: {tn.organization_threat_network_function}</div>}
                          {tn.threat_network_country_presence_level && <div style={{ fontSize: 14, color: T.textSec, marginTop: 2 }}>Presence: {tn.threat_network_country_presence_level}</div>}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Badge color={T.textSec} bg={T.surfaceAlt}>{tn.category}</Badge>
                          <Badge color={statColor(tn.status)}>{tn.status}</Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "networks", label: "Threat Networks", icon: "shield" },
  { key: "divider1", divider: true, label: "ENTITIES" },
  { key: "persons", label: "Persons", icon: "users" },
  { key: "organizations", label: "Organizations", icon: "building" },
  { key: "countries", label: "Countries", icon: "globe" },
  { key: "boundaries", label: "Boundaries", icon: "map" },
  { key: "subclasses", label: "Subclasses", icon: "target" },
  { key: "divider2", divider: true, label: "ADMINISTRATION" },
  { key: "ref_tables", label: "Reference Tables", icon: "settings" },
];

const Sidebar = ({ active, onNav }) => (
  <div style={{ width: 250, background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "auto" }}>
    <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type="shield" size={16} color="#fff"/></div>
        <div><div style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: -.3 }}>Hybrid Threat</div><div style={{ fontSize: 11, color: T.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8 }}>Central</div></div>
      </div>
    </div>
    <div style={{ padding: "12px 8px", flex: 1 }}>
      {NAV_ITEMS.map(item => item.divider ? (
        <div key={item.key} style={{ padding: "16px 12px 6px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: T.textMuted }}>{item.label}</div>
      ) : (
        <button key={item.key} onClick={() => onNav(item.key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", marginBottom: 2, background: active === item.key ? T.accentBg : "transparent", border: "none", borderRadius: T.rs, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: active === item.key ? 600 : 500, color: active === item.key ? T.accent : T.textSec, transition: "all .12s", textAlign: "left" }}>
          <Icon type={item.icon} size={16} color={active === item.key ? T.accent : T.textTer}/>{item.label}
        </button>
      ))}
    </div>
  </div>
);

// ─── REFERENCE TABLES VIEW ───────────────────────────────────────────────────
const RefTablesView = () => {
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [values, setValues] = useState([]);
  const [usedBy, setUsedBy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [valLoading, setValLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ value: "", description: "", display_order: 0 });
  const [addSaving, setAddSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const r = await api("/ref"); setTables(r.tables || []); }
      catch { setTables([]); }
      finally { setLoading(false); }
    })();
  }, []);

  const loadValues = useCallback(async (tableName) => {
    setSelected(tableName);
    setValLoading(true);
    setShowAdd(false);
    setEditingId(null);
    try {
      const r = await api(`/ref/${tableName}?include_inactive=true`);
      setValues(r.values || []);
      setUsedBy(r.used_by || []);
    } catch { setValues([]); }
    finally { setValLoading(false); }
  }, []);

  const handleAdd = async () => {
    if (!addForm.value) return;
    setAddSaving(true);
    try {
      await api(`/ref/${selected}`, { method: "POST", body: JSON.stringify(addForm) });
      setShowAdd(false);
      setAddForm({ value: "", description: "", display_order: 0 });
      loadValues(selected);
    } catch (err) { alert(err.message); }
    finally { setAddSaving(false); }
  };

  const startEdit = (v) => {
    setEditingId(v.id);
    setEditForm({ value: v.value, description: v.description || "", display_order: v.display_order, is_active: v.is_active });
  };

  const saveEdit = async () => {
    setEditSaving(true);
    try {
      await api(`/ref/${selected}/${editingId}`, { method: "PUT", body: JSON.stringify(editForm) });
      setEditingId(null);
      loadValues(selected);
    } catch (err) { alert(err.message); }
    finally { setEditSaving(false); }
  };

  const toggleActive = async (v) => {
    try {
      await api(`/ref/${selected}/${v.id}`, { method: "PUT", body: JSON.stringify({ is_active: !v.is_active }) });
      loadValues(selected);
    } catch (err) { alert(err.message); }
  };

  const inp = { width: "100%", padding: "11px 14px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" };

  const filteredTables = tables.filter(t => !search || t.table_name.includes(search.toLowerCase()) || t.display_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Left: table list */}
      <div style={{ width: 300, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type="settings" size={20} color={T.accent}/></div>
            <div><h1 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: 0 }}>Reference Tables</h1><div style={{ fontSize: 12, color: T.textTer }}>{tables.length} lookup tables</div></div>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter tables..." style={{ ...inp, background: T.surfaceAlt }} />
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {loading ? <div style={{ padding: 20, textAlign: "center", color: T.textTer }}>Loading...</div> :
          filteredTables.map(t => (
            <button key={t.table_name} onClick={() => loadValues(t.table_name)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", marginBottom: 2, background: selected === t.table_name ? T.accentBg : "transparent", border: "none", borderRadius: T.rs, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: selected === t.table_name ? 600 : 400, color: selected === t.table_name ? T.accent : T.text, textAlign: "left", transition: "all .12s" }}>
              <span style={{ textTransform: "capitalize" }}>{t.display_name}</span>
              <span style={{ fontSize: 12, color: T.textTer, background: T.surfaceAlt, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{t.active_count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right: values */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textTer }}>
            <div style={{ textAlign: "center" }}>
              <Icon type="settings" size={40} color={T.textMuted}/>
              <div style={{ marginTop: 12, fontSize: 16, fontWeight: 600 }}>Select a reference table</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Choose from the list to view and manage values</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "24px 32px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: T.text, textTransform: "capitalize" }}>{selected.replace(/_/g, " ")}</div>
                {usedBy.length > 0 && (
                  <div style={{ fontSize: 13, color: T.textTer, marginTop: 4 }}>
                    Used by: {usedBy.map(u => `${u.table_name}.${u.field_name}`).join(", ")}
                  </div>
                )}
              </div>
              <button onClick={() => { setShowAdd(true); setEditingId(null); }} style={{ padding: "12px 22px", background: T.accent, color: "#fff", border: "none", borderRadius: T.rs, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon type="plus" size={14} color="#fff"/> Add Value
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "20px 32px" }}>
              {valLoading ? <div style={{ padding: 40, textAlign: "center", color: T.textTer }}>Loading...</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* Column header */}
                  <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1.5fr 80px 80px 60px", gap: 12, padding: "10px 14px", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: T.textTer }}>
                    <span>Order</span><span>Value</span><span>Description</span><span>Status</span><span></span><span></span>
                  </div>
                  {/* Add form */}
                  {showAdd && (
                    <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 1.5fr 80px 80px 60px", gap: 12, padding: "14px 16px", background: T.accentBg, borderRadius: T.rs, border: `2px solid ${T.accent}`, alignItems: "center" }}>
                      <input value={addForm.display_order} onChange={e => setAddForm(p => ({...p, display_order: parseInt(e.target.value)||0}))} type="number" style={{...inp, padding: "8px 10px", textAlign: "center", width: 50}}/>
                      <input value={addForm.value} onChange={e => setAddForm(p => ({...p, value: e.target.value}))} placeholder="Value *" style={{...inp, padding: "8px 10px"}}/>
                      <input value={addForm.description} onChange={e => setAddForm(p => ({...p, description: e.target.value}))} placeholder="Description (optional)" style={{...inp, padding: "8px 10px"}}/>
                      <span/>
                      <button onClick={handleAdd} disabled={!addForm.value || addSaving} style={{ padding: "8px 14px", background: addForm.value ? T.accent : T.surfaceAlt, border: "none", borderRadius: T.rs, color: "#fff", cursor: addForm.value ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600, opacity: addSaving ? .6 : 1 }}>{addSaving ? "..." : "Add"}</button>
                      <button onClick={() => setShowAdd(false)} style={{ padding: "10px 14px", background: "transparent", border: "none", color: T.textTer, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    </div>
                  )}
                  {/* Values */}
                  {values.map(v => editingId === v.id ? (
                    <div key={v.id} style={{ display: "grid", gridTemplateColumns: "50px 1fr 1.5fr 80px 80px 60px", gap: 12, padding: "14px 16px", background: T.accentBg, borderRadius: T.rs, border: `2px solid ${T.accent}`, alignItems: "center" }}>
                      <input value={editForm.display_order} onChange={e => setEditForm(p => ({...p, display_order: parseInt(e.target.value)||0}))} type="number" style={{...inp, padding: "8px 10px", textAlign: "center", width: 50}}/>
                      <input value={editForm.value} onChange={e => setEditForm(p => ({...p, value: e.target.value}))} style={{...inp, padding: "8px 10px"}}/>
                      <input value={editForm.description} onChange={e => setEditForm(p => ({...p, description: e.target.value}))} style={{...inp, padding: "8px 10px"}}/>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}><input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(p => ({...p, is_active: e.target.checked}))}/> Active</label>
                      <button onClick={saveEdit} disabled={editSaving} style={{ padding: "8px 14px", background: T.accent, border: "none", borderRadius: T.rs, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, opacity: editSaving ? .6 : 1 }}>{editSaving ? "..." : "Save"}</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: "10px 14px", background: "transparent", border: "none", color: T.textTer, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    </div>
                  ) : (
                    <div key={v.id} style={{ display: "grid", gridTemplateColumns: "50px 1fr 1.5fr 80px 80px 60px", gap: 12, padding: "14px 16px", background: T.surface, borderRadius: T.rs, border: `1px solid ${T.borderLight}`, alignItems: "center", opacity: v.is_active ? 1 : 0.5 }}>
                      <span style={{ fontSize: 13, color: T.textTer, textAlign: "center" }}>{v.display_order}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{v.value}</span>
                      <span style={{ fontSize: 13, color: T.textSec }}>{v.description || "—"}</span>
                      <Badge color={v.is_active ? T.ok : T.textMuted}>{v.is_active ? "Active" : "Inactive"}</Badge>
                      <button onClick={() => startEdit(v)} style={{ padding: "7px 12px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                      <button onClick={() => toggleActive(v)} style={{ padding: "7px 12px", background: "transparent", border: "none", color: v.is_active ? T.warn : T.ok, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{v.is_active ? "Disable" : "Enable"}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function ThreatNetworkApp() {
  const [nav, setNav] = useState("networks");
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState(null);

  const handleNav = (key) => {
    setNav(key);
    setSelectedNetwork(null);
    setSelectedEntity(null);
  };

  const renderContent = () => {
    if (nav === "networks") {
      if (selectedNetwork) return <DetailView networkSummary={selectedNetwork} onBack={() => setSelectedNetwork(null)}/>;
      return <ListView onSelect={setSelectedNetwork}/>;
    }
    if (nav === "ref_tables") return <RefTablesView/>;
    const def = ENTITY_DEFS[nav];
    if (def) {
      if (selectedEntity) return <EntityDetailView def={def} item={selectedEntity} onBack={() => setSelectedEntity(null)}/>;
      return <EntityListView def={def} onSelect={setSelectedEntity}/>;
    }
    return null;
  };

  return (
    <div style={{ fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif", background: T.bg, color: T.text, height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.textMuted}; }
        input::placeholder, textarea::placeholder { color: ${T.textMuted}; }
        select, input, textarea, button { font-family: inherit; }
        @keyframes slideIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      <Sidebar active={nav} onNav={handleNav}/>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {renderContent()}
      </div>
    </div>
  );
}
