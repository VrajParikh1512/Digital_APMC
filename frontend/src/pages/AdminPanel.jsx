import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// ─── Stat Card Component ──────────────────────────────────────────────────────

const StatCard = ({ icon, label, value, accent }) => (
  <div style={{
    background: 'rgba(15, 23, 42, 0.5)',
    border: `1px solid ${accent || 'var(--border-color)'}`,
    borderRadius: '16px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  }}>
    <span style={{ fontSize: '1.75rem' }}>{icon}</span>
    <span style={{ fontSize: '1.8rem', fontWeight: 700, color: accent || 'var(--primary)' }}>
      {value ?? '—'}
    </span>
    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const config = {
    idle:    { color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)', label: '● Idle' },
    running: { color: '#eab308', bg: 'rgba(234,179,8,0.1)',   label: '⟳ Running…' },
    done:    { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: '✓ Done' },
    error:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: '✕ Error' },
  };
  const c = config[status] || config.idle;
  return (
    <span style={{
      padding: '0.3rem 0.85rem', borderRadius: '20px',
      fontSize: '0.85rem', fontWeight: 600,
      color: c.color, background: c.bg,
      border: `1px solid ${c.color}44`,
      display: 'inline-block',
    }}>
      {c.label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const { t }    = useTranslation();

  const [stats,         setStats]         = useState(null);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [importStatus,  setImportStatus]  = useState('idle'); // idle | running | done | error
  const [clearStatus,   setClearStatus]   = useState('idle');
  const [message,       setMessage]       = useState('');

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res  = await fetch('/api/market-prices/stats', { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setStats(data);
      else setMessage(data.message || 'Failed to load stats.');
    } catch {
      setMessage('Could not connect to server.');
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = async () => {
    if (!window.confirm('This will drop and re-import all price data. This may take several minutes. Continue?')) return;
    setImportStatus('running');
    setMessage('');
    try {
      const res  = await fetch('/api/market-prices/import', { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (res.ok || res.status === 202) {
        setImportStatus('running');
        setMessage(data.message || 'Import started. Check server logs for progress.');
      } else {
        setImportStatus('error');
        setMessage(data.message || 'Import failed.');
      }
    } catch (err) {
      setImportStatus('error');
      setMessage(err.message);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete ALL price history data? This cannot be undone.')) return;
    setClearStatus('running');
    setMessage('');
    try {
      const res  = await fetch('/api/market-prices', { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        setClearStatus('done');
        setMessage(data.message);
        setStats(null);
      } else {
        setClearStatus('error');
        setMessage(data.message || 'Clear failed.');
      }
    } catch (err) {
      setClearStatus('error');
      setMessage(err.message);
    }
  };

  const formatDate = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatNum  = n  => n != null ? n.toLocaleString('en-IN') : '—';

  if (!user || user.role !== 'Admin') return <Navigate to="/dashboard" />;

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ textAlign: 'left' }}>{t('adminPanel.title')}</h1>
        <p className="subtitle" style={{ textAlign: 'left', marginBottom: 0 }}>
          {t('adminPanel.priceDataManagement')}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 2rem', padding: '2rem' }}>
        <h2 style={{
          fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem',
          color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {t('adminPanel.importStats')}
        </h2>

        {loadingStats ? (
          <p style={{ color: 'var(--text-muted)' }}>{t('adminPanel.loadingStats')}</p>
        ) : stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <StatCard icon="📊" label={t('adminPanel.totalRows')}   value={formatNum(stats.totalRows)}   accent="#22c55e" />
            <StatCard icon="🌾" label={t('adminPanel.totalGroups')} value={stats.totalGroups}            accent="#eab308" />
            <StatCard icon="🗺️"  label={t('adminPanel.totalStates')} value={stats.totalStates}            accent="#3b82f6" />
            <StatCard icon="📅" label={t('adminPanel.dateFrom')}    value={formatDate(stats.dateRange?.from)} accent="#a78bfa" />
            <StatCard icon="📅" label={t('adminPanel.dateTo')}      value={formatDate(stats.dateRange?.to)}   accent="#f472b6" />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <p>No data in database yet. Run the import to get started.</p>
          </div>
        )}
      </div>

      {/* Import Instructions */}
      <div className="glass-panel" style={{
        maxWidth: '100%', margin: '0 0 2rem', padding: '1.75rem 2rem',
        borderColor: 'rgba(234,179,8,0.2)',
      }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: '#eab308' }}>
          ⚡ {t('adminPanel.importInstructions')}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.75rem', lineHeight: 1.6 }}>
          {t('adminPanel.cliNote')}
        </p>
        <div style={{
          background: 'rgba(0,0,0,0.4)', borderRadius: '10px', padding: '1rem 1.25rem',
          fontFamily: 'monospace', fontSize: '0.85rem', color: '#86efac',
          border: '1px solid rgba(34,197,94,0.15)',
        }}>
          cd Digital_APMC/backend<br />
          node scripts/importMarketPrices.js
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {t('adminPanel.cliDuration')}
        </p>
      </div>

      {/* Actions */}
      <div className="glass-panel" style={{ maxWidth: '100%', margin: 0, padding: '1.75rem 2rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {t('adminPanel.actions')}
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>

          {/* Re-Import */}
          <button
            onClick={handleImport}
            disabled={importStatus === 'running'}
            className="btn"
            style={{
              width: 'auto', padding: '0.75rem 1.75rem', marginTop: 0,
              background: 'linear-gradient(135deg, #eab308, #ca8a04)',
              opacity: importStatus === 'running' ? 0.6 : 1,
              cursor: importStatus === 'running' ? 'not-allowed' : 'pointer',
            }}
          >
            🔄 {t('adminPanel.triggerImport')}
          </button>
          <StatusBadge status={importStatus} />

          <div style={{ width: '1px', height: '36px', background: 'var(--border-color)', margin: '0 0.5rem' }} />

          {/* Clear Data */}
          <button
            onClick={handleClear}
            disabled={clearStatus === 'running'}
            className="btn"
            style={{
              width: 'auto', padding: '0.75rem 1.75rem', marginTop: 0,
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              opacity: clearStatus === 'running' ? 0.6 : 1,
              cursor: clearStatus === 'running' ? 'not-allowed' : 'pointer',
            }}
          >
            🗑️ {t('adminPanel.clearData')}
          </button>
          <StatusBadge status={clearStatus} />

          {/* Refresh Stats */}
          <button
            onClick={fetchStats}
            className="btn"
            style={{
              width: 'auto', padding: '0.75rem 1.75rem', marginTop: 0,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid var(--border-color)',
            }}
          >
            ↻ {t('adminPanel.refreshStats')}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '1.25rem', padding: '0.85rem 1.25rem',
            borderRadius: '10px', fontSize: '0.9rem',
            background: 'rgba(34,197,94,0.07)',
            border: '1px solid rgba(34,197,94,0.2)',
            color: '#86efac',
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
