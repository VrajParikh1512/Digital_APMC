import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import VoiceInput from '../components/VoiceInput';
import cropPlaceholder from '../assets/crop_placeholder.jpg';

const Marketplace = () => {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeContactId, setActiveContactId] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [minQty, setMinQty] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Loads crops from the server. Filter values can be passed in so that
  // "Clear" and voice search use the new values immediately.
  const fetchCrops = async (filters = { search, minQty, maxPrice }) => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filters.search.trim()) params.append('search', filters.search.trim());
      if (filters.minQty) params.append('minQty', filters.minQty);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

      const res = await fetch(`/api/crops?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const data = await res.json();

      if (res.ok) {
        setCrops(data);
      } else if (res.status === 401) {
        logout(); // token expired
      } else {
        setCrops([]);
        setError(data.message || 'Could not load crops.');
      }
    } catch (err) {
      console.error('Error fetching crops', err);
      setCrops([]);
      setError('Could not connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCrops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault(); // pressing Enter in any box also runs the filter
    fetchCrops();
  };

  const handleClear = () => {
    setSearch('');
    setMinQty('');
    setMaxPrice('');
    fetchCrops({ search: '', minQty: '', maxPrice: '' });
  };

  return (
    <div className="page-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="glass-panel" style={{ maxWidth: '1200px', margin: '0 auto 2rem auto', padding: '1.5rem 2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{t('marketplace.findCrops')}</h2>

        <form onSubmit={handleSubmit}>
          <div className="filter-grid">
            <div className="form-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
              <label>{t('marketplace.searchCrop')}</label>
              <VoiceInput
                type="text"
                placeholder={t('marketplace.searchPlaceholder')}
                value={search}
                onChange={setSearch}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('marketplace.minQty')}</label>
              <input type="number" min="0" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>{t('marketplace.maxPrice')}</label>
              <input type="number" min="0" placeholder="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn" style={{ margin: 0, padding: '0.875rem 1.5rem' }}>
                {t('marketplace.filter')}
              </button>
              <button
                type="button"
                className="btn"
                style={{ margin: 0, padding: '0.875rem 1.25rem', background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)' }}
                onClick={handleClear}
              >
                {t('marketplace.clear')}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {error && <div className="notice notice-error">{error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>{t('marketplace.loading')}</div>
        ) : crops.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
            {t('marketplace.noCrops')}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {crops.map(crop => (
              <div key={crop._id} className="glass-panel crop-card" style={{ padding: 0, overflow: 'hidden', maxWidth: '100%', margin: 0, animation: 'none' }}>
                <div className="crop-img" style={{ height: '200px', width: '100%', backgroundImage: `url(${crop.image || cropPlaceholder})`, backgroundSize: 'cover', backgroundPosition: 'center', transition: 'transform 0.4s ease' }}></div>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{crop.cropName}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{crop.location}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>{t('marketplace.price')}: <strong style={{ color: 'var(--primary)' }}>₹{crop.price}/kg</strong></span>
                    <span>{t('marketplace.quantity')}: <strong>{crop.quantity}kg</strong></span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {crop.description || t('marketplace.noDescription')}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{t('marketplace.farmer')}: {crop.farmer?.name}</p>

                    {activeContactId === crop._id ? (
                      <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{t('marketplace.contactInfo')}</strong>
                          <button
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', padding: '0' }}
                            onClick={() => setActiveContactId(null)}
                          >
                            {t('marketplace.close')}
                          </button>
                        </div>
                        <span style={{ fontSize: '0.9rem' }}>{crop.farmer?.name}</span>
                        {crop.farmer?.phoneNumber ? (
                          <a href={`tel:${crop.farmer.phoneNumber}`} style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#86efac', textDecoration: 'none' }}>
                            📞 {crop.farmer.phoneNumber}
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.9rem' }}>{t('marketplace.noPhone')}</span>
                        )}
                      </div>
                    ) : (
                      <button className="btn" style={{ padding: '0.5rem' }} onClick={() => setActiveContactId(crop._id)}>
                        {t('marketplace.contactFarmer')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Marketplace;
