import { useState, useEffect, useCallback } from 'react';
import ThreatNetworkApp from './threat_network_ui';
import LoginScreen from './LoginScreen';

const API = 'https://threat-network-api-807423602117.us-central1.run.app';
const INACTIVITY_WARNING_MS = 90 * 60 * 1000;
const INACTIVITY_TIMEOUT_MS = 120 * 60 * 1000;

// Store session ID - persists across /auth/me calls
let sessionId: string | null = localStorage.getItem('sid');

export async function apiFetch(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  if (sessionId) headers['x-session-id'] = sessionId;

  const r = await fetch(`${API}${path}`, {
    ...opts,
    credentials: 'include',
    headers,
  });

  if (r.status === 401) {
    localStorage.removeItem('sid');
    window.location.href = '/?error=session_expired';
    return;
  }
  if (r.status === 403) throw new Error('You do not have permission to perform this action');
  if (!r.ok) {
    const b = await r.json().catch(() => ({}));
    throw new Error((b as any).error || `API ${r.status}`);
  }
  return r.json();
}

export default function App() {
  const [user, setUser]                 = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showWarning, setShowWarning]   = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [view, setView]                 = useState<'app' | 'admin'>('app');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    const sid = params.get('sid');

    if (urlError) {
      setError(urlError);
      setLoading(false);
      window.history.replaceState({}, '', '/');
      return;
    }

    // Capture session ID from redirect
    if (sid) {
      sessionId = sid;
      localStorage.setItem('sid', sid);
      window.history.replaceState({}, '', '/');
    }

    fetch(`${API}/auth/me`, {
      credentials: 'include',
      headers: sessionId ? { 'x-session-id': sessionId } : {},
    })
      .then(r => r.json())
      .then(data => { setUser(data.user || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const resetActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetActivity));
    return () => events.forEach(e => window.removeEventListener(e, resetActivity));
  }, [user, resetActivity]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivity;
      if (idle >= INACTIVITY_TIMEOUT_MS) {
        apiFetch('/auth/logout', { method: 'POST' })
          .finally(() => { setUser(null); setError('session_expired'); localStorage.removeItem('sid'); });
      } else if (idle >= INACTIVITY_WARNING_MS) {
        setShowWarning(true);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [user, lastActivity]);

  const handleLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    localStorage.removeItem('sid');
    sessionId = null;
    setUser(null);
    setError(null);
    setView('app');
  };

  const isAdmin = user?.groups?.includes('admins');

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', color: '#5a6178' }}>
      Loading...
    </div>
  );

  if (!user) return <LoginScreen error={error} />;

  return (
    <>
      {showWarning && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: '#d97706', color: '#fff', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontFamily: 'system-ui' }}>
          <span>Your session will expire soon due to inactivity.</span>
          <button onClick={resetActivity} style={{ background: '#fff', color: '#d97706', border: 'none', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Stay Logged In</button>
        </div>
      )}
      {isAdmin && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
          <button onClick={() => setView(v => v === 'admin' ? 'app' : 'admin')}
            style={{ width: 44, height: 44, borderRadius: '50%', background: view === 'admin' ? '#0f1423' : '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {view === 'admin' ? '←' : '⬡'}
          </button>
        </div>
      )}
      {view === 'admin' && isAdmin
        ? <div>Admin Panel — coming soon</div>
        : <ThreatNetworkApp user={user} onLogout={handleLogout} />
      }
    </>
  );
}
