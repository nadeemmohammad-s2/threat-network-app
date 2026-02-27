import { useState, useEffect, useRef, useCallback } from "react";

// ─── API ─────────────────────────────────────────────────────────────────────
const API_BASE = typeof window !== "undefined" && window.location.port === "3000" ? "/api" : "http://localhost:3001/api";
async function api(path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, { headers: { "Content-Type": "application/json", ...opts.headers }, ...opts });
  if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || `API ${r.status}`); }
  return r.json();
}
function useDebounce(v, d = 300) { const [s, set] = useState(v); useEffect(() => { const t = setTimeout(() => set(v), d); return () => clearTimeout(t); }, [v, d]); return s; }

// Hook: loads ref table options for a given entity table name
function useRefOptions(tableName) {
  const [opts, setOpts] = useState({});
  useEffect(() => {
    if (!tableName) return;
    let c = false;
    (async () => {
      try {
        const r = await api(`/ref/map/${tableName}`);
        if (!c) setOpts(r.fields || {});
      } catch { if (!c) setOpts({}); }
    })();
    return () => { c = true; };
  }, [tableName]);
  return opts;
}

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const T = {
  // Dark intelligence theme
  bg: "#0c1018", surface: "#141a24", surfaceAlt: "#1a2232",
  border: "#243044", borderLight: "#1e2a3a", borderFocus: "#d4a04a",
  text: "#dfe6ee", textSec: "#8c95a4", textTer: "#5f6b7a", textMuted: "#3d4754",
  // Accent - warm amber/gold
  accent: "#d4a04a", accentHover: "#e0b35a", accentBg: "rgba(212,160,74,.1)",
  // Sidebar
  sidebarBg: "#080c12", sidebarSurface: "#0e131c", sidebarBorder: "#182030",
  sidebarText: "#8c95a4", sidebarTextDim: "#3d4a5a", sidebarTextBright: "#dfe6ee",
  sidebarAccent: "#d4a04a", sidebarAccentBg: "rgba(212,160,74,.1)",
  // Semantic
  ok: "#3fb950", okBg: "rgba(63,185,80,.12)", warn: "#d29922", warnBg: "rgba(210,153,34,.12)",
  bad: "#f85149", badBg: "rgba(248,81,73,.12)", purple: "#a371f7",
  // Radius / shadows
  r: 8, rs: 6,
  sh: "0 1px 4px rgba(0,0,0,.4)",
  shM: "0 4px 20px rgba(0,0,0,.5)",
  shL: "0 16px 48px rgba(0,0,0,.6)",
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
const confColor = (l) => ({ very_high: "#3fb950", high: "#56d364", moderate: "#d29922", low: "#db6d28", very_low: "#f85149", unverified: "#484f58" }[l] || "#484f58");
const statColor = (s) => s === "Active" ? T.ok : (s === "Weakened" || s === "Arrested" || s === "LEA shut down") ? T.warn : s === "Fugitive" ? T.bad : s === "Imprisoned" ? T.purple : "#5f6b7a";
const vioColor = (v) => v === "Very High" ? T.bad : v === "High" ? "#db6d28" : v === "Moderate" ? T.warn : "#5f6b7a";

const Badge = ({ children, color, bg }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, background: bg || (color ? color + "18" : T.surfaceAlt), color: color || T.textSec, whiteSpace: "nowrap", border: `1px solid ${color ? color + "30" : T.border}` }}>{children}</span>
);
const ConfBadge = ({ level }) => <Badge color={confColor(level)}><span style={{ width: 6, height: 6, borderRadius: "50%", background: confColor(level) }}/>{level?.replace("_", " ")}</Badge>;

// ─── CITATION DOT ────────────────────────────────────────────────────────────
const CitDot = ({ citations = {}, fieldKey, onOpen }) => {
  const fc = citations[fieldKey] || [];
  if (!fc.length) return <button onClick={() => onOpen?.(fieldKey)} style={{ width: 22, height: 22, borderRadius: "50%", border: `1.5px dashed ${T.textMuted}`, background: "transparent", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: T.textMuted, flexShrink: 0, marginLeft: 6 }} title="No citations">?</button>;
  const best = fc.find(c => c.is_primary_source) || fc[0];
  const dc = confColor(best.confidence_level || best.confidence);
  return <button onClick={() => onOpen?.(fieldKey)} style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${dc}`, background: dc + "18", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: dc, flexShrink: 0, marginLeft: 6 }} title={`${fc.length} citation(s)`}>{fc.length}</button>;
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
        <div><div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2, color: T.textTer, marginBottom: 4, fontWeight: 600 }}>Field Provenance</div><div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{fieldLabel || fieldKey}</div></div>
        <button onClick={onClose} style={{ background: T.surfaceAlt, border: "none", color: T.textSec, cursor: "pointer", padding: 6, borderRadius: T.rs, display: "flex" }}><Icon type="x" size={16}/></button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {!fc.length && !showForm ? (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: T.warnBg, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><Icon type="alert" size={24} color={T.warn}/></div>
            <div style={{ color: T.text, fontWeight: 700, marginBottom: 8, fontSize: 15 }}>Intelligence Gap</div>
            <div style={{ color: T.textTer, fontSize: 13, lineHeight: 1.65, marginBottom: 24 }}>No citations exist for this field.</div>
            <button onClick={() => setShowForm(true)} style={{ padding: "12px 24px", background: T.accent, color: "#fff", border: "none", borderRadius: T.rs, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 8 }}><Icon type="plus" size={14} color="#fff"/> Add Citation</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {fc.map((c, i) => (
              <div key={c.field_citation_id || i} style={{ background: T.surfaceAlt, borderRadius: T.r, padding: 16, border: c.is_primary_source ? `2px solid ${T.accent}` : `1px solid ${T.borderLight}` }}>
                {c.is_primary_source && <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: T.accent, fontWeight: 700, marginBottom: 8 }}>★ Primary Source</div>}
                <div style={{ fontWeight: 600, color: T.text, marginBottom: 6, fontSize: 14 }}>{c.source_name}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}><Badge color={T.textSec} bg={T.surfaceAlt}>{c.source_type}</Badge><ConfBadge level={c.confidence_level}/></div>
                {c.attribution_notes && <div style={{ fontSize: 15, color: T.textSec, marginBottom: 10, lineHeight: 1.65 }}>{c.attribution_notes}</div>}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.textTer }}><span>Analyst: {c.analyst_user_id}</span><span>{c.obtained_date}</span></div>
              </div>
            ))}
            {showForm ? (
              <div style={{ background: T.surface, borderRadius: T.r, padding: 16, border: `2px solid ${T.accent}` }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 16 }}>New Citation</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div><label style={lbl}>Source</label><select value={form.source_id} onChange={e => setForm(p => ({...p, source_id: e.target.value}))} style={{...inp, cursor: "pointer"}}><option value="">Select a source...</option>{sources.map(s => <option key={s.source_id} value={s.source_id}>{s.source_name} ({s.source_type})</option>)}</select></div>
                  <div><label style={lbl}>Confidence</label><select value={form.confidence_level} onChange={e => setForm(p => ({...p, confidence_level: e.target.value}))} style={{...inp, cursor: "pointer"}}>{["very_high","high","moderate","low","very_low","unverified"].map(l => <option key={l} value={l}>{l.replace("_"," ")}</option>)}</select></div>
                  <div><label style={lbl}>Date Obtained</label><input type="date" value={form.obtained_date} onChange={e => setForm(p => ({...p, obtained_date: e.target.value}))} style={inp}/></div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}><input type="checkbox" checked={form.is_primary} onChange={e => setForm(p => ({...p, is_primary: e.target.checked}))}/><span style={{ fontSize: 14, color: T.textSec }}>Primary source</span></label>
                  <div><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))} rows={3} style={{...inp, resize: "vertical"}}/></div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowForm(false)} style={{ padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
                    <button onClick={doSubmit} disabled={!form.source_id || sub} style={{ padding: "12px 22px", background: form.source_id ? T.accent : T.surfaceAlt, border: "none", borderRadius: T.rs, color: "#fff", cursor: form.source_id ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600, opacity: sub ? .6 : 1 }}>{sub ? "Saving..." : "Save Citation"}</button>
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
const FieldRow = ({ field, value, citations, onCiteClick, isEditing, editValues, onEditChange, refOptions = {} }) => {
  const dv = value === true ? "Yes" : value === false ? "No" : value;
  const inp = { width: "100%", padding: "11px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const fieldOpts = refOptions[field.key];
  const renderInput = () => {
    if (field.type === "text") return <textarea value={editValues[field.key] ?? value ?? ""} onChange={e => onEditChange(field.key, e.target.value)} rows={3} style={{...inp, resize: "vertical"}}/>;
    if (fieldOpts?.values?.length) return (
      <select value={editValues[field.key] ?? value ?? ""} onChange={e => onEditChange(field.key, e.target.value)} style={{...inp, cursor: "pointer", appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%238b92a8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: 12, paddingRight: 36}}>
        <option value="">— Select —</option>
        {fieldOpts.values.map(o => <option key={o.id} value={o.value}>{o.value}</option>)}
      </select>
    );
    return <input value={editValues[field.key] ?? value ?? ""} onChange={e => onEditChange(field.key, e.target.value)} style={inp}/>;
  };
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 0", borderBottom: `1px solid ${T.borderLight}` }}>
      <div style={{ width: 200, flexShrink: 0, paddingTop: 2 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: T.textTer }}>{field.label}</span>
        {field.required && <span style={{ color: T.bad, marginLeft: 3 }}>*</span>}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: 8 }}>
        {isEditing ? renderInput() : (
          <div style={{ fontSize: 15, color: dv ? T.text : T.textMuted, lineHeight: 1.65, flex: 1 }}>{dv || "—"}</div>
        )}
        <CitDot citations={citations} fieldKey={field.key} onOpen={onCiteClick}/>
      </div>
    </div>
  );
};

// ─── TABS ────────────────────────────────────────────────────────────────────
const OverviewTab = ({ network, citations, onCiteClick, isEditing, editValues, onEditChange, refOptions }) => <div>{OVERVIEW_FIELDS.map(f => <FieldRow key={f.key} field={f} value={network[f.key]} citations={citations} onCiteClick={onCiteClick} isEditing={isEditing} editValues={editValues} onEditChange={onEditChange} refOptions={refOptions}/>)}</div>;
const OpsTab = ({ network, citations, onCiteClick, isEditing, editValues, onEditChange, refOptions }) => <div>{OPS_FIELDS.map(f => <FieldRow key={f.key} field={f} value={network[f.key]} citations={citations} onCiteClick={onCiteClick} isEditing={isEditing} editValues={editValues} onEditChange={onEditChange} refOptions={refOptions}/>)}</div>;

const Model88Tab = ({ network, citations, onCiteClick, isEditing, editValues, onEditChange, refOptions }) => {
  const [open, setOpen] = useState({});
  const lvC = (v) => !v || v === "None" ? T.textMuted : v.includes("Extensive") || v.includes("High") ? T.bad : v.includes("Moderate") ? T.warn : T.ok;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {MODEL_88_SECTIONS.map((sec, i) => {
        const val = network[sec.indicator], isO = open[i];
        return (
          <div key={i} style={{ background: T.surface, borderRadius: T.r, border: `1px solid ${T.borderLight}`, overflow: "hidden" }}>
            <button onClick={() => setOpen(p => ({...p, [i]: !p[i]}))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: lvC(val), flexShrink: 0 }}/><span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.text }}>{sec.title}</span>
              <Badge color={lvC(val)}>{val || "Not assessed"}</Badge><Icon type={isO ? "chevUp" : "chevDown"} size={16} color={T.textTer}/>
            </button>
            {isO && <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${T.borderLight}` }}>
              <FieldRow field={{ key: sec.indicator, label: "Level" }} value={val} citations={citations} onCiteClick={onCiteClick} isEditing={isEditing} editValues={editValues} onEditChange={onEditChange} refOptions={refOptions}/>
              <FieldRow field={{ key: sec.notes, label: "Notes", type: "text" }} value={network[sec.notes]} citations={citations} onCiteClick={onCiteClick} isEditing={isEditing} editValues={editValues} onEditChange={onEditChange} refOptions={refOptions}/>
              {sec.booleans && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>{sec.booleans.map(b => (
                <span key={b.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: network[b.key] ? T.okBg : T.surfaceAlt, color: network[b.key] ? T.ok : T.textMuted, border: `1px solid ${network[b.key] ? T.ok+"30" : T.borderLight}` }}>{network[b.key] && <Icon type="check" size={12} color={T.ok}/>}{b.label}</span>
              ))}</div>}
            </div>}
          </div>
        );
      })}
    </div>
  );
};

