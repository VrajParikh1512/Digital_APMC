import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtShort = iso => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
};

const GROUPS = [
  'Cereals','Dry Fruits','Fibre Crops','Fruits',
  'Oil Seeds','Pulses','Spices','Vegetables',
];

// ─── Forecast Card ────────────────────────────────────────────────────────────

const ForecastCard = ({ forecast, basePrice }) => {
  const isUp         = forecast.predicted_change_pct > 0;
  const isFlat       = forecast.used_baseline_due_to_5pct_rule;
  const changeColor  = isFlat ? '#a1a1aa' : isUp ? '#22c55e' : '#f87171';
  const changePrefix = isUp ? '+' : '';

  const stepLabel = forecast.reporting_step === 1
    ? 'Next Report'
    : `+${forecast.reporting_step} Reports`;

  return (
    <div style={{
      background:    'rgba(255,255,255,0.04)',
      border:        `1px solid ${forecast.recommended ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius:  '14px',
      padding:       '1.25rem 1.5rem',
      display:       'flex',
      flexDirection: 'column',
      gap:           '0.5rem',
      position:      'relative',
      overflow:      'hidden',
    }}>
      {/* Horizon badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', color: '#71717a', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {stepLabel}
        </span>
        {forecast.experimental && (
          <span style={{
            fontSize: '0.68rem', color: '#facc15',
            background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.25)',
            borderRadius: '6px', padding: '0.15rem 0.5rem', fontWeight: 600,
          }}>
            Experimental
          </span>
        )}
        {forecast.recommended && !forecast.experimental && (
          <span style={{
            fontSize: '0.68rem', color: '#86efac',
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '6px', padding: '0.15rem 0.5rem', fontWeight: 600,
          }}>
            Recommended
          </span>
        )}
      </div>

      {/* Price */}
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f4f4f5', lineHeight: 1.15 }}>
        ₹{forecast.predicted_modal_price.toLocaleString('en-IN')}
        <span style={{ fontSize: '0.78rem', color: '#71717a', marginLeft: '0.4rem', fontWeight: 400 }}>
          /Quintal
        </span>
      </div>

      {/* Change */}
      <div style={{ fontSize: '0.9rem', color: changeColor, fontWeight: 600 }}>
        {isFlat
          ? '≈ No significant change (< 5%)'
          : `${changePrefix}${forecast.predicted_change_pct.toFixed(2)}% vs current`}
      </div>

      {/* Sub-detail */}
      {!isFlat && (
        <div style={{ fontSize: '0.75rem', color: '#52525b' }}>
          Raw model output: ₹{forecast.raw_lightgbm_price.toLocaleString('en-IN')}
        </div>
      )}
    </div>
  );
};

// ─── Mini sparkline chart showing historical prices ───────────────────────────

const MiniChart = ({ history }) => {
  if (!history || history.length < 2) return null;
  const prices = history.map(d => d.modal_price).filter(v => v != null);
  if (!prices.length) return null;

  const W = 700, H = 120;
  const pad = { top: 12, right: 12, bottom: 30, left: 64 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top  - pad.bottom;

  const minV = Math.min(...prices), maxV = Math.max(...prices);
  const range = maxV - minV || 1;
  const toX = i => pad.left + (i / Math.max(history.length - 1, 1)) * cW;
  const toY = v => pad.top + cH - ((v - minV) / range) * cH;

  const pts = history
    .map((d, i) => d.modal_price != null ? { x: toX(i), y: toY(d.modal_price), d } : null)
    .filter(Boolean);

  const line = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = pts.length
    ? `M${pts[0].x.toFixed(1)},${(pad.top + cH).toFixed(1)} `
      + pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
      + ` L${pts[pts.length-1].x.toFixed(1)},${(pad.top + cH).toFixed(1)} Z`
    : '';

  // X ticks: show first, middle, last
  const xTicks = [0, Math.floor((history.length - 1) / 2), history.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.01" />
        </linearGradient>
        <clipPath id="histClip">
          <rect x={pad.left} y={pad.top} width={cW} height={cH} />
        </clipPath>
      </defs>
      {area && <path d={area} fill="url(#histGrad)" clipPath="url(#histClip)" />}
      {line && <path d={line} fill="none" stroke="#22c55e" strokeWidth="1.8"
                      strokeLinejoin="round" strokeLinecap="round" clipPath="url(#histClip)" />}
      {/* Y axis */}
      {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
        <text key={i} x={pad.left - 6} y={toY(v) + 4}
              textAnchor="end" fontSize="10" fill="#71717a">
          ₹{Math.round(v).toLocaleString('en-IN')}
        </text>
      ))}
      {/* X ticks */}
      {xTicks.map(idx => (
        <text key={idx} x={toX(idx)} y={pad.top + cH + 18}
              textAnchor="middle" fontSize="10" fill="#71717a">
          {fmtShort(history[idx]?.date)}
        </text>
      ))}
      <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + cH}
            stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1={pad.left} y1={pad.top + cH} x2={pad.left + cW} y2={pad.top + cH}
            stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    </svg>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PricePrediction = () => {
  const { user }   = useContext(AuthContext);
  const { t }      = useTranslation();

  // Filter state
  const [groups,      setGroups]      = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [states,      setStates]      = useState([]);
  const [districts,   setDistricts]   = useState([]);
  const [markets,     setMarkets]     = useState([]);

  const [form, setForm] = useState({
    group:     '',
    commodity: '',
    state:     '',
    district:  '',
    market:    '',
    history_days: 30,
  });

  // Result state
  const [result,              setResult]              = useState(null);
  const [health,              setHealth]              = useState(null); // null = still checking
  const [loading,             setLoading]             = useState(false);
  const [loadingMeta,         setLoadingMeta]         = useState(true);
  const [loadingCommodities,  setLoadingCommodities]  = useState(false);
  const [error,               setError]               = useState('');

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  // ── Check if prediction service is alive ──────────────────────────────────
  useEffect(() => {
    let timer;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/price-prediction/health', { headers: authHeaders });
        setHealth(await res.json());
      } catch {
        setHealth({ status: 'offline' });
      }
    };
    checkHealth();
    timer = setInterval(checkHealth, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load groups + states on mount ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [gRes, sRes] = await Promise.all([
          fetch('/api/market-prices/groups', { headers: authHeaders }),
          fetch('/api/market-prices/states', { headers: authHeaders }),
        ]);
        const [gData, sData] = await Promise.all([gRes.json(), sRes.json()]);
        if (gRes.ok) setGroups(Array.isArray(gData) ? gData : []);
        if (sRes.ok) setStates(Array.isArray(sData) ? sData : []);
      } catch {
        setError('Failed to load filter options.');
      } finally {
        setLoadingMeta(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── When group changes, refresh commodities ───────────────────────────────
  useEffect(() => {
    if (!form.group) { setCommodities([]); return; }
    setLoadingCommodities(true);
    fetch(`/api/market-prices/commodities?group=${encodeURIComponent(form.group)}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => {
        setCommodities(Array.isArray(d) ? d : []);
        setLoadingCommodities(false);
      })
      .catch(() => {
        setCommodities([]);
        setLoadingCommodities(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.group]);

  // ── When state + commodity changes, refresh districts ────────────────────
  useEffect(() => {
    if (!form.state) { setDistricts([]); return; }
    const params = new URLSearchParams({ state: form.state });
    if (form.commodity) params.append('commodity', form.commodity);
    fetch(`/api/price-prediction/districts?${params}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setDistricts(Array.isArray(d) ? d : []))
      .catch(() => setDistricts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state, form.commodity]);

  // ── When district changes, refresh markets ────────────────────────────────
  useEffect(() => {
    if (!form.state) { setMarkets([]); return; }
    const params = new URLSearchParams({ state: form.state });
    if (form.district) params.append('district', form.district);
    if (form.commodity) params.append('commodity', form.commodity);
    fetch(`/api/price-prediction/markets?${params}`, { headers: authHeaders })
      .then(r => r.json())
      .then(d => setMarkets(Array.isArray(d) ? d : []))
      .catch(() => setMarkets([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.state, form.district, form.commodity]);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'group'     ? { commodity: '', district: '', market: '' } : {}),
      ...(name === 'commodity' ? { district: '',  market: '' }               : {}),
      ...(name === 'state'     ? { district: '',  market: '' }               : {}),
      ...(name === 'district'  ? { market: '' }                              : {}),
    }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async e => {
    e.preventDefault();
    if (!form.commodity) { setError('Please select a commodity before predicting.'); return; }
    if (!form.state)     { setError('Please select a state before predicting.');     return; }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res  = await fetch('/api/price-prediction/predict', {
        method:  'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          commodity:       form.commodity,
          commodity_group: form.group,
          state:           form.state,
          district:        form.district || 'Unknown',
          market:          form.market   || 'Unknown',
          history_days:    Number(form.history_days),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Prediction failed.');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  if (!user || user.role !== 'Farmer') return <Navigate to="/dashboard" />;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ textAlign: 'left', marginBottom: '0.4rem' }}>
          🔮 Price Prediction
        </h1>
        <p className="subtitle" style={{ textAlign: 'left', marginBottom: 0 }}>
          Price forecasts for the next 1–7 market reporting periods, based on recent mandi prices
        </p>
      </div>

      {/* Service status banner */}
      {health && health.model_status === 'trained' && (
        <div style={{
          background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '12px', padding: '0.7rem 1.25rem',
          color: '#86efac', marginBottom: '1.5rem', fontSize: '0.85rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '1rem' }}>✅</span>
          LightGBM model is online and ready
          {health.trained_through ? ` (trained through ${health.trained_through}).` : '.'}
        </div>
      )}
      {health && health.model_status !== 'trained' && (
        <div style={{
          background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)',
          borderRadius: '12px', padding: '0.75rem 1.25rem',
          color: '#fde047', marginBottom: '1.5rem', fontSize: '0.88rem',
          display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}>
          <span style={{ fontSize: '1rem' }}>⚡</span>
          <span>
            {health.model_status === 'fallback_mode'
              ? 'No trained LightGBM model was found, so simple trend-based estimates are shown.'
              : 'Connecting to the prediction engine… trend-based estimates are shown until it is ready.'}
          </span>
        </div>
      )}

      {/* Filter Card */}
      <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 2rem', padding: '2rem' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>

            {/* Commodity Group */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Commodity Group *</label>
              <select name="group" value={form.group} onChange={handleChange} disabled={loadingMeta}>
                <option value="">— Select Group —</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Commodity */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Crop / Commodity *</label>
              <select name="commodity" value={form.commodity} onChange={handleChange} disabled={!form.group || loadingCommodities}>
                <option value="">{loadingCommodities ? '— Loading Commodities... —' : '— Select Commodity —'}</option>
                {commodities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* State */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>State *</label>
              <select name="state" value={form.state} onChange={handleChange} disabled={loadingMeta}>
                <option value="">— Select State —</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* District */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>District <span style={{ color: '#71717a', fontWeight: 400 }}>(Optional)</span></label>
              <select name="district" value={form.district} onChange={handleChange} disabled={!form.state}>
                <option value="">— All Districts —</option>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Market */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Market / Mandi <span style={{ color: '#71717a', fontWeight: 400 }}>(Optional)</span></label>
              <select name="market" value={form.market} onChange={handleChange} disabled={!form.state}>
                <option value="">— All Markets —</option>
                {markets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* History window */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>History Window (days)</label>
              <select name="history_days" value={form.history_days} onChange={handleChange}>
                <option value={14}>14 days</option>
                <option value={21}>21 days</option>
                <option value={30}>30 days</option>
                <option value={45}>45 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                className="btn"
                disabled={loading || !form.commodity || !form.state}
                style={{ marginTop: 0, padding: '0.875rem 1.25rem', fontSize: '1rem', width: '100%' }}
              >
                {loading ? 'Predicting…' : '🔮 Predict Price'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message" style={{ marginTop: '1rem', marginBottom: 0 }}>{error}</div>
          )}
        </form>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤖</div>
          <p>Running price forecast…</p>
        </div>
      )}

      {/* Results */}
      {!loading && result && (() => {
        const forecasts  = result.forecasts  || [];
        const history    = result.history_used || [];
        const basePrice  = result.last_modal_price;
        const lastDate   = result.last_observed_date;

        return (
          <>
            {/* Summary strip */}
            <div style={{
              background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)',
              borderRadius: '14px', padding: '1rem 1.5rem', marginBottom: '1.5rem',
              display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '0.2rem' }}>Commodity</div>
                <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{result.commodity}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '0.2rem' }}>Location</div>
                <div style={{ fontWeight: 600, color: '#a1a1aa', fontSize: '0.9rem' }}>
                  {result.state}
                  {result.district && result.district !== 'Unknown' ? ` · ${result.district}` : ''}
                  {result.market   && result.market   !== 'Unknown' ? ` · ${result.market}` : ''}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '0.2rem' }}>Last Observed Price</div>
                <div style={{ fontWeight: 700, color: '#22c55e', fontSize: '1.1rem' }}>
                  ₹{basePrice?.toLocaleString('en-IN')} <span style={{ fontSize: '0.75rem', color: '#71717a' }}>on {lastDate}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#71717a', marginBottom: '0.2rem' }}>History Used</div>
                <div style={{ fontWeight: 600, color: '#a1a1aa', fontSize: '0.9rem' }}>
                  {history.length} data points
                </div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{
                  fontSize: '0.75rem', color: '#71717a',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px', padding: '0.35rem 0.75rem',
                }}>
                  {result.algorithm}
                </span>
              </div>
            </div>

            {/* Historical Prices Sparkline */}
            {history.length > 1 && (
              <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 1.5rem', padding: '1.25rem 1.75rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 0.85rem',
                             color: '#86efac' }}>
                  Recent Price History
                </h3>
                <MiniChart history={history} />
              </div>
            )}

            {/* Forecast Cards */}
            <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 1.5rem', padding: '1.5rem 1.75rem' }}>
              <h3 style={{
                fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem',
                background: 'linear-gradient(to right, #34d399, #10b981)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                Price Forecasts
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '1rem',
              }}>
                {forecasts.map(f => (
                  <ForecastCard key={f.reporting_step} forecast={f} basePrice={basePrice} />
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{
              fontSize: '0.78rem', color: '#52525b', lineHeight: 1.6,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px', padding: '0.85rem 1.25rem',
            }}>
              <strong style={{ color: '#71717a' }}>ℹ️ Note:</strong>{' '}
              {result.note || 'Forecast steps are next market reporting observations, not guaranteed calendar days. Step 7 is experimental.'}
              {result.model_trained_through && (
                <> &nbsp;·&nbsp; Model trained through <strong style={{ color: '#71717a' }}>{result.model_trained_through}</strong>.</>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default PricePrediction;

