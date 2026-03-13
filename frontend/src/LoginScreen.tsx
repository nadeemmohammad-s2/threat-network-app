export default function LoginScreen({ error }: { error: boolean }) {
  const handleLogin = () => {
    window.location.href =
      'https://threat-network-api-807423602117.us-central1.run.app/auth/google';
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      background: '#f8f9fc', fontFamily: 'Outfit, system-ui, sans-serif'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '48px 56px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 400
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#1a1d26' }}>
          Hybrid Threat Central
        </h1>
        <p style={{ color: '#5a6178', marginBottom: 32, fontSize: 14 }}>
          Sign in with your Section2 Google account to continue
        </p>
        {error && (
          <p style={{ color: '#dc2626', marginBottom: 16, fontSize: 13 }}>
            Access denied. Only @section2.com accounts are permitted.
          </p>
        )}
        <button onClick={handleLogin} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 24px', borderRadius: 8, border: '1px solid #e2e6ef',
          background: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 600,
          color: '#1a1d26', width: '100%', justifyContent: 'center'
        }}>
          <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="Google"/>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