const SecHdr = ({ icon, title, count }) => <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, marginTop: 4 }}><Icon type={icon} size={16} color={T.textTer}/><span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1.2, color: T.textTer, fontWeight: 700 }}>{title}</span>{count != null && <span style={{ fontSize: 12, color: T.textMuted }}>({count})</span>}</div>;
const Empty = ({ label }) => <div style={{ padding: "20px 0", textAlign: "center", color: T.textMuted, fontSize: 13, fontStyle: "italic" }}>No {label} recorded.</div>;
const Card = ({ children, hl }) => <div style={{ background: T.surface, borderRadius: T.r, border: `1px solid ${hl ? T.accent+"40" : T.borderLight}`, padding: 16, boxShadow: T.sh }}>{children}</div>;

const RelationshipsTab = ({ network, onRefresh }) => {
  const { relationships=[], organizations=[], persons=[], countries=[], threat_boundaries=[], threat_subclasses=[], linked_sources=[] } = network;
  const rc = t => t==="Enemy"?T.bad:t==="Alliance"?T.ok:t==="Competitor"?T.warn:T.accent;
  const lc = v => v==="Extensive"||v==="Dominant"?T.bad:v==="High"||v==="Moderate"?T.warn:T.ok;
  const [adding, setAdding] = useState(null);    // which section is in add mode
  const [editing, setEditing] = useState(null);   // {type, id}
  const [form, setForm] = useState({});
  const [lookups, setLookups] = useState({});
  const [saving, setSaving] = useState(false);
  const [refOpts, setRefOpts] = useState({});

  // Load entity lookups and ref options on demand
  const startAdd = async (type, lookupType, refTable) => {
    setAdding(type); setEditing(null); setForm({});
    if (lookupType && !lookups[lookupType]) {
      try { const r = await api(`/junctions/lookup/${lookupType}`); setLookups(p => ({...p, [lookupType]: r.items})); } catch {}
    }
    if (refTable && !refOpts[refTable]) {
      try { const r = await api(`/ref/map/${refTable}`); setRefOpts(p => ({...p, [refTable]: r.fields || {}})); } catch {}
    }
  };

  const startEdit = async (type, record, lookupType, refTable) => {
    setEditing({type, id: record._pk}); setAdding(null); setForm({...record});
    if (lookupType && !lookups[lookupType]) {
      try { const r = await api(`/junctions/lookup/${lookupType}`); setLookups(p => ({...p, [lookupType]: r.items})); } catch {}
    }
    if (refTable && !refOpts[refTable]) {
      try { const r = await api(`/ref/map/${refTable}`); setRefOpts(p => ({...p, [refTable]: r.fields || {}})); } catch {}
    }
  };

  const cancel = () => { setAdding(null); setEditing(null); setForm({}); };

  const saveAdd = async (type) => {
    setSaving(true);
    try {
      await api(`/junctions/${type}`, { method: "POST", body: JSON.stringify({ ...form, threat_network_id: network.threat_network_id, user_id: 1 }) });
      cancel(); onRefresh?.();
    } catch (err) { alert("Failed: " + err.message); }
    finally { setSaving(false); }
  };

  const saveEdit = async (type, id) => {
    setSaving(true);
    try {
      await api(`/junctions/${type}/${id}`, { method: "PUT", body: JSON.stringify({ ...form, user_id: 1 }) });
      cancel(); onRefresh?.();
    } catch (err) { alert("Failed: " + err.message); }
    finally { setSaving(false); }
  };

  const doDelete = async (type, id) => {
    if (!confirm("Remove this link?")) return;
    try {
      await api(`/junctions/${type}/${id}`, { method: "DELETE", body: JSON.stringify({ user_id: 1 }) });
      onRefresh?.();
    } catch (err) { alert("Failed: " + err.message); }
  };

  const set = (k, v) => setForm(p => ({...p, [k]: v}));
  const inp = { width: "100%", padding: "10px 14px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const sel = { ...inp, cursor: "pointer", appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%238b92a8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: 12, paddingRight: 36 };
  const lbl = { fontSize: 12, fontWeight: 700, color: T.textTer, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4, display: "block" };
  const btnS = { padding: "6px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, borderRadius: T.rs };

  const RefSelect = ({ field, refTable, value, onChange }) => {
    const opts = refOpts[refTable]?.[field]?.values;
    if (!opts?.length) return <input value={value||""} onChange={e => onChange(e.target.value)} style={inp}/>;
    return <select value={value||""} onChange={e => onChange(e.target.value)} style={sel}><option value="">— Select —</option>{opts.map(o => <option key={o.id} value={o.value}>{o.value}</option>)}</select>;
  };

  const EntityPicker = ({ type, value, onChange, label }) => {
    const items = lookups[type] || [];
    return (<div><label style={lbl}>{label} *</label><select value={value||""} onChange={e => onChange(e.target.value)} style={sel}><option value="">— Select —</option>{items.map(i => <option key={i.id} value={i.id}>{i.name}{i.alias_primary ? ` (${i.alias_primary})` : ""}{i.iso_alpha3 ? ` [${i.iso_alpha3}]` : ""}</option>)}</select></div>);
  };

  const AddBtn = ({ onClick }) => <button onClick={onClick} style={{ padding: "8px 14px", background: "transparent", color: T.accent, border: `1.5px dashed ${T.border}`, borderRadius: T.rs, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}><Icon type="plus" size={14} color={T.accent}/> Add</button>;

  const SaveRow = ({ onSave, onCancel }) => <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}><button onClick={onCancel} disabled={saving} style={{...btnS, color: T.textTer}}>Cancel</button><button onClick={onSave} disabled={saving} style={{...btnS, background: T.accent, color: "#fff", opacity: saving ? .6 : 1}}>{saving ? "Saving..." : "Save"}</button></div>;

  const EditDeleteBtns = ({ onEdit, onDelete }) => <div style={{ display: "flex", gap: 2 }}><button onClick={onEdit} style={{...btnS, color: T.accent}} title="Edit"><Icon type="edit" size={13}/></button><button onClick={onDelete} style={{...btnS, color: T.bad}} title="Remove"><Icon type="trash" size={13}/></button></div>;

  // ── Inline form for a junction type
  const JunctionForm = ({ type, refTable, children }) => (
    <Card><div style={{ padding: 4 }}>{children}<SaveRow onSave={() => editing ? saveEdit(type, editing.id) : saveAdd(type)} onCancel={cancel}/></div></Card>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── RELATIONSHIPS ── */}
      <div>
        <SecHdr icon="link" title="Relationships" count={relationships.length}/>
        {relationships.map(r => editing?.type==="relationships" && editing.id===r.threat_networks_relationship_id ? (
          <JunctionForm key={r.threat_networks_relationship_id} type="relationships" refTable="threat_network_relationship">
            <EntityPicker type="threat_networks" value={form.secondary_threat_network_id} onChange={v => set("secondary_threat_network_id", v)} label="Related Network"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Relationship Type</label><RefSelect field="relationship_type" refTable="threat_network_relationship" value={form.relationship_type} onChange={v => set("relationship_type", v)}/></div>
              <div><label style={lbl}>Formal?</label><select value={form.formal_relationship_ind ? "true" : "false"} onChange={e => set("formal_relationship_ind", e.target.value==="true")} style={sel}><option value="false">No</option><option value="true">Yes</option></select></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.notes||""} onChange={e => set("notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : (
          <Card key={r.threat_networks_relationship_id}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:32,height:32,borderRadius:8,background:rc(r.relationship_type)+"12",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon type="link" size={14} color={rc(r.relationship_type)}/></div>
              <div style={{flex:1}}><div style={{fontWeight:600,color:T.text,fontSize:14}}>{r.target_name}</div></div>
              <Badge color={rc(r.relationship_type)}>{r.relationship_type}</Badge>
              {r.formal_relationship_ind&&<Badge color={T.textSec} bg={T.surfaceAlt}>Formal</Badge>}
              <EditDeleteBtns onEdit={() => startEdit("relationships", {...r, _pk: r.threat_networks_relationship_id}, "threat_networks", "threat_network_relationship")} onDelete={() => doDelete("relationships", r.threat_networks_relationship_id)}/>
            </div>
            {r.notes&&<div style={{fontSize:14,color:T.textSec,lineHeight:1.65,marginTop:6}}>{r.notes}</div>}
          </Card>
        ))}
        {adding==="relationships" ? (
          <JunctionForm type="relationships" refTable="threat_network_relationship">
            <EntityPicker type="threat_networks" value={form.secondary_threat_network_id} onChange={v => set("secondary_threat_network_id", v)} label="Related Network"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Relationship Type</label><RefSelect field="relationship_type" refTable="threat_network_relationship" value={form.relationship_type} onChange={v => set("relationship_type", v)}/></div>
              <div><label style={lbl}>Formal?</label><select value={form.formal_relationship_ind ? "true" : "false"} onChange={e => set("formal_relationship_ind", e.target.value==="true")} style={sel}><option value="false">No</option><option value="true">Yes</option></select></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.notes||""} onChange={e => set("notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : !relationships.length && <Empty label="relationships"/>}
        {adding!=="relationships" && <AddBtn onClick={() => startAdd("relationships", "threat_networks", "threat_network_relationship")}/>}
      </div>

      {/* ── PERSONS ── */}
      <div>
        <SecHdr icon="users" title="Persons" count={persons.length}/>
        {persons.map(p => editing?.type==="persons" && editing.id===p.person_threat_network_id ? (
          <JunctionForm key={p.person_threat_network_id} type="persons" refTable="x_person_interest_threat_network">
            <EntityPicker type="persons" value={form.person_interest_id} onChange={v => set("person_interest_id", v)} label="Person"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Role</label><RefSelect field="person_threat_network_role" refTable="x_person_interest_threat_network" value={form.person_threat_network_role} onChange={v => set("person_threat_network_role", v)}/></div>
              <div><label style={lbl}>Status</label><RefSelect field="person_threat_network_status" refTable="x_person_interest_threat_network" value={form.person_threat_network_status} onChange={v => set("person_threat_network_status", v)}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.person_threat_network_notes||""} onChange={e => set("person_threat_network_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : (
          <Card key={p.person_threat_network_id}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:38,height:38,borderRadius:"50%",background:T.surfaceAlt,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon type="users" size={16} color={T.textTer}/></div>
              <div style={{flex:1}}><div style={{fontWeight:600,color:T.text,fontSize:14}}>{p.person_name || `Person ${p.person_interest_id}`}</div>{p.person_alias && <div style={{fontSize:13,color:T.textTer}}>{p.person_alias}</div>}<div style={{fontSize:13,color:T.textSec}}>{p.person_threat_network_role}</div></div>
              <Badge color={statColor(p.person_threat_network_status)}>{p.person_threat_network_status}</Badge>
              <EditDeleteBtns onEdit={() => startEdit("persons", {...p, _pk: p.person_threat_network_id}, "persons", "x_person_interest_threat_network")} onDelete={() => doDelete("persons", p.person_threat_network_id)}/>
            </div>
          </Card>
        ))}
        {adding==="persons" ? (
          <JunctionForm type="persons" refTable="x_person_interest_threat_network">
            <EntityPicker type="persons" value={form.person_interest_id} onChange={v => set("person_interest_id", v)} label="Person"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Role</label><RefSelect field="person_threat_network_role" refTable="x_person_interest_threat_network" value={form.person_threat_network_role} onChange={v => set("person_threat_network_role", v)}/></div>
              <div><label style={lbl}>Status</label><RefSelect field="person_threat_network_status" refTable="x_person_interest_threat_network" value={form.person_threat_network_status} onChange={v => set("person_threat_network_status", v)}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.person_threat_network_notes||""} onChange={e => set("person_threat_network_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : !persons.length && <Empty label="persons"/>}
        {adding!=="persons" && <AddBtn onClick={() => startAdd("persons", "persons", "x_person_interest_threat_network")}/>}
      </div>

      {/* ── ORGANIZATIONS ── */}
      <div>
        <SecHdr icon="building" title="Organizations" count={organizations.length}/>
        {organizations.map(o => editing?.type==="organizations" && editing.id===o.organization_threat_network_id ? (
          <JunctionForm key={o.organization_threat_network_id} type="organizations">
            <EntityPicker type="organizations" value={form.organization_interest_id} onChange={v => set("organization_interest_id", v)} label="Organization"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Function</label><input value={form.organization_threat_network_function||""} onChange={e => set("organization_threat_network_function", e.target.value)} style={inp}/></div>
              <div><label style={lbl}>Status</label><RefSelect field="organization_threat_network_status" refTable="x_organization_interest_threat_network" value={form.organization_threat_network_status} onChange={v => set("organization_threat_network_status", v)}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.organization_threat_network_notes||""} onChange={e => set("organization_threat_network_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : (
          <Card key={o.organization_threat_network_id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:600,color:T.text,fontSize:14}}>{o.org_name || `Org ${o.organization_interest_id}`}</div>{o.org_type && <div style={{fontSize:13,color:T.textTer}}>{o.org_type}</div>}{o.organization_threat_network_function && <div style={{fontSize:13,color:T.textSec}}>Function: {o.organization_threat_network_function}</div>}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Badge color={statColor(o.organization_threat_network_status)}>{o.organization_threat_network_status}</Badge>
                <EditDeleteBtns onEdit={() => startEdit("organizations", {...o, _pk: o.organization_threat_network_id}, "organizations")} onDelete={() => doDelete("organizations", o.organization_threat_network_id)}/>
              </div>
            </div>
          </Card>
        ))}
        {adding==="organizations" ? (
          <JunctionForm type="organizations">
            <EntityPicker type="organizations" value={form.organization_interest_id} onChange={v => set("organization_interest_id", v)} label="Organization"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Function</label><input value={form.organization_threat_network_function||""} onChange={e => set("organization_threat_network_function", e.target.value)} style={inp}/></div>
              <div><label style={lbl}>Status</label><RefSelect field="organization_threat_network_status" refTable="x_organization_interest_threat_network" value={form.organization_threat_network_status} onChange={v => set("organization_threat_network_status", v)}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.organization_threat_network_notes||""} onChange={e => set("organization_threat_network_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : !organizations.length && <Empty label="organizations"/>}
        {adding!=="organizations" && <AddBtn onClick={() => startAdd("organizations", "organizations")}/>}
      </div>

      {/* ── COUNTRIES ── */}
      <div>
        <SecHdr icon="globe" title="Countries" count={countries.length}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {countries.map(c => editing?.type==="countries" && editing.id===c.threat_network_country_id ? (
            <JunctionForm key={c.threat_network_country_id} type="countries" refTable="x_threat_network_country">
              <EntityPicker type="countries" value={form.country_id} onChange={v => set("country_id", v)} label="Country"/>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                <div><label style={lbl}>Status</label><RefSelect field="threat_network_country_status" refTable="x_threat_network_country" value={form.threat_network_country_status} onChange={v => set("threat_network_country_status", v)}/></div>
                <div><label style={lbl}>Presence Level</label><RefSelect field="threat_network_country_presence_level" refTable="x_threat_network_country" value={form.threat_network_country_presence_level} onChange={v => set("threat_network_country_presence_level", v)}/></div>
              </div>
              <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.threat_network_country_presence_notes||""} onChange={e => set("threat_network_country_presence_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
            </JunctionForm>
          ) : (
            <Card key={c.threat_network_country_id}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontWeight:600,color:T.text,fontSize:14}}>{c.country_name || `Country ${c.country_id}`}{c.iso_alpha3 && <span style={{color:T.textTer,fontWeight:400}}> [{c.iso_alpha3}]</span>}</span>
                <EditDeleteBtns onEdit={() => startEdit("countries", {...c, _pk: c.threat_network_country_id}, "countries", "x_threat_network_country")} onDelete={() => doDelete("countries", c.threat_network_country_id)}/>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <Badge color={lc(c.threat_network_country_presence_level)}>{c.threat_network_country_presence_level}</Badge>
                <Badge color={T.textSec} bg={T.surfaceAlt}>{c.threat_network_country_status}</Badge>
              </div>
              {c.threat_network_country_presence_notes&&<div style={{fontSize:13,color:T.textSec,marginTop:6,lineHeight:1.6}}>{c.threat_network_country_presence_notes}</div>}
            </Card>
          ))}
        </div>
        {adding==="countries" ? (
          <JunctionForm type="countries" refTable="x_threat_network_country">
            <EntityPicker type="countries" value={form.country_id} onChange={v => set("country_id", v)} label="Country"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Status</label><RefSelect field="threat_network_country_status" refTable="x_threat_network_country" value={form.threat_network_country_status} onChange={v => set("threat_network_country_status", v)}/></div>
              <div><label style={lbl}>Presence Level</label><RefSelect field="threat_network_country_presence_level" refTable="x_threat_network_country" value={form.threat_network_country_presence_level} onChange={v => set("threat_network_country_presence_level", v)}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.threat_network_country_presence_notes||""} onChange={e => set("threat_network_country_presence_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : !countries.length && <Empty label="countries"/>}
        {adding!=="countries" && <AddBtn onClick={() => startAdd("countries", "countries", "x_threat_network_country")}/>}
      </div>

      {/* ── THREAT BOUNDARIES ── */}
      <div>
        <SecHdr icon="map" title="Threat Boundaries" count={threat_boundaries.length}/>
        {threat_boundaries.map(b => editing?.type==="boundaries" && editing.id===b.threat_network_threat_boundary_id ? (
          <JunctionForm key={b.threat_network_threat_boundary_id} type="boundaries" refTable="x_threat_network_threat_boundary">
            <EntityPicker type="boundaries" value={form.threat_boundary_id} onChange={v => set("threat_boundary_id", v)} label="Boundary"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Strategic Value</label><RefSelect field="threat_market_threat_boundary_strategic_value" refTable="x_threat_network_threat_boundary" value={form.threat_market_threat_boundary_strategic_value} onChange={v => set("threat_market_threat_boundary_strategic_value", v)}/></div>
              <div><label style={lbl}>Primary Dominance</label><RefSelect field="threat_market_threat_boundary_primary_dominance" refTable="x_threat_network_threat_boundary" value={form.threat_market_threat_boundary_primary_dominance} onChange={v => set("threat_market_threat_boundary_primary_dominance", v)}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.threat_market_threat_boundary_notes||""} onChange={e => set("threat_market_threat_boundary_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : (
          <Card key={b.threat_network_threat_boundary_id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:600,color:T.text,fontSize:14}}>{b.boundary_name || `Boundary ${b.threat_boundary_id}`}</div>{b.boundary_type && <div style={{fontSize:13,color:T.textTer}}>{b.boundary_type}</div>}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Badge color={T.warn}>Strategic: {b.threat_market_threat_boundary_strategic_value}</Badge>
                {b.threat_market_threat_boundary_primary_dominance && <Badge color={T.textSec} bg={T.surfaceAlt}>Dominant: {b.threat_market_threat_boundary_primary_dominance}</Badge>}
                <EditDeleteBtns onEdit={() => startEdit("boundaries", {...b, _pk: b.threat_network_threat_boundary_id}, "boundaries", "x_threat_network_threat_boundary")} onDelete={() => doDelete("boundaries", b.threat_network_threat_boundary_id)}/>
              </div>
            </div>
            {b.threat_market_threat_boundary_notes&&<div style={{fontSize:14,color:T.textSec,lineHeight:1.65,marginTop:6}}>{b.threat_market_threat_boundary_notes}</div>}
          </Card>
        ))}
        {adding==="boundaries" ? (
          <JunctionForm type="boundaries" refTable="x_threat_network_threat_boundary">
            <EntityPicker type="boundaries" value={form.threat_boundary_id} onChange={v => set("threat_boundary_id", v)} label="Boundary"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Strategic Value</label><RefSelect field="threat_market_threat_boundary_strategic_value" refTable="x_threat_network_threat_boundary" value={form.threat_market_threat_boundary_strategic_value} onChange={v => set("threat_market_threat_boundary_strategic_value", v)}/></div>
              <div><label style={lbl}>Primary Dominance</label><RefSelect field="threat_market_threat_boundary_primary_dominance" refTable="x_threat_network_threat_boundary" value={form.threat_market_threat_boundary_primary_dominance} onChange={v => set("threat_market_threat_boundary_primary_dominance", v)}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.threat_market_threat_boundary_notes||""} onChange={e => set("threat_market_threat_boundary_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : !threat_boundaries.length && <Empty label="boundaries"/>}
        {adding!=="boundaries" && <AddBtn onClick={() => startAdd("boundaries", "boundaries", "x_threat_network_threat_boundary")}/>}
      </div>

      {/* ── THREAT SUBCLASSES ── */}
      <div>
        <SecHdr icon="target" title="Threat Subclasses" count={threat_subclasses.length}/>
        {threat_subclasses.map(ts => editing?.type==="subclasses" && editing.id===ts.id_jt_tn_im ? (
          <JunctionForm key={ts.id_jt_tn_im} type="subclasses" refTable="x_threat_network_threat_subclass">
            <EntityPicker type="subclasses" value={form.threat_subclass_id} onChange={v => set("threat_subclass_id", v)} label="Subclass"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Geographic Extension</label><RefSelect field="threat_network_threat_subclass_geographic_extension" refTable="x_threat_network_threat_subclass" value={form.threat_network_threat_subclass_geographic_extension} onChange={v => set("threat_network_threat_subclass_geographic_extension", v)}/></div>
              <div><label style={lbl}>Segmentation Level</label><RefSelect field="threat_network_threat_subclass_level_segmentation" refTable="x_threat_network_threat_subclass" value={form.threat_network_threat_subclass_level_segmentation} onChange={v => set("threat_network_threat_subclass_level_segmentation", v)}/></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Revenue Value</label><input value={form.threat_network_threat_subclass_value||""} onChange={e => set("threat_network_threat_subclass_value", e.target.value)} style={inp}/></div>
              <div><label style={lbl}>Initial Date</label><input value={form.threat_network_threat_subclass_initial_date||""} onChange={e => set("threat_network_threat_subclass_initial_date", e.target.value)} style={inp}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.threat_network_threat_subclass_notes||""} onChange={e => set("threat_network_threat_subclass_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : (
          <Card key={ts.id_jt_tn_im}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:600,color:T.text,fontSize:14}}>{ts.subclass_name || `Subclass ${ts.threat_subclass_id}`}</div>{ts.subclass_type && <div style={{fontSize:13,color:T.textTer}}>{ts.subclass_type}</div>}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {ts.threat_network_threat_subclass_value&&<span style={{fontSize:14,fontWeight:600,color:T.ok}}>{ts.threat_network_threat_subclass_value}</span>}
                {ts.threat_network_threat_subclass_geographic_extension && <Badge color={T.textSec} bg={T.surfaceAlt}>{ts.threat_network_threat_subclass_geographic_extension}</Badge>}
                <EditDeleteBtns onEdit={() => startEdit("subclasses", {...ts, _pk: ts.id_jt_tn_im}, "subclasses", "x_threat_network_threat_subclass")} onDelete={() => doDelete("subclasses", ts.id_jt_tn_im)}/>
              </div>
            </div>
            {ts.threat_network_threat_subclass_notes&&<div style={{fontSize:14,color:T.textSec,lineHeight:1.65,marginTop:6}}>{ts.threat_network_threat_subclass_notes}</div>}
          </Card>
        ))}
        {adding==="subclasses" ? (
          <JunctionForm type="subclasses" refTable="x_threat_network_threat_subclass">
            <EntityPicker type="subclasses" value={form.threat_subclass_id} onChange={v => set("threat_subclass_id", v)} label="Subclass"/>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Geographic Extension</label><RefSelect field="threat_network_threat_subclass_geographic_extension" refTable="x_threat_network_threat_subclass" value={form.threat_network_threat_subclass_geographic_extension} onChange={v => set("threat_network_threat_subclass_geographic_extension", v)}/></div>
              <div><label style={lbl}>Segmentation Level</label><RefSelect field="threat_network_threat_subclass_level_segmentation" refTable="x_threat_network_threat_subclass" value={form.threat_network_threat_subclass_level_segmentation} onChange={v => set("threat_network_threat_subclass_level_segmentation", v)}/></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
              <div><label style={lbl}>Revenue Value</label><input value={form.threat_network_threat_subclass_value||""} onChange={e => set("threat_network_threat_subclass_value", e.target.value)} style={inp}/></div>
              <div><label style={lbl}>Initial Date</label><input value={form.threat_network_threat_subclass_initial_date||""} onChange={e => set("threat_network_threat_subclass_initial_date", e.target.value)} style={inp}/></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={lbl}>Notes</label><textarea value={form.threat_network_threat_subclass_notes||""} onChange={e => set("threat_network_threat_subclass_notes", e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/></div>
          </JunctionForm>
        ) : !threat_subclasses.length && <Empty label="subclasses"/>}
        {adding!=="subclasses" && <AddBtn onClick={() => startAdd("subclasses", "subclasses", "x_threat_network_threat_subclass")}/>}
      </div>

      {/* ── LINKED SOURCES (read-only for now) ── */}
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
        <div><div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>Cite Your Sources</div><div style={{ fontSize: 16, color: T.textSec }}>Add provenance for changed fields</div></div>
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
  const [form, setForm] = useState({ name: "", acronym: "", category: "", subcategory: "", primary_motivation: "", geo_area_operations: "", network_type: "", sources: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const refOptions = useRefOptions("threat_network");
  const set = (k, v) => setForm(p => ({...p, [k]: v}));
  const inp = { width: "100%", padding: "14px 16px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const sel = { ...inp, cursor: "pointer", appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%238b92a8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: 12, paddingRight: 36 };
  const lbl = { fontSize: 12, fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4, display: "block" };
  const ok = form.name && form.category && form.subcategory && form.primary_motivation && form.geo_area_operations && form.network_type && form.sources;

  const DD = ({ field, label, required, placeholder }) => {
    const opts = refOptions[field]?.values;
    if (opts?.length) return (<div><label style={lbl}>{label} {required && <span style={{ color: T.bad }}>*</span>}</label><select value={form[field]} onChange={e => set(field, e.target.value)} style={sel}><option value="">— Select —</option>{opts.map(o => <option key={o.id} value={o.value}>{o.value}</option>)}</select></div>);
    return (<div><label style={lbl}>{label} {required && <span style={{ color: T.bad }}>*</span>}</label><input value={form[field]} onChange={e => set(field, e.target.value)} placeholder={placeholder} style={inp}/></div>);
  };

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
            <div><div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>New Threat Network</div><div style={{ fontSize: 16, color: T.textSec }}>Create a new entity record</div></div>
          </div>
          <button onClick={onClose} style={{ background: T.surfaceAlt, border: "none", color: T.textSec, cursor: "pointer", padding: 6, borderRadius: T.rs, display: "flex" }}><Icon type="x" size={16}/></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Name <span style={{ color: T.bad }}>*</span></label><input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Sinaloa Cartel" style={inp}/></div>
            <div><label style={lbl}>Acronym</label><input value={form.acronym} onChange={e => set("acronym", e.target.value)} placeholder="e.g. CDS" style={inp}/></div>
            <DD field="category" label="Category" required placeholder="e.g. TCO"/>
            <DD field="subcategory" label="Subcategory" required placeholder="e.g. Drug Trafficking"/>
            <DD field="primary_motivation" label="Primary Motivation" required placeholder="e.g. Financial"/>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Geographic Area of Operations <span style={{ color: T.bad }}>*</span></label><input value={form.geo_area_operations} onChange={e => set("geo_area_operations", e.target.value)} placeholder="e.g. North America, Central America" style={inp}/></div>
            <DD field="network_type" label="Network Type" required placeholder="e.g. Hybrid"/>
            <DD field="status" label="Status" placeholder="e.g. Active"/>
            <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Sources <span style={{ color: T.bad }}>*</span></label><textarea value={form.sources} onChange={e => set("sources", e.target.value)} placeholder="Source references..." rows={2} style={{...inp, resize: "vertical"}}/></div>
          </div>
          {error && <div style={{ marginTop: 16, padding: "14px 20px", background: T.badBg, borderRadius: T.rs, color: T.bad, fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: "20px 32px", borderTop: `1px solid ${T.borderLight}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "12px 24px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleCreate} disabled={!ok || saving} style={{ padding: "12px 24px", background: ok ? T.accent : T.surfaceAlt, border: "none", borderRadius: T.rs, color: ok ? "#fff" : T.textMuted, cursor: ok ? "pointer" : "not-allowed", fontWeight: 600, fontSize: 13, opacity: saving ? .6 : 1, display: "flex", alignItems: "center", gap: 8 }}>{saving ? "Creating..." : <><Icon type="plus" size={14} color={ok ? "#fff" : T.textMuted}/> Create Network</>}</button>
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
  const refOptions = useRefOptions("threat_network");

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
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.textTer, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}><Icon type="back" size={18}/> Back</button>
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
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 4, letterSpacing: -.3 }}>{net.name}</div>
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
        {loading ? <div style={{ textAlign: "center", padding: 48, color: T.textTer }}><div style={{ fontSize: 13, fontWeight: 600 }}>Loading...</div></div> : (<>
          {isEditing && <div style={{ marginBottom: 16, padding: "14px 20px", background: T.accentBg, borderRadius: T.r, border: `1px solid ${T.accent}30`, display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: T.accent }}><Icon type="edit" size={16} color={T.accent}/><span><strong>Edit Mode</strong> — modify fields below. You'll be prompted to cite sources on save.</span></div>}
          {tab === "overview" && <OverviewTab network={net} citations={cits} onCiteClick={setCitPanel} isEditing={isEditing} editValues={editVals} onEditChange={(k,v) => setEditVals(p => ({...p,[k]:v}))} refOptions={refOptions}/>}
          {tab === "model88" && <Model88Tab network={net} citations={cits} onCiteClick={setCitPanel} isEditing={isEditing} editValues={editVals} onEditChange={(k,v) => setEditVals(p => ({...p,[k]:v}))} refOptions={refOptions}/>}
          {tab === "ops" && <OpsTab network={net} citations={cits} onCiteClick={setCitPanel} isEditing={isEditing} editValues={editVals} onEditChange={(k,v) => setEditVals(p => ({...p,[k]:v}))} refOptions={refOptions}/>}
          {tab === "relationships" && <RelationshipsTab network={net} onRefresh={async () => {
            try { const d = await api(`/threat-networks/${net.threat_network_id}`); setNet(d); } catch {}
          }}/>}
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
      <span style={{ fontSize: 14, fontWeight: 600, color, whiteSpace: "nowrap" }}>{cited}/{totalFields} cited ({pct}%)</span>
    </div>
  );
};

// ─── LIST VIEW ───────────────────────────────────────────────────────────────
const ListView = ({ onSelect, compact, selected }) => {
  const [search, setSearch] = useState("");
  const [catF, setCatF] = useState("All");
  const [statF, setStatF] = useState("All");
  const [nets, setNets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const searchRef = useRef(null);
  const dSearch = useDebounce(search, 300);
  const refOptions = useRefOptions("threat_network");

  const categories = ["All", ...(refOptions.category?.values?.map(v => v.value) || CATEGORIES.slice(1))];
  const statuses = ["All", ...(refOptions.status?.values?.map(v => v.value) || STATUSES.slice(1))];

  const fetchNets = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (dSearch) p.set("search", dSearch);
      if (catF !== "All") p.set("category", catF);
      if (statF !== "All") p.set("status", statF);
      const qs = p.toString();
      const r = await api(`/threat-networks${qs ? "?" + qs : ""}`);
      setNets(r.data || []); setTotal(r.total || 0);
    } catch (err) { setError(err.message); setNets([]); }
    finally { setLoading(false); }
  }, [dSearch, catF, statF]);

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
      <div style={{ padding: compact ? "20px 16px 16px" : "28px 36px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        {!compact && (
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
        )}
        {compact && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Networks</div>
              <div style={{ fontSize: 13, color: T.textTer }}>{total} tracked</div>
            </div>
            <button onClick={() => setShowAdd(true)} style={{ padding: "6px 10px", background: T.accent, color: "#fff", border: "none", borderRadius: T.rs, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600 }}>
              <Icon type="plus" size={12} color="#fff"/> Add
            </button>
          </div>
        )}
        {compact ? (
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}/>
        ) : (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><Icon type="search" size={16} color={T.textMuted}/></div>
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, acronym, category, or location..." style={{ width: "100%", boxSizing: "border-box", padding: "12px 18px 12px 44px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color .15s" }} onFocus={e => e.target.style.borderColor = T.borderFocus} onBlur={e => e.target.style.borderColor = T.border}/>
            </div>
            <FilterDD label="Category" value={catF} options={categories} onChange={setCatF}/>
            <FilterDD label="Status" value={statF} options={statuses} onChange={setStatF}/>
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: compact ? "8px" : "20px 36px" }}>
        {error ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ color: T.bad, fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
            <div style={{ color: T.textTer, fontSize: 13 }}>{error}</div>
            <button onClick={fetchNets} style={{ marginTop: 16, padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, cursor: "pointer", fontSize: 13 }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: 48, color: T.textTer }}><div style={{ fontSize: 13, fontWeight: 600 }}>Loading...</div></div>
        ) : !nets.length ? (
          <div style={{ textAlign: "center", padding: 48, color: T.textTer }}>No networks match your filters.</div>
        ) : compact ? (
          /* Compact: simple list items */
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {nets.map(n => {
              const isSelected = selected && selected.threat_network_id === n.threat_network_id;
              return (
                <button key={n.threat_network_id} onClick={() => onSelect(n)} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", background: isSelected ? T.accentBg : "transparent",
                  border: isSelected ? `1px solid ${T.accent}40` : `1px solid transparent`,
                  borderRadius: T.rs, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  transition: "all .12s",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500, color: isSelected ? T.accent : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.name}</div>
                    <div style={{ fontSize: 13, color: T.textTer, marginTop: 2 }}>{n.category}{n.acronym ? ` · ${n.acronym}` : ""}</div>
                  </div>
                  <Badge color={statColor(n.status)}>{n.status || "—"}</Badge>
                </button>
              );
            })}
          </div>
        ) : (
          /* Full: grid rows */
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
                  <div><div style={{ fontWeight: 600, marginBottom: 2 }}>{n.name}</div>{n.acronym && <div style={{ fontSize: 13, color: T.textTer }}>{n.acronym}</div>}</div>
                  <Badge color={T.textSec} bg={T.surfaceAlt}>{n.category}</Badge>
                  <Badge color={sC}>{n.status}</Badge>
                  <Badge color={vC}>{n.violence}</Badge>
                  <span style={{ fontSize: 14, color: T.textSec }}>{n.hq_location?.split(",")[0]}</span>
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
    icon: "users", pk: "person_interest_id", refTableName: "person_interest",
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
    icon: "building", pk: "organization_interest_id", refTableName: "organization_interest",
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
    icon: "globe", pk: "country_id", refTableName: "country",
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
    icon: "map", pk: "threat_boundary_id", refTableName: "threat_boundary",
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
    icon: "target", pk: "threat_subclass_id", refTableName: "threat_subclass",
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
  sources_entity: {
    key: "sources_entity", apiPath: "sources", label: "Sources", singular: "Source",
    icon: "cite", pk: "source_id", refTableName: "source",
    columns: [
      { key: "name", label: "Name", list: true },
      { key: "type", label: "Type", list: true },
      { key: "status", label: "Status", list: true, badge: true },
      { key: "primary_lea", label: "Lead LEA", list: true },
    ],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "type", label: "Type" },
      { key: "motive", label: "Motive" }, { key: "description", label: "Description", type: "text", required: true },
      { key: "time_frame", label: "Time Frame" }, { key: "status", label: "Status" },
      { key: "geo_level", label: "Geographic Level" }, { key: "geo_notes", label: "Geo Notes", type: "text" },
      { key: "primary_lea", label: "Primary LEA" }, { key: "lea_cooperation", label: "LEA Cooperation" },
      { key: "lea_notes", label: "LEA Notes", type: "text" },
      { key: "fi_exploitation_ind", label: "FI Exploitation?" }, { key: "fi_expl_notes", label: "FI Exploitation Notes", type: "text" },
      { key: "fi_consequence", label: "FI Consequence" }, { key: "fi_internal_threat", label: "FI Internal Threat" },
      { key: "fi_internal_notes", label: "FI Internal Notes", type: "text" },
      { key: "link_terrorism_ind", label: "Terrorism Link?" }, { key: "terr_notes", label: "Terrorism Notes", type: "text" },
      { key: "ofac_sanctions", label: "OFAC Sanctions" }, { key: "ofac_sanctions_status", label: "OFAC Status" },
      { key: "un_sanctions", label: "UN Sanctions" }, { key: "un_sanctions_status", label: "UN Status" },
      { key: "eu_sanctions", label: "EU Sanctions" }, { key: "eu_sanctions_status", label: "EU Status" },
      { key: "uk_sanctions", label: "UK Sanctions" }, { key: "sanction_general_notes", label: "Sanctions Notes", type: "text" },
      { key: "corruption_link_ind", label: "Corruption Link?" }, { key: "corruption_notes", label: "Corruption Notes", type: "text" },
    ],
    createFields: ["name", "type", "description", "status", "primary_lea"],
  },
  fi: {
    key: "fi", apiPath: "fi", label: "Financial Institutions", singular: "Financial Institution",
    icon: "building", pk: "fi_id", refTableName: "financial_institution",
    columns: [
      { key: "name", label: "Name", list: true },
      { key: "type", label: "Type", list: true },
      { key: "hq_location", label: "HQ Location", list: true },
      { key: "regulatory_status", label: "Regulatory Status", list: true, badge: true },
    ],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "type", label: "Type" },
      { key: "hq_location", label: "HQ Location" }, { key: "market_coverage", label: "Market Coverage" },
      { key: "regulatory_status", label: "Regulatory Status" }, { key: "general_notes", label: "General Notes", type: "text" },
    ],
    createFields: ["name", "type", "hq_location", "regulatory_status"],
  },
  continents: {
    key: "continents", apiPath: "continents", label: "Continents", singular: "Continent",
    icon: "globe", pk: "continent_id", refTableName: "continent",
    columns: [
      { key: "name", label: "Name", list: true },
    ],
    fields: [
      { key: "name", label: "Name", required: true },
    ],
    createFields: ["name"],
  },
  regions: {
    key: "regions", apiPath: "regions", label: "Regions", singular: "Region",
    icon: "globe", pk: "region_id", refTableName: "region",
    columns: [
      { key: "name", label: "Name", list: true },
      { key: "continent_id", label: "Continent ID", list: true },
    ],
    fields: [
      { key: "name", label: "Name", required: true }, { key: "continent_id", label: "Continent ID", required: true },
    ],
    createFields: ["name", "continent_id"],
  },
};

// ─── ENTITY LIST VIEW ────────────────────────────────────────────────────────
const EntityListView = ({ def, onSelect, compact, selected }) => {
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
      <div style={{ padding: compact ? "20px 16px 16px" : "28px 36px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        {!compact && (
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
        )}
        {compact && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{def.label}</div>
              <div style={{ fontSize: 13, color: T.textTer }}>{total} records</div>
            </div>
            <button onClick={() => setShowAdd(true)} style={{ padding: "6px 10px", background: T.accent, color: "#fff", border: "none", borderRadius: T.rs, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600 }}>
              <Icon type="plus" size={12} color="#fff"/> Add
            </button>
          </div>
        )}
        {compact ? (
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search...`} style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}/>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><Icon type="search" size={16} color={T.textMuted}/></div>
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${def.label.toLowerCase()}...`} style={{ width: "100%", boxSizing: "border-box", padding: "14px 18px 14px 44px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.r, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color .15s" }} onFocus={e => e.target.style.borderColor = T.borderFocus} onBlur={e => e.target.style.borderColor = T.border}/>
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: compact ? "8px" : "20px 36px" }}>
        {error ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div style={{ color: T.bad, fontWeight: 600, marginBottom: 8 }}>Failed to load</div>
            <div style={{ color: T.textTer, fontSize: 13 }}>{error}</div>
            <button onClick={fetch_} style={{ marginTop: 16, padding: "12px 22px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, cursor: "pointer", fontSize: 13 }}>Retry</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: "center", padding: 48, color: T.textTer }}><div style={{ fontSize: 13, fontWeight: 600 }}>Loading...</div></div>
        ) : !items.length ? (
          <div style={{ textAlign: "center", padding: 48, color: T.textTer }}>No {def.label.toLowerCase()} found.</div>
        ) : compact ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map(item => {
              const isSelected = selected && selected[def.pk] === item[def.pk];
              const badgeCol = listCols.find(c => c.badge);
              return (
                <button key={item[def.pk]} onClick={() => onSelect(item)} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", background: isSelected ? T.accentBg : "transparent",
                  border: isSelected ? `1px solid ${T.accent}40` : `1px solid transparent`,
                  borderRadius: T.rs, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                  transition: "all .12s",
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500, color: isSelected ? T.accent : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name || item[def.pk]}</div>
                    {listCols[1] && !listCols[1].badge && <div style={{ fontSize: 13, color: T.textTer, marginTop: 2 }}>{item[listCols[1].key] || ""}</div>}
                  </div>
                  {badgeCol && <Badge color={statColor(item[badgeCol.key])}>{item[badgeCol.key] || "—"}</Badge>}
                </button>
              );
            })}
          </div>
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
  const refOptions = useRefOptions(def.refTableName);
  const set = (k, v) => setForm(p => ({...p, [k]: v}));
  const inp = { width: "100%", padding: "14px 16px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const sel = { ...inp, cursor: "pointer", appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%238b92a8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: 12, paddingRight: 36 };
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

  const renderField = (f) => {
    const opts = refOptions[f.key]?.values;
    if (f.type === "text") return <textarea value={form[f.key]} onChange={e => set(f.key, e.target.value)} rows={3} style={{...inp, resize: "vertical"}}/>;
    if (opts?.length) return <select value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={sel}><option value="">— Select —</option>{opts.map(o => <option key={o.id} value={o.value}>{o.value}</option>)}</select>;
    return <input value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={inp}/>;
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", backdropFilter: "blur(4px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 580, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: T.shL, overflow: "hidden" }}>
        <div style={{ padding: "28px 32px 24px", borderBottom: `1px solid ${T.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: 12, background: T.accentBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon type={def.icon} size={22} color={T.accent}/></div>
            <div><div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>New {def.singular}</div></div>
          </div>
          <button onClick={onClose} style={{ background: T.surfaceAlt, border: "none", color: T.textSec, cursor: "pointer", padding: 6, borderRadius: T.rs, display: "flex" }}><Icon type="x" size={16}/></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {createFieldDefs.map(f => (
              <div key={f.key}>
                <label style={lbl}>{f.label} {f.required && <span style={{ color: T.bad }}>*</span>}</label>
                {renderField(f)}
              </div>
            ))}
          </div>
          {error && <div style={{ marginTop: 16, padding: "14px 20px", background: T.badBg, borderRadius: T.rs, color: T.bad, fontSize: 13 }}>{error}</div>}
        </div>
        <div style={{ padding: "20px 32px", borderTop: `1px solid ${T.borderLight}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "12px 24px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Cancel</button>
          <button onClick={handleCreate} disabled={!reqFilled || saving} style={{ padding: "12px 24px", background: reqFilled ? T.accent : T.surfaceAlt, border: "none", borderRadius: T.rs, color: reqFilled ? "#fff" : T.textMuted, cursor: reqFilled ? "pointer" : "not-allowed", fontWeight: 600, fontSize: 13, opacity: saving ? .6 : 1 }}>{saving ? "Creating..." : `Create ${def.singular}`}</button>
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
  const refOptions = useRefOptions(def.refTableName);

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
  const sel = { ...inp, cursor: "pointer", appearance: "none", WebkitAppearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%238b92a8' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center", backgroundSize: 12, paddingRight: 36 };

  const renderEditField = (f, val) => {
    if (f.type === "text") return <textarea value={editVals[f.key] ?? val ?? ""} onChange={e => setEditVals(p => ({...p, [f.key]: e.target.value}))} rows={3} style={{...inp, resize: "vertical"}}/>;
    const opts = refOptions[f.key]?.values;
    if (opts?.length) return <select value={editVals[f.key] ?? val ?? ""} onChange={e => setEditVals(p => ({...p, [f.key]: e.target.value}))} style={sel}><option value="">— Select —</option>{opts.map(o => <option key={o.id} value={o.value}>{o.value}</option>)}</select>;
    return <input value={editVals[f.key] ?? val ?? ""} onChange={e => setEditVals(p => ({...p, [f.key]: e.target.value}))} style={inp}/>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "24px 36px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: T.textTer, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}><Icon type="back" size={18}/> Back</button>
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
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -.3 }}>{item.name}</div>
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
                    {isEditing ? renderEditField(f, val) : (
                      <div style={{ fontSize: 13, color: dv ? T.text : T.textMuted, lineHeight: 1.65 }}>{dv || "—"}</div>
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
const NAV_SECTIONS = [
  { id: "threat", label: "THREAT LAYERS", items: [
    { key: "networks", label: "Threat Networks", icon: "shield" },
    { key: "persons", label: "Persons", icon: "users" },
    { key: "organizations", label: "Organizations", icon: "building" },
    { key: "boundaries", label: "Boundaries", icon: "map" },
    { key: "threat_class", label: "Threat Classification", icon: "layers" },
    { key: "subclasses", label: "Threat Subclass", icon: "target" },
  ]},
  { id: "htf", label: "HTF REFERENCE", items: [
    { key: "roles_ref", label: "Roles", icon: "users" },
    { key: "ttp_ref", label: "TTP", icon: "alert" },
    { key: "ttp_record_ref", label: "TTP Record", icon: "file" },
    { key: "ttp_signal_ref", label: "TTP Signal", icon: "search" },
    { key: "sources_entity", label: "Sources", icon: "cite" },
  ]},
  { id: "admin", label: "ADMINISTRATION", items: [
    { key: "ref_tables", label: "Lookup Tables", icon: "settings" },
    { key: "continents", label: "Continents", icon: "globe" },
    { key: "regions", label: "Regions", icon: "globe" },
    { key: "countries", label: "Countries", icon: "globe" },
    { key: "fi", label: "Financial Institutions", icon: "building" },
  ]},
];

const Sidebar = ({ active, onNav }) => {
  const [collapsed, setCollapsed] = useState({});
  const [expandedSub, setExpandedSub] = useState(null);

  const activeSub = NAV_SECTIONS.flatMap(s => s.items).find(i => i.children && i.children.some(c => c.key === active));

  const toggle = (id) => setCollapsed(p => ({ ...p, [id]: p[id] === undefined ? true : !p[id] }));
  const toggleSub = (key) => setExpandedSub(p => p === key ? null : key);

  const chevron = (open) => (
    <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, flexShrink: 0, transition: "transform .2s ease", transform: open ? "rotate(90deg)" : "rotate(0deg)", opacity: .5 }}>
      <polyline points="9 18 15 12 9 6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const isActive = (key) => active === key;

  const navBtn = (item, indent = 0) => {
    const act = isActive(item.key);
    return (
      <button key={item.key} onClick={() => onNav(item.key)} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: `8px 12px 8px ${12 + indent}px`, marginBottom: 2,
        background: act ? T.sidebarAccentBg : "transparent",
        border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
        fontSize: indent ? 13.5 : 14.5, fontWeight: act ? 600 : 400,
        color: act ? T.sidebarAccent : T.sidebarText,
        transition: "all .15s ease", textAlign: "left", letterSpacing: .1,
        borderLeft: act ? `2px solid ${T.sidebarAccent}` : "2px solid transparent",
      }}>
        <Icon type={item.icon} size={indent ? 14 : 15} color={act ? T.sidebarAccent : T.sidebarTextDim}/>
        {item.label}
      </button>
    );
  };

  return (
    <div style={{
      width: 240, background: T.sidebarBg, display: "flex", flexDirection: "column",
      flexShrink: 0, overflow: "auto", borderRight: `1px solid ${T.sidebarBorder}`,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #d4a04a 0%, #e0b35a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(212,160,74,.3)",
          }}>
            <Icon type="shield" size={16} color="#0c1018"/>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: T.sidebarTextBright, letterSpacing: -.2 }}>Hybrid Threat</div>
            <div style={{ fontSize: 11, color: T.sidebarTextDim, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5 }}>Central</div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: T.sidebarBorder, margin: "0 16px 8px" }}/>

      {/* Navigation */}
      <div style={{ padding: "4px 10px 20px", flex: 1 }}>
        {NAV_SECTIONS.map(section => {
          const isOpen = collapsed[section.id] === undefined ? true : !collapsed[section.id];
          return (
            <div key={section.id} style={{ marginBottom: 4 }}>
              <button onClick={() => toggle(section.id)} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 10px 6px", background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit",
              }}>
                <span style={{
                  fontSize: 12, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: 1.8, color: T.sidebarTextDim,
                }}>{section.label}</span>
                <span style={{ color: T.sidebarTextDim }}>{chevron(isOpen)}</span>
              </button>
              <div style={{
                overflow: "hidden", maxHeight: isOpen ? 500 : 0,
                transition: "max-height .25s ease",
              }}>
                {section.items.map(item => {
                  if (item.children) {
                    const subOpen = expandedSub === item.key || (activeSub && activeSub.key === item.key);
                    return (
                      <div key={item.key}>
                        <button onClick={() => toggleSub(item.key)} style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px", marginBottom: 2, background: "transparent",
                          border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                          fontSize: 14, fontWeight: 400, color: T.sidebarText,
                          transition: "all .15s ease", textAlign: "left",
                          borderLeft: "2px solid transparent",
                        }}>
                          <Icon type={item.icon} size={15} color={T.sidebarTextDim}/>
                          <span style={{ flex: 1 }}>{item.label}</span>
                          <span style={{ color: T.sidebarTextDim }}>{chevron(subOpen)}</span>
                        </button>
                        <div style={{
                          overflow: "hidden", maxHeight: subOpen ? 200 : 0,
                          transition: "max-height .2s ease", paddingLeft: 4,
                        }}>
                          {item.children.map(child => navBtn(child, 16))}
                        </div>
                      </div>
                    );
                  }
                  return navBtn(item);
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px 16px", borderTop: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ fontSize: 11, color: T.sidebarTextDim, letterSpacing: .5 }}>HTF Central v2.0</div>
      </div>
    </div>
  );
};

// ─── HTF REFERENCE TABLE VIEW ────────────────────────────────────────────────
const HTF_TABLE_META = {
  threat_class: { key: "threat_classification", label: "Threat Classification",
    cols: [
      { key: "code", label: "Code", width: 60 },
      { key: "name", label: "Name", width: 180 },
      { key: "description", label: "Description", flex: 1 },
      { key: "example", label: "Example", flex: 1 },
      { key: "priority", label: "Priority", width: 70 },
    ],
    editFields: ["code", "name", "description", "example", "priority", "notes"],
  },
  roles_ref: { key: "roles", label: "Roles",
    cols: [
      { key: "code", label: "#", width: 40 },
      { key: "name", label: "Role", width: 200 },
      { key: "hierarchy", label: "Hierarchy", width: 120 },
      { key: "ml_phase", label: "ML Phase", width: 140 },
      { key: "intent", label: "Intent", width: 100 },
      { key: "description", label: "Description", flex: 1 },
    ],
    editFields: ["code", "name", "description", "context", "hierarchy", "ml_phase", "intent"],
  },
  ttp_ref: { key: "ttp", label: "TTP",
    cols: [
      { key: "name", label: "TTP", width: 220 },
      { key: "complexity_level", label: "Complexity", width: 90 },
      { key: "hierarchy", label: "Hierarchy", width: 100 },
      { key: "stage", label: "Stage", width: 100 },
      { key: "scheme", label: "Scheme", width: 160 },
      { key: "fi_detectible", label: "FI Det.", width: 60 },
    ],
    editFields: ["name", "definition", "complexity_level", "hierarchy", "stage", "scheme", "tactical_category", "fi_detectible"],
  },
  ttp_signal_ref: { key: "ttp_signal", label: "TTP Signal",
    cols: [
      { key: "ttp_signal_name", label: "Signal Name", width: 180 },
      { key: "ttp_signal_family", label: "Family", width: 140 },
      { key: "ttp_signal_description", label: "Description", flex: 1 },
    ],
    editFields: ["ttp_signal_name", "ttp_signal_description", "ttp_signal_family"],
  },
  ttp_record_ref: { key: "ttp_record", label: "TTP Record",
    cols: [
      { key: "role_name", label: "Role", width: 130 },
      { key: "subclass_name", label: "Subclass", width: 130 },
      { key: "ttp_name", label: "TTP", width: 140 },
      { key: "echelon", label: "Echelon", width: 80 },
      { key: "confidence_score", label: "Conf.", width: 50 },
      { key: "description", label: "Description", flex: 1 },
    ],
    editFields: ["role_id", "threat_subclass_id", "ttp_id", "source_id", "person_interest_id", "organization_interest_id", "threat_classification_id", "threat_subclassification_id", "echelon", "description", "detection_logic", "financial_products", "financial_channels", "supporting_quotes", "confidence_score", "extraction_date", "extractor_model_version", "user_id"],
    fkFields: true,
  },
};

const HtfTableView = ({ navKey }) => {
  const meta = HTF_TABLE_META[navKey];

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [selectedPk, setSelectedPk] = useState(null);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  // FK lookups for ttp_record
  const [fkData, setFkData] = useState({});
  // Field lookups (e.g. threat_classification dropdown on subclassification)
  const [fieldLookupData, setFieldLookupData] = useState({});

  const fetchRows = async () => {
    if (!meta) return;
    setLoading(true);
    try {
      const r = await api(`/htf/${meta.key}`);
      setRows(r.data || []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  };

  const fetchFkData = async () => {
    if (!meta.fkFields || Object.keys(fkData).length) return;
    try {
      const [roles, subs, ttps, signals, sources, persons, orgs, tclasses] = await Promise.all([
        api('/htf/roles'), api('/htf/threat_subclassification'), api('/htf/ttp'),
        api('/htf/ttp_signal'), api('/provenance/sources'),
        api('/junctions/lookup/persons').then(r => r.items).catch(() => []),
        api('/junctions/lookup/organizations').then(r => r.items).catch(() => []),
        api('/htf/threat_classification').then(r => r.data).catch(() => []),
      ]);
      setFkData({
        roles: roles.data || [], subclasses: subs.data || [], ttps: ttps.data || [],
        signals: signals.data || [], sources: sources || [],
        persons: persons || [], orgs: orgs || [], tclasses: tclasses || [],
      });
    } catch {}
  };

  const fetchFieldLookups = async () => {
    if (!meta || !meta.fieldLookups || Object.keys(fieldLookupData).length) return;
    const entries = Object.entries(meta.fieldLookups);
    const results = {};
    for (const [field, cfg] of entries) {
      try {
        const r = await api(cfg.endpoint);
        results[field] = (r.data || []).map(row => row[cfg.valueKey]);
      } catch { results[field] = []; }
    }
    setFieldLookupData(results);
  };

  useEffect(() => { if (!meta) return; fetchRows(); fetchFieldLookups(); setSearch(""); setSelectedPk(null); setAdding(false); setEditId(null); }, [meta?.key]);

  // Client-side search: match any field value
  const dSearch = useDebounce(search, 200);
  const filtered = dSearch
    ? rows.filter(row => {
        const term = dSearch.toLowerCase();
        return Object.values(row).some(v => v != null && String(v).toLowerCase().includes(term));
      })
    : rows;

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const cancel = () => { setAdding(false); setEditId(null); setForm({}); };

  const handleAdd = async () => {
    setSaving(true);
    try {
      await api(`/htf/${meta.key}`, { method: "POST", body: JSON.stringify({ ...form, user_id: 1 }) });
      cancel(); fetchRows();
    } catch (err) { alert("Failed: " + err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async (pk) => {
    setSaving(true);
    try {
      await api(`/htf/${meta.key}/${pk}`, { method: "PUT", body: JSON.stringify({ ...form, user_id: 1 }) });
      cancel(); fetchRows();
    } catch (err) { alert("Failed: " + err.message); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (pk) => {
    if (!confirm("Deactivate this record?")) return;
    try {
      await api(`/htf/${meta.key}/${pk}`, { method: "DELETE", body: JSON.stringify({ user_id: 1 }) });
      fetchRows();
    } catch (err) { alert("Failed: " + err.message); }
  };

  const inp = { width: "100%", padding: "8px 12px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" };
  const btnS = { padding: "6px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, borderRadius: T.rs };
  const pkField = meta ? (meta.key === "threat_classification" ? "threat_class_id" : meta.key === "threat_subclassification" ? "threat_subclass_id" : meta.key === "roles" ? "role_id" : meta.key === "ttp" ? "ttp_id" : meta.key === "ttp_signal" ? "ttp_signal_id" : "ttp_record_id") : "id";

  const FkSelect = ({ field, value, onChange }) => {
    const map = {
      role_id: { items: fkData.roles||[], pk: "role_id", label: "name" },
      threat_subclass_id: { items: fkData.subclasses||[], pk: "threat_subclass_id", label: "name" },
      threat_subclassification_id: { items: fkData.subclasses||[], pk: "threat_subclass_id", label: "name" },
      ttp_id: { items: fkData.ttps||[], pk: "ttp_id", label: "name" },
      ttp_signal_id: { items: fkData.signals||[], pk: "ttp_signal_id", label: "ttp_signal_name" },
      source_id: { items: fkData.sources||[], pk: "source_id", label: "source_name" },
      person_interest_id: { items: fkData.persons||[], pk: "id", label: "name" },
      organization_interest_id: { items: fkData.orgs||[], pk: "id", label: "name" },
      threat_classification_id: { items: fkData.tclasses||[], pk: "threat_class_id", label: "name" },
    };
    const m = map[field];
    if (!m) return <input value={value||""} onChange={e => onChange(e.target.value)} style={inp}/>;
    return <select value={value||""} onChange={e => onChange(e.target.value)} style={{...inp, cursor: "pointer"}}><option value="">— Select —</option>{m.items.map(i => <option key={i[m.pk]} value={i[m.pk]}>{i[m.label]}</option>)}</select>;
  };

  const renderFormFields = () => (
    <div style={{ display: "grid", gridTemplateColumns: meta.fkFields ? "1fr 1fr" : "1fr 1fr 1fr", gap: 10 }}>
      {meta.editFields.map(f => {
        const isFk = ["role_id","threat_subclass_id","threat_subclassification_id","ttp_id","ttp_signal_id","source_id","person_interest_id","organization_interest_id","threat_classification_id"].includes(f);
        const isLong = ["description","definition","detection_logic","notes","example","supporting_quotes","financial_products","financial_channels"].includes(f);
        const lookupOpts = fieldLookupData[f];
        return (
          <div key={f} style={isLong ? { gridColumn: "1 / -1" } : {}}>
            <label style={{ fontSize: 12, fontWeight: 700, color: T.textTer, textTransform: "uppercase", letterSpacing: .5, marginBottom: 3, display: "block" }}>{f.replace(/_/g, " ")}</label>
            {isFk ? <FkSelect field={f} value={form[f]} onChange={v => set(f, v)}/> :
             lookupOpts ? <select value={form[f]||""} onChange={e => set(f, e.target.value)} style={{...inp, cursor: "pointer"}}><option value="">— Select —</option>{lookupOpts.map(v => <option key={v} value={v}>{v}</option>)}</select> :
             isLong ? <textarea value={form[f]||""} onChange={e => set(f, e.target.value)} rows={2} style={{...inp, resize: "vertical"}}/> :
             <input value={form[f]||""} onChange={e => set(f, e.target.value)} style={inp}/>}
          </div>
        );
      })}
    </div>
  );

  if (!meta) return null;

  const selectedRow = rows.find(r => r[pkField] === selectedPk);
  const nameField = meta.cols[0]?.key || "name";

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Left: list panel */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.border}` }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${T.border}`, background: T.surface }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{meta.label}</div>
              <div style={{ fontSize: 13, color: T.textTer }}>{dSearch ? `${filtered.length} of ${rows.length}` : rows.length} records</div>
            </div>
            <button onClick={() => { setAdding(true); setEditId(null); setForm({}); setSelectedPk(null); if (meta.fkFields) fetchFkData(); fetchFieldLookups(); }} style={{ padding: "6px 10px", background: T.accent, color: "#fff", border: "none", borderRadius: T.rs, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600 }}>
              <Icon type="plus" size={12} color="#fff"/> Add
            </button>
          </div>
          <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none" }}/>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {loading ? <div style={{ padding: 20, textAlign: "center", color: T.textTer }}>Loading...</div> :
          filtered.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: T.textTer }}>No records found.</div> :
          filtered.map(row => {
            const pk = row[pkField];
            const isSelected = selectedPk === pk;
            return (
              <button key={pk} onClick={() => { setSelectedPk(pk); setAdding(false); setEditId(null); }} style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px", marginBottom: 2,
                background: isSelected ? T.accentBg : "transparent",
                border: isSelected ? `1px solid ${T.accent}40` : "1px solid transparent",
                borderRadius: T.rs, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                transition: "all .12s",
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: isSelected ? 600 : 500, color: isSelected ? T.accent : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {row[nameField] || row.name || `#${pk}`}
                  </div>
                  {meta.cols[1] && <div style={{ fontSize: 14, color: T.textTer, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row[meta.cols[1].key] || ""}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: detail/edit area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {adding ? (
          <div style={{ flex: 1, overflow: "auto", padding: "28px 36px" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.text, marginBottom: 20 }}>New {meta.label} Record</div>
            <Card>
              <div style={{ padding: 4 }}>
                {renderFormFields()}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                  <button onClick={cancel} style={{...btnS, color: T.textTer, padding: "8px 16px"}}>Cancel</button>
                  <button onClick={handleAdd} disabled={saving} style={{...btnS, background: T.accent, color: "#fff", padding: "8px 16px", opacity: saving ? .6 : 1}}>{saving ? "Saving..." : "Save"}</button>
                </div>
              </div>
            </Card>
          </div>
        ) : selectedRow ? (
          <div style={{ flex: 1, overflow: "auto" }}>
            <div style={{ padding: "24px 32px", borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.text }}>{selectedRow[nameField] || selectedRow.name || `Record #${selectedPk}`}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setEditId(selectedPk); setForm({...selectedRow}); if (meta.fkFields) fetchFkData(); fetchFieldLookups(); }} style={{...btnS, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.accent, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}><Icon type="edit" size={13} color={T.accent}/> Edit</button>
                <button onClick={() => handleDeactivate(selectedPk)} style={{...btnS, color: T.bad, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}><Icon type="trash" size={13} color={T.bad}/> Delete</button>
              </div>
            </div>
            <div style={{ padding: "24px 32px" }}>
              {editId === selectedPk ? (
                <Card>
                  <div style={{ padding: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 12 }}>Edit Record</div>
                    {renderFormFields()}
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                      <button onClick={cancel} style={{...btnS, color: T.textTer, padding: "8px 16px"}}>Cancel</button>
                      <button onClick={() => handleEdit(selectedPk)} disabled={saving} style={{...btnS, background: T.accent, color: "#fff", padding: "8px 16px", opacity: saving ? .6 : 1}}>{saving ? "Saving..." : "Save"}</button>
                    </div>
                  </div>
                </Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {meta.editFields.map(f => {
                    const val = selectedRow[f];
                    if (val === null || val === undefined || val === "") return null;
                    return (
                      <div key={f} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                        <div style={{ width: 180, flexShrink: 0, fontSize: 13, fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: .5, paddingTop: 2 }}>{f.replace(/_/g, " ")}</div>
                        <div style={{ flex: 1, fontSize: 15, color: T.text, lineHeight: 1.6 }}>{String(val)}</div>
                      </div>
                    );
                  })}
                  {/* Show all cols too in case they differ from editFields */}
                  {meta.cols.filter(c => !meta.editFields.includes(c.key)).map(c => {
                    const val = selectedRow[c.key];
                    if (val === null || val === undefined || val === "") return null;
                    return (
                      <div key={c.key} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.borderLight}` }}>
                        <div style={{ width: 180, flexShrink: 0, fontSize: 13, fontWeight: 600, color: T.textTer, textTransform: "uppercase", letterSpacing: .5, paddingTop: 2 }}>{c.label}</div>
                        <div style={{ flex: 1, fontSize: 15, color: T.text, lineHeight: 1.6 }}>{String(val)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textTer }}>
            <div style={{ textAlign: "center" }}>
              <Icon type="layers" size={40} color={T.textMuted}/>
              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Select a record</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Choose from the list to view details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
            <div><h1 style={{ fontSize: 24, fontWeight: 700, color: T.text, margin: 0 }}>Reference Tables</h1><div style={{ fontSize: 22, color: T.textTer }}>{tables.length} lookup tables</div></div>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter tables..." style={{ ...inp, background: T.surfaceAlt }} />
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {loading ? <div style={{ padding: 20, textAlign: "center", color: T.textTer }}>Loading...</div> :
          filteredTables.map(t => (
            <button key={t.table_name} onClick={() => loadValues(t.table_name)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", marginBottom: 2, background: selected === t.table_name ? T.accentBg : "transparent", border: "none", borderRadius: T.rs, cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: selected === t.table_name ? 600 : 400, color: selected === t.table_name ? T.accent : T.text, textAlign: "left", transition: "all .12s" }}>
              <span style={{ textTransform: "capitalize" }}>{t.display_name}</span>
              <span style={{ fontSize: 13, color: T.textTer, background: T.surfaceAlt, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>{t.active_count}</span>
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
              <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Select a reference table</div>
              <div style={{ fontSize: 14, marginTop: 4 }}>Choose from the list to view and manage values</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "24px 32px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: T.text, textTransform: "capitalize" }}>{selected.replace(/_/g, " ")}</div>
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
                      <button onClick={handleAdd} disabled={!addForm.value || addSaving} style={{ padding: "8px 14px", background: addForm.value ? T.accent : T.surfaceAlt, border: "none", borderRadius: T.rs, color: "#fff", cursor: addForm.value ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 600, opacity: addSaving ? .6 : 1 }}>{addSaving ? "..." : "Add"}</button>
                      <button onClick={() => setShowAdd(false)} style={{ padding: "10px 14px", background: "transparent", border: "none", color: T.textTer, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    </div>
                  )}
                  {/* Values */}
                  {values.map(v => editingId === v.id ? (
                    <div key={v.id} style={{ display: "grid", gridTemplateColumns: "50px 1fr 1.5fr 80px 80px 60px", gap: 12, padding: "14px 16px", background: T.accentBg, borderRadius: T.rs, border: `2px solid ${T.accent}`, alignItems: "center" }}>
                      <input value={editForm.display_order} onChange={e => setEditForm(p => ({...p, display_order: parseInt(e.target.value)||0}))} type="number" style={{...inp, padding: "8px 10px", textAlign: "center", width: 50}}/>
                      <input value={editForm.value} onChange={e => setEditForm(p => ({...p, value: e.target.value}))} style={{...inp, padding: "8px 10px"}}/>
                      <input value={editForm.description} onChange={e => setEditForm(p => ({...p, description: e.target.value}))} style={{...inp, padding: "8px 10px"}}/>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}><input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm(p => ({...p, is_active: e.target.checked}))}/> Active</label>
                      <button onClick={saveEdit} disabled={editSaving} style={{ padding: "8px 14px", background: T.accent, border: "none", borderRadius: T.rs, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: editSaving ? .6 : 1 }}>{editSaving ? "..." : "Save"}</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: "10px 14px", background: "transparent", border: "none", color: T.textTer, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                    </div>
                  ) : (
                    <div key={v.id} style={{ display: "grid", gridTemplateColumns: "50px 1fr 1.5fr 80px 80px 60px", gap: 12, padding: "14px 16px", background: T.surface, borderRadius: T.rs, border: `1px solid ${T.borderLight}`, alignItems: "center", opacity: v.is_active ? 1 : 0.5 }}>
                      <span style={{ fontSize: 13, color: T.textTer, textAlign: "center" }}>{v.display_order}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{v.value}</span>
                      <span style={{ fontSize: 14, color: T.textSec }}>{v.description || "—"}</span>
                      <Badge color={v.is_active ? T.ok : T.textMuted}>{v.is_active ? "Active" : "Inactive"}</Badge>
                      <button onClick={() => startEdit(v)} style={{ padding: "7px 12px", background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: T.rs, color: T.textSec, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Edit</button>
                      <button onClick={() => toggleActive(v)} style={{ padding: "7px 12px", background: "transparent", border: "none", color: v.is_active ? T.warn : T.ok, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>{v.is_active ? "Disable" : "Enable"}</button>
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
      return (
        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.border}` }}>
            <ListView onSelect={setSelectedNetwork} compact selected={selectedNetwork}/>
          </div>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {selectedNetwork ? (
              <DetailView networkSummary={selectedNetwork} onBack={() => setSelectedNetwork(null)}/>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textTer }}>
                <div style={{ textAlign: "center" }}>
                  <Icon type="shield" size={40} color={T.textMuted}/>
                  <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Select a threat network</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>Choose from the list to view details</div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    if (nav === "ref_tables") return <RefTablesView/>;
    if (HTF_TABLE_META[nav]) return <HtfTableView key={nav} navKey={nav}/>;
    const def = ENTITY_DEFS[nav];
    if (def) {
      return (
        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${T.border}` }}>
            <EntityListView def={def} onSelect={setSelectedEntity} compact selected={selectedEntity}/>
          </div>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {selectedEntity ? (
              <EntityDetailView def={def} item={selectedEntity} onBack={() => setSelectedEntity(null)}/>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.textTer }}>
                <div style={{ textAlign: "center" }}>
                  <Icon type={def.icon} size={40} color={T.textMuted}/>
                  <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>Select a {def.singular?.toLowerCase() || "record"}</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>Choose from the list to view details</div>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: T.bg, color: T.text, height: "100vh", width: "100vw", display: "flex", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.textMuted}; }
        input::placeholder, textarea::placeholder { color: ${T.textMuted}; }
        select, input, textarea, button { font-family: inherit; }
        button { transition: all .15s ease; }
        button:hover { filter: brightness(1.08); }
        @keyframes slideIn { from { transform: translateX(16px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <Sidebar active={nav} onNav={handleNav}/>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {renderContent()}
      </div>
    </div>
  );
}
