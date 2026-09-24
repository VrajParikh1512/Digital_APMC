import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const MyListings = () => {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    cropName: '',
    quantity: '',
    price: '',
    location: '',
    description: '',
    image: '' // Base64 string
  });

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crops?farmerId=${user._id}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await res.json();
      
      if (res.ok) {
        setListings(data);
      } else {
        if (res.status === 401 && logout) {
          logout();
        } else {
          setListings([]);
        }
      }
    } catch (error) {
      console.error('Error fetching listings', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'Farmer') {
      fetchMyListings();
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cropName || !formData.quantity || !formData.price || !formData.location) {
      alert('Please fill all required fields');
      return;
    }

    try {
      const url = editingId ? `/api/crops/${editingId}` : '/api/crops';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          price: Number(formData.price)
        })
      });

      if (res.ok) {
        alert(editingId ? 'Listing updated successfully!' : 'Listing created successfully!');
        setFormData({ cropName: '', quantity: '', price: '', location: '', description: '', image: '' });
        setEditingId(null);
        fetchMyListings();
      } else {
        const err = await res.json();
        alert(`Error: ${err.message}`);
      }
    } catch (error) {
      alert('Something went wrong');
    }
  };

  const startEdit = (crop) => {
    setEditingId(crop._id);
    setFormData({
      cropName: crop.cropName,
      quantity: crop.quantity,
      price: crop.price,
      location: crop.location,
      description: crop.description || '',
      image: crop.image
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ cropName: '', quantity: '', price: '', location: '', description: '', image: '' });
  };

  if (!user || user.role !== 'Farmer') {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="page-wrapper" style={{ alignItems: 'flex-start' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Form Section */}
        <div className="glass-panel" style={{ margin: 0, maxWidth: '100%' }}>
          <h2>{editingId ? t('myListings.editListing') : t('myListings.createNewListing')}</h2>
          <p className="subtitle" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            {editingId ? t('myListings.updateSubtitle') : t('myListings.createSubtitle')}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('myListings.cropName')}</label>
              <input type="text" name="cropName" value={formData.cropName} onChange={handleChange} required />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>{t('myListings.quantity')}</label>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>{t('myListings.price')}</label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>{t('myListings.location')}</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>{t('myListings.description')}</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange}
                style={{ width: '100%', padding: '0.875rem 1.25rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'white', outline: 'none', resize: 'vertical', minHeight: '80px' }}
              />
            </div>

            <div className="form-group">
              <label>{t('myListings.cropImage')}</label>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ padding: '0.5rem' }} />
              {formData.image && <img src={formData.image} alt="Preview" style={{ marginTop: '1rem', width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px' }} />}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn" style={{ flex: 1 }}>{editingId ? t('myListings.updateBtn') : t('myListings.postBtn')}</button>
              {editingId && (
                <button type="button" className="btn" style={{ flex: 1, background: 'var(--error)' }} onClick={cancelEdit}>{t('myListings.cancelBtn')}</button>
              )}
            </div>
          </form>
        </div>

        {/* Listings Section */}
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>{t('myListings.myListedCrops')}</h2>
          {loading ? (
            <p>{t('myListings.loading')}</p>
          ) : listings.length === 0 ? (
            <div className="glass-panel" style={{ margin: 0, maxWidth: '100%', textAlign: 'center', padding: '3rem' }}>
              {t('myListings.noCropsYet')}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              {listings.map(crop => (
                <div key={crop._id} className="glass-panel" style={{ margin: 0, maxWidth: '100%', padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                  <img src={crop.image} alt={crop.cropName} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px' }} />
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{crop.cropName}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{crop.location}</p>
                    <p><strong>{crop.quantity} kg</strong> at <strong>₹{crop.price}/kg</strong></p>
                  </div>
                  <div>
                    <button className="btn" style={{ padding: '0.5rem 1.5rem', margin: 0 }} onClick={() => startEdit(crop)}>
                      {t('myListings.editBtn')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MyListings;
