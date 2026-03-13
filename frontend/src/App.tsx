import { useState, useEffect } from 'react';
import ThreatNetworkApp from './threat_network_ui';
import LoginScreen from './LoginScreen';

const API_BASE = 'https://threat-network-api-807423602117.us-central1.run.app';

export default function App() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    // Check for ?error=unauthorized in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'unauthorized') {
      setError(true);
      setLoading(false);
      return;
    }

    // Check if already logged in
    fetch(`${API_BASE}/auth/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setUser(data.user || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'system-ui', color: '#5a6178'
    }}>
      Loading...
    </div>
  );

  if (!user) return <LoginScreen error={error} />;

  return <ThreatNetworkApp />;
}
