import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Marketplace = () => {
  const { user } = useContext(AuthContext);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [minQty, setMinQty] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchCrops = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (minQty) queryParams.append('minQty', minQty);
      if (maxPrice) queryParams.append('maxPrice', maxPrice);

      const res = await fetch(`/api/crops?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      setCrops(data);
    } catch (error) {
      console.error('Error fetching crops', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'Business Owner') {
      fetchCrops();
    }
  }, [user]);

  if (!user || user.role !== 'Business Owner') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="page-wrapper" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <div className="glass-panel" style={{ maxWidth: '1200px', margin: '0 auto 2rem auto', padding: '1.5rem 2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Find Crops</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Search Crop</label>
            <input type="text" placeholder="e.g. Wheat" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Min Quantity (kg)</label>
            <input type="number" placeholder="0" value={minQty} onChange={e => setMinQty(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Max Price (per kg)</label>
            <input type="number" placeholder="0" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
          </div>
          <button className="btn" style={{ margin: 0, padding: '0.875rem 2rem' }} onClick={fetchCrops}>Filter</button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Loading crops...</div>
        ) : crops.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: '12px' }}>
            No crops found matching your criteria.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {crops.map(crop => (
              <div key={crop._id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', maxWidth: '100%', margin: 0, animation: 'none' }}>
                <div style={{ height: '200px', width: '100%', backgroundImage: `url(${crop.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{crop.cropName}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>{crop.location}</p>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span>Price: <strong style={{ color: 'var(--primary)' }}>₹{crop.price}/kg</strong></span>
                    <span>Quantity: <strong>{crop.quantity}kg</strong></span>
                  </div>
                  
                  <p style={{ fontSize: '0.9rem', color: '#cbd5e1', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {crop.description || 'No description provided.'}
                  </p>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: 'auto' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Farmer: {crop.farmer?.name}</p>
                    <button className="btn" style={{ padding: '0.5rem' }} onClick={() => alert(`Contacting ${crop.farmer?.name} at ${crop.farmer?.email}`)}>
                      Contact Farmer
                    </button>
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
