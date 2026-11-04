import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
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

const sectionTitle = {
  fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem',
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
};

const EMPTY_PRICE = {
  state: '', district: '', market: '', commodity_group: '', commodity: '',
  min_price: '', modal_price: '', max_price: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminPanel = () => {
  const { user, logout } = useContext(AuthContext);
  const { t }    = useTranslation();

  const [stats,         setStats]         = useState(null);
  const [userStats,     setUserStats]     = useState(null);
  const [loadingStats,  setLoadingStats]  = useState(true);
  const [importStatus,  setImportStatus]  = useState('idle'); // idle | running | done | error
  const [clearStatus,   setClearStatus]   = useState('idle');
  const [message,       setMessage]       = useState('');

  // "Update today's price" form
  const [groups,      setGroups]      = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [states,      setStates]      = useState([]);
  const [priceForm,   setPriceForm]   = useState(EMPTY_PRICE);
  const [priceMsg,    setPriceMsg]    = useState(null); // { type, text }
  const [savingPrice, setSavingPrice] = useState(false);

  const authHeaders = { Authorization: `Bearer ${user?.token}` };
  const pollRef = useRef(null);

  // ── Load numbers shown at the top ───────────────────────────────────────────
  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const [priceRes, userRes] = await Promise.all([
        fetch('/api/market-prices/stats', { headers: authHeaders }),
        fetch('/api/admin/user-stats',    { headers: authHeaders }),
      ]);

      if (priceRes.status === 401 || userRes.status === 401) { logout(); return; }

      const priceData = await priceRes.json();
      if (priceRes.ok) setStats(priceData);
      else setMessage(priceData.message || 'Failed to load stats.');

      if (userRes.ok) setUserStats(await userRes.json());
    } catch {
      setMessage('Could not connect to server.');
    } finally {
      setLoadingStats(false);
    }
  };

  // ── Load dropdown lists for the price form ──────────────────────────────────
  const fetchLists = async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        fetch('/api/market-prices/groups', { headers: authHeaders }),
        fetch('/api/market-prices/states', { headers: authHeaders }),
      ]);
      if (gRes.ok) setGroups(await gRes.json());
      if (sRes.ok) setStates(await sRes.json());
    } catch { /* lists stay empty; the admin can still type nothing and see the error */ }
  };

  useEffect(() => {
    fetchStats();
    fetchLists();
    return () => clearInterval(pollRef.current); // stop polling when leaving the page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the group changes, load the crops of that group
  useEffect(() => {
    if (!priceForm.commodity_group) { setCommodities([]); return; }
    fetch(`/api/market-prices/commodities?group=${encodeURIComponent(priceForm.commodity_group)}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setCommodities(Array.isArray(d) ? d : []))
      .catch(() => setCommodities([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceForm.commodity_group]);

  // ── Import: start, then check progress every 4 seconds ──────────────────────
  const pollImport = () => {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch('/api/market-prices/import-status', { headers: authHeaders });
        const data = await res.json();
        if (data.status === 'done') {
          clearInterval(pollRef.current);
          setImportStatus('done');
          setMessage('Import finished successfully.');
          fetchStats();
          fetchLists();
        } else if (data.status === 'error') {
          clearInterval(pollRef.current);
          setImportStatus('error');
          setMessage(`Import failed: ${data.error}`);
        }
      } catch { /* try again on the next tick */ }
    }, 4000);
  };

  const handleImport = async () => {
    if (!window.confirm('This will drop and re-import all price data. This may take several minutes. Continue?')) return;
    setImportStatus('running');
    setMessage('');
    try {
      const res  = await fetch('/api/market-prices/import', { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (res.ok || res.status === 202) {
        setMessage(data.message || 'Import started.');
        pollImport();
      } else {
        setImportStatus(res.status === 409 ? 'running' : 'error');
        setMessage(data.message || 'Import failed.');
        if (res.status === 409) pollImport();
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
        fetchLists();
      } else {
        setClearStatus('error');
        setMessage(data.message || 'Clear failed.');
      }
    } catch (err) {
      setClearStatus('error');
      setMessage(err.message);
    }
  };

  // ── Update today's price ────────────────────────────────────────────────────
  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setPriceForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'commodity_group' ? { commodity: '' } : {}),
    }));
  };

  const handlePriceSubmit = async (e) => {
    e.preventDefault();
    setPriceMsg(null);
    setSavingPrice(true);
    try {
      const res  = await fetch('/api/market-prices/today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(priceForm),
      });
      const data = await res.json();
      if (res.ok) {
        setPriceMsg({ type: 'success', text: data.message });
        // keep the area, clear the prices so the next crop can be entered quickly
        setPriceForm(prev => ({ ...prev, commodity: '', min_price: '', modal_price: '', max_price: '' }));
        fetchStats();
      } else {
        setPriceMsg({ type: 'error', text: data.message || 'Could not save the price.' });
      }
    } catch {
      setPriceMsg({ type: 'error', text: 'Could not connect to the server.' });
    } finally {
      setSavingPrice(false);
    }
  };

  const formatDate = iso => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const formatNum  = n  => n != null ? n.toLocaleString('en-IN') : '—';

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ textAlign: 'left' }}>{t('adminPanel.title')}</h1>
        <p className="subtitle" style={{ textAlign: 'left', marginBottom: 0 }}>
          {t('adminPanel.priceDataManagement')}
        </p>
      </div>

      {/* Users by category */}
      <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 2rem', padding: '2rem' }}>
        <h2 style={sectionTitle}>{t('adminPanel.usersByCategory')}</h2>
        {userStats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <StatCard icon="👥" label={t('adminPanel.totalUsers')}    value={formatNum(userStats.total)}                 accent="#a78bfa" />
            <StatCard icon="🧑‍🌾" label={t('adminPanel.farmers')}       value={formatNum(userStats.byRole.Farmer)}         accent="#22c55e" />
            <StatCard icon="🏪" label={t('adminPanel.businessOwners')} value={formatNum(userStats.byRole['Business Owner'])} accent="#eab308" />
            <StatCard icon="🛡️" label={t('adminPanel.admins')}        value={formatNum(userStats.byRole.Admin)}          accent="#3b82f6" />
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>{loadingStats ? t('adminPanel.loadingStats') : '—'}</p>
        )}
      </div>

      {/* Price data stats */}
      <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 2rem', padding: '2rem' }}>
        <h2 style={sectionTitle}>{t('adminPanel.importStats')}</h2>

        {loadingStats ? (
          <p style={{ color: 'var(--text-muted)' }}>{t('adminPanel.loadingStats')}</p>
        ) : stats && stats.totalRows > 0 ? (
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

      {/* Update today's price */}
      <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 2rem', padding: '2rem', borderColor: 'rgba(34,197,94,0.25)' }}>
        <h2 style={{ ...sectionTitle, marginBottom: '0.5rem' }}>{t('adminPanel.updateTodayPrice')}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {t('adminPanel.updateTodayHint')}
        </p>

        {priceMsg && (
          <div className={`notice ${priceMsg.type === 'success' ? 'notice-success' : 'notice-error'}`}>{priceMsg.text}</div>
        )}

        <form onSubmit={handlePriceSubmit}>
          <div className="filter-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>State *</label>
              <select name="state" value={priceForm.state} onChange={handlePriceChange} required>
                <option value="">— Select State —</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>District *</label>
              <input name="district" value={priceForm.district} onChange={handlePriceChange} placeholder="e.g. Ahmedabad" required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Market / Mandi *</label>
              <input name="market" value={priceForm.market} onChange={handlePriceChange} placeholder="e.g. Jamalpur APMC" required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Commodity Group *</label>
              <select name="commodity_group" value={priceForm.commodity_group} onChange={handlePriceChange} required>
                <option value="">— Select Group —</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Crop / Commodity *</label>
              <select name="commodity" value={priceForm.commodity} onChange={handlePriceChange} disabled={!priceForm.commodity_group} required>
                <option value="">— Select Commodity —</option>
                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Min Price (₹/Quintal) *</label>
              <input type="number" min="1" step="any" name="min_price" value={priceForm.min_price} onChange={handlePriceChange} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Modal Price (₹/Quintal) *</label>
              <input type="number" min="1" step="any" name="modal_price" value={priceForm.modal_price} onChange={handlePriceChange} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Max Price (₹/Quintal) *</label>
              <input type="number" min="1" step="any" name="max_price" value={priceForm.max_price} onChange={handlePriceChange} required />
            </div>
          </div>

          <button type="submit" className="btn" disabled={savingPrice} style={{ width: 'auto', padding: '0.75rem 2rem' }}>
            {savingPrice ? '…' : t('adminPanel.savePrice')}
          </button>
        </form>
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
          cd backend<br />
          npm run import-prices
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
          {t('adminPanel.cliDuration')}
        </p>
      </div>

      {/* Actions */}
      <div className="glass-panel" style={{ maxWidth: '100%', margin: 0, padding: '1.75rem 2rem' }}>
        <h2 style={sectionTitle}>{t('adminPanel.actions')}</h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>

          {/* Re-Import */}
          <button
            onClick={handleImport}
            disabled={importStatus === 'running'}
            className="btn"
            style={{
              width: 'auto', padding: '0.75rem 1.75rem', marginTop: 0,
              background: 'linear-gradient(135deg, #eab308, #ca8a04)',
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
