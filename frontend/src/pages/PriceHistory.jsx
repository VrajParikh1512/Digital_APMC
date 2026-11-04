import { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { translateGroup, translateCommodity, translateState } from '../cropTranslations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format a YYYY-MM-DD string to a short label like "1 Jan" */
const fmtShort = iso => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
};

/** Format YYYY-MM-DD to full "1 January 2024" for tooltips */
const fmtFull = iso => {
  if (!iso) return '';
  const dt = new Date(iso + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Pick smart tick indices so labels never overlap.
 * minSpacingPx: minimum SVG-unit gap between tick centres.
 */
const smartTicks = (n, totalWidth, minSpacingPx = 70) => {
  if (n <= 1) return [0];
  const maxTicks = Math.max(2, Math.floor(totalWidth / minSpacingPx));
  const step = Math.ceil(n / maxTicks);
  const indices = [];
  for (let i = 0; i < n; i += step) indices.push(i);
  if (indices[indices.length - 1] !== n - 1) indices.push(n - 1);
  return indices;
};

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

const LineChart = ({ data }) => {
  const [tooltip, setTooltip] = useState(null);
  const svgRef = useRef(null);

  if (!data || data.length === 0) return null;

  const prices = data.map(d => d.modal_price).filter(v => v != null);
  if (prices.length === 0) return null;

  // Layout — unitless SVG viewBox coordinates
  const W = 800, H = 300;
  const pad = { top: 24, right: 24, bottom: 66, left: 80 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top  - pad.bottom;

  const minVal = Math.min(...prices);
  const maxVal = Math.max(...prices);
  const range  = maxVal - minVal || 1;

  const toX = i => pad.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = v => pad.top  + chartH - ((v - minVal) / range) * chartH;

  // Build SVG paths
  const validPts = data
    .map((d, i) => d.modal_price != null ? { x: toX(i), y: toY(d.modal_price), i } : null)
    .filter(Boolean);

  const linePath = validPts
    .map((p, k) => `${k === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');

  const areaPath = validPts.length
    ? `M${validPts[0].x.toFixed(2)},${(pad.top + chartH).toFixed(2)} `
      + validPts.map(p => `L${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
      + ` L${validPts[validPts.length - 1].x.toFixed(2)},${(pad.top + chartH).toFixed(2)} Z`
    : '';

  // Y-axis: 5 nice rounded ticks
  const yTickCount = 5;
  const rawStep   = range / yTickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const niceStep  = Math.ceil(rawStep / magnitude) * magnitude;
  const yStart    = Math.floor(minVal / niceStep) * niceStep;
  const yTicks    = [];
  for (let v = yStart; v <= maxVal + niceStep; v += niceStep) {
    if (v >= minVal - niceStep * 0.1) yTicks.push(v);
  }

  // X-axis: smart spacing
  const xTickIndices = smartTicks(data.length, chartW);

  // Hover: find nearest point
  const handleMouseMove = e => {
    if (!svgRef.current) return;
    const rect   = svgRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    let best = 0, bestDist = Infinity;
    data.forEach((_, i) => {
      const dist = Math.abs(toX(i) - mouseX);
      if (dist < bestDist) { bestDist = dist; best = i; }
    });
    if (bestDist < chartW / data.length + 12) {
      setTooltip({ x: toX(best), y: data[best].modal_price != null ? toY(data[best].modal_price) : null, row: data[best] });
    } else {
      setTooltip(null);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0.01" />
          </linearGradient>
          <clipPath id="chartClip">
            <rect x={pad.left} y={pad.top} width={chartW} height={chartH} />
          </clipPath>
        </defs>

        {/* ── Horizontal grid lines ── */}
        {yTicks.map((v, i) => {
          const y = toY(v);
          if (y < pad.top - 2 || y > pad.top + chartH + 2) return null;
          return <line key={i} x1={pad.left} x2={pad.left + chartW} y1={y} y2={y}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />;
        })}

        {/* ── Vertical grid lines at tick positions ── */}
        {xTickIndices.map(idx => (
          <line key={idx}
            x1={toX(idx)} x2={toX(idx)} y1={pad.top} y2={pad.top + chartH}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* ── Area fill ── */}
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" clipPath="url(#chartClip)" />}

        {/* ── Line ── */}
        {linePath && <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2.2"
          strokeLinejoin="round" strokeLinecap="round" clipPath="url(#chartClip)" />}

        {/* ── Y-axis labels ── */}
        {yTicks.map((v, i) => {
          const y = toY(v);
          if (y < pad.top - 2 || y > pad.top + chartH + 2) return null;
          return (
            <text key={i} x={pad.left - 10} y={y + 4}
              textAnchor="end" fontSize="11" fill="#71717a">
              ₹{Math.round(v).toLocaleString('en-IN')}
            </text>
          );
        })}

        {/* ── Y-axis title ── */}
        <text x={16} y={pad.top + chartH / 2} textAnchor="middle"
          fontSize="11" fill="#52525b"
          transform={`rotate(-90, 16, ${pad.top + chartH / 2})`}>
          Price (Rs./Quintal)
        </text>

        {/* ── X-axis: tick marks + rotated labels ── */}
        {xTickIndices.map(idx => {
          const x     = toX(idx);
          const label = fmtShort(data[idx]?.date);
          const ty    = pad.top + chartH + 10;
          return (
            <g key={idx}>
              {/* Tick mark */}
              <line x1={x} x2={x} y1={pad.top + chartH} y2={pad.top + chartH + 5}
                stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
              {/* Rotated label — anchor "end" + rotate -38° around the tick base */}
              <text x={x} y={ty} textAnchor="end" fontSize="11" fill="#71717a"
                transform={`rotate(-38, ${x}, ${ty})`}>
                {label}
              </text>
            </g>
          );
        })}

        {/* ── Axes ── */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + chartH}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
        <line x1={pad.left} y1={pad.top + chartH} x2={pad.left + chartW} y2={pad.top + chartH}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />

        {/* ── Tooltip crosshair + dot ── */}
        {tooltip && tooltip.y != null && (
          <g>
            <line x1={tooltip.x} x2={tooltip.x} y1={pad.top} y2={pad.top + chartH}
              stroke="rgba(255,255,255,0.16)" strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={tooltip.x} cy={tooltip.y} r="5"
              fill="#22c55e" stroke="#1a1c18" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {/* ── Floating tooltip box ── */}
      {tooltip && tooltip.y != null && (() => {
        const pct = tooltip.x / W;
        return (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: `${pct * 100}%`,
            transform: pct > 0.65 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
            background: 'rgba(10,16,30,0.96)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: '12px',
            padding: '0.65rem 0.95rem',
            pointerEvents: 'none',
            zIndex: 10,
            minWidth: '155px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            <div style={{ color: '#86efac', fontSize: '0.78rem', marginBottom: '0.4rem', fontWeight: 700, letterSpacing: '0.02em' }}>
              {fmtFull(tooltip.row.date)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.83rem' }}>
              <span style={{ color: '#22c55e', fontWeight: 700 }}>
                Modal: ₹{tooltip.row.modal_price?.toLocaleString('en-IN') ?? '—'}
              </span>
              <span style={{ color: '#a1a1aa' }}>
                Min: ₹{tooltip.row.min_price?.toLocaleString('en-IN') ?? '—'}
              </span>
              <span style={{ color: '#a1a1aa' }}>
                Max: ₹{tooltip.row.max_price?.toLocaleString('en-IN') ?? '—'}
              </span>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '0.3rem', paddingTop: '0.3rem', color: '#52525b', fontSize: '0.75rem' }}>
                {tooltip.row.market_count} markets &nbsp;·&nbsp;
                {tooltip.row.total_arrival != null ? `${tooltip.row.total_arrival} MT` : 'N/A'} arrival
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// ─── CSV Download ─────────────────────────────────────────────────────────────

const downloadCSV = (data, commodity, filters) => {
  const headers = [
    'Date',
    'Min Price (Rs./Quintal)',
    'Modal Price (Rs./Quintal)',
    'Max Price (Rs./Quintal)',
    'Total Arrival (MT)',
    'Market Count',
  ];

  const rows = data.map(r => [
    r.date,
    r.min_price    ?? '',
    r.modal_price  ?? '',
    r.max_price    ?? '',
    r.total_arrival ?? '',
    r.market_count,
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // Descriptive filename from applied filters
  const parts = [commodity.replace(/\s+/g, '_')];
  if (filters.startDate) parts.push(filters.startDate);
  if (filters.endDate)   parts.push(filters.endDate);
  if (filters.state)     parts.push(filters.state.replace(/\s+/g, '_'));
  const filename = `price_history_${parts.join('_')}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PriceHistory = () => {
  const { user } = useContext(AuthContext);
  const { t, i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage || i18n.language || 'en';

  const [groups,      setGroups]      = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [states,      setStates]      = useState([]);
  const [priceData,   setPriceData]   = useState(null);

  const [filters, setFilters] = useState({
    group:     '',
    commodity: '',
    startDate: '',
    endDate:   '',
    state:     '',
  });

  const [loading,     setLoading]     = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [error,       setError]       = useState('');

  const authHeaders = { Authorization: `Bearer ${user?.token}` };

  // Fetch groups + states on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [gRes, sRes] = await Promise.all([
          fetch('/api/market-prices/groups', { headers: authHeaders }),
          fetch('/api/market-prices/states', { headers: authHeaders }),
        ]);
        const [gData, sData] = await Promise.all([gRes.json(), sRes.json()]);
        if (gRes.ok) setGroups(gData);
        if (sRes.ok) setStates(sData);
      } catch {
        setError('Failed to load filter options.');
      } finally {
        setLoadingMeta(false);
      }
    };
    fetchMeta();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When group changes, refresh commodity list
  useEffect(() => {
    if (!filters.group) { setCommodities([]); return; }
    const fetchCommodities = async () => {
      try {
        const res  = await fetch(`/api/market-prices/commodities?group=${encodeURIComponent(filters.group)}`, { headers: authHeaders });
        const data = await res.json();
        if (res.ok) setCommodities(data);
      } catch {
        setCommodities([]);
      }
    };
    fetchCommodities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.group]);

  const handleChange = e => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'group' ? { commodity: '' } : {}),
    }));
  };

  const handleSearch = useCallback(async e => {
    e.preventDefault();
    if (!filters.commodity) { setError(t('priceHistory.selectCommodity')); return; }
    setError('');
    setLoading(true);
    setPriceData(null);

    try {
      const params = new URLSearchParams({ commodity: filters.commodity });
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate)   params.append('endDate',   filters.endDate);
      if (filters.state)     params.append('state',     filters.state);

      const res  = await fetch(`/api/market-prices?${params}`, { headers: authHeaders });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Failed to fetch');
      setPriceData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, t]);

  if (!user || user.role !== 'Farmer') return <Navigate to="/dashboard" />;

  const hasData = priceData?.data?.length > 0;

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ textAlign: 'left' }}>{t('priceHistory.title')}</h1>
        <p className="subtitle" style={{ textAlign: 'left', marginBottom: 0 }}>
          {t('priceHistory.subtitle')}
        </p>
      </div>

      {/* Filter Card */}
      <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 2rem', padding: '2rem' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('priceHistory.commodityGroup')}</label>
              <select name="group" value={filters.group} onChange={handleChange} disabled={loadingMeta}>
                <option value="">{t('priceHistory.selectGroup')}</option>
                {groups.map(g => <option key={g} value={g}>{translateGroup(g, currentLang)}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('priceHistory.commodity')}</label>
              <select name="commodity" value={filters.commodity} onChange={handleChange} disabled={!filters.group}>
                <option value="">{t('priceHistory.selectCommodityPlaceholder')}</option>
                {commodities.map(c => <option key={c} value={c}>{translateCommodity(c, currentLang)}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('priceHistory.fromDate')}</label>
              <input type="date" name="startDate" value={filters.startDate} onChange={handleChange} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('priceHistory.toDate')}</label>
              <input type="date" name="endDate" value={filters.endDate} onChange={handleChange} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('priceHistory.state')}</label>
              <select name="state" value={filters.state} onChange={handleChange} disabled={loadingMeta}>
                <option value="">{t('priceHistory.allStates')}</option>
                {states.map(s => <option key={s} value={s}>{translateState(s, currentLang)}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                type="submit"
                className="btn"
                disabled={loading || !filters.commodity}
                style={{ marginTop: 0, padding: '0.875rem 1.25rem', fontSize: '1rem', width: '100%' }}
              >
                {loading ? t('priceHistory.loading') : t('priceHistory.searchBtn')}
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="error-message" style={{ marginTop: '1rem', marginBottom: 0 }}>{error}</div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
          <p>{t('priceHistory.loading')}</p>
        </div>
      )}

      {/* No Results */}
      {!loading && priceData && !hasData && (
        <div className="glass-panel" style={{ maxWidth: '100%', textAlign: 'center', padding: '3rem', margin: 0 }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <p style={{ color: 'var(--text-muted)' }}>{t('priceHistory.noData')}</p>
        </div>
      )}

      {/* Results */}
      {!loading && hasData && (
        <>
          {/* ── Chart Card ── */}
          <div className="glass-panel" style={{ maxWidth: '100%', margin: '0 0 2rem', padding: '1.5rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{
                  fontSize: '1.15rem', fontWeight: 600, margin: '0 0 0.3rem',
                  background: 'linear-gradient(to right, #34d399, #10b981)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {translateCommodity(priceData.commodity, currentLang)} — {t('priceHistory.modalPriceTrend')}
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#52525b' }}>
                  {priceData.data.length} {t('priceHistory.dataPoints')} &nbsp;·&nbsp; Rs./Quintal &nbsp;·&nbsp; {t('priceHistory.hoverDetails')}
                </span>
              </div>
              <span style={{
                fontSize: '0.8rem', color: '#86efac',
                background: 'rgba(34,197,94,0.08)', padding: '0.3rem 0.9rem',
                borderRadius: '20px', border: '1px solid rgba(34,197,94,0.2)',
                whiteSpace: 'nowrap', alignSelf: 'flex-start',
              }}>
                {translateState(filters.state, currentLang) || t('priceHistory.allStatesLabel')}
                {filters.startDate ? ` · ${fmtShort(filters.startDate)}` : ''}
                {filters.endDate   ? ` → ${fmtShort(filters.endDate)}`   : ''}
              </span>
            </div>
            <LineChart data={priceData.data} />
          </div>

          {/* ── Table Card ── */}
          <div className="glass-panel" style={{ maxWidth: '100%', margin: 0, padding: '1.5rem 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 style={{
                fontSize: '1.15rem', fontWeight: 600, margin: 0,
                background: 'linear-gradient(to right, #34d399, #10b981)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                {t('priceHistory.detailedData')}
              </h2>

              {/* CSV Download Button */}
              <button
                onClick={() => downloadCSV(priceData.data, priceData.commodity, filters)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.5rem 1.1rem',
                  background: 'rgba(34,197,94,0.08)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '10px',
                  color: '#86efac',
                  fontSize: '0.875rem', fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(34,197,94,0.18)';
                  e.currentTarget.style.transform   = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow   = '0 4px 12px rgba(34,197,94,0.2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(34,197,94,0.08)';
                  e.currentTarget.style.transform   = 'translateY(0)';
                  e.currentTarget.style.boxShadow   = 'none';
                }}
              >
                {/* Download icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                {t('priceHistory.downloadCSV')}
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {[
                      t('priceHistory.date'),
                      `${t('priceHistory.minPrice')} (₹)`,
                      `${t('priceHistory.modalPrice')} (₹)`,
                      `${t('priceHistory.maxPrice')} (₹)`,
                      t('priceHistory.arrival'),
                      t('priceHistory.markets'),
                    ].map(col => (
                      <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {priceData.data.map((row, i) => (
                    <tr
                      key={row.date}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.05)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'; }}
                    >
                      <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{row.date}</td>
                      <td style={{ padding: '0.7rem 1rem' }}>{row.min_price   != null ? row.min_price.toLocaleString('en-IN')   : '—'}</td>
                      <td style={{ padding: '0.7rem 1rem', color: '#22c55e', fontWeight: 600 }}>{row.modal_price != null ? row.modal_price.toLocaleString('en-IN') : '—'}</td>
                      <td style={{ padding: '0.7rem 1rem' }}>{row.max_price   != null ? row.max_price.toLocaleString('en-IN')   : '—'}</td>
                      <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>
                        {row.total_arrival != null ? `${row.total_arrival.toLocaleString('en-IN')} MT` : '—'}
                      </td>
                      <td style={{ padding: '0.7rem 1rem', color: 'var(--text-muted)' }}>{row.market_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PriceHistory;
