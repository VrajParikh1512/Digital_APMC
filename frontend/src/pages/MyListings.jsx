import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import VoiceInput from '../components/VoiceInput';
import cropPlaceholder from '../assets/crop_placeholder.jpg';

const EMPTY_FORM = { cropName: '', quantity: '', price: '', location: '', description: '', image: '' };

// Shrinks a photo to at most 800px and saves it as a small JPEG.
// Phone photos are several MB; this keeps the database and the page fast.
const resizeImage = (file, maxSize = 800) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const MyListings = () => {
  const { user, logout } = useContext(AuthContext);
  const { t } = useTranslation();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  const [saving, setSaving] = useState(false);

  const authHeaders = { Authorization: `Bearer ${user.token}` };

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/crops?farmerId=${user._id}`, { headers: authHeaders });
      const data = await res.json();

      if (res.ok) {
        setListings(data);
      } else if (res.status === 401) {
        logout(); // token expired
      } else {
        setListings([]);
      }
    } catch (error) {
      console.error('Error fetching listings', error);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (name, value) => setFormData(prev => ({ ...prev, [name]: value }));
  const handleChange = (e) => setField(e.target.name, e.target.value);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setField('image', await resizeImage(file));
    } catch {
      setMessage({ type: 'error', text: 'Could not read this image. Please choose another one.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.cropName.trim() || !formData.location.trim() || !(Number(formData.quantity) > 0) || !(Number(formData.price) > 0)) {
      setMessage({ type: 'error', text: t('myListings.fillRequired') });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(editingId ? `/api/crops/${editingId}` : '/api/crops', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: editingId ? t('myListings.updated') : t('myListings.created') });
        setFormData(EMPTY_FORM);
        setEditingId(null);
        fetchMyListings();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Something went wrong' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not connect to the server.' });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (crop) => {
    setMessage(null);
    setEditingId(crop._id);
    setFormData({
      cropName: crop.cropName,
      quantity: crop.quantity,
      price: crop.price,
      location: crop.location,
      description: crop.description || '',
      image: crop.image || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setMessage(null);
  };

  const handleDelete = async (crop) => {
    if (!window.confirm(t('myListings.confirmDelete'))) return;
    try {
      const res = await fetch(`/api/crops/${crop._id}`, { method: 'DELETE', headers: authHeaders });
      if (res.ok) {
        if (editingId === crop._id) cancelEdit();
        setMessage({ type: 'success', text: t('myListings.deleted') });
        fetchMyListings();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.message || 'Could not delete.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not connect to the server.' });
    }
  };

  return (
    <div className="page-wrapper" style={{ alignItems: 'flex-start' }}>
      <div className="two-col">

        {/* Form Section */}
        <div className="glass-panel" style={{ margin: 0, maxWidth: '100%' }}>
          <h2>{editingId ? t('myListings.editListing') : t('myListings.createNewListing')}</h2>
          <p className="subtitle" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            {editingId ? t('myListings.updateSubtitle') : t('myListings.createSubtitle')}
          </p>

          {message && (
            <div className={`notice ${message.type === 'success' ? 'notice-success' : 'notice-error'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('myListings.cropName')}</label>
              <VoiceInput type="text" value={formData.cropName} onChange={(v) => setField('cropName', v)} required />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>{t('myListings.quantity')}</label>
                <input type="number" min="1" name="quantity" value={formData.quantity} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>{t('myListings.price')}</label>
                <input type="number" min="0.01" step="any" name="price" value={formData.price} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-group">
              <label>{t('myListings.location')}</label>
              <VoiceInput type="text" value={formData.location} onChange={(v) => setField('location', v)} required />
            </div>

            <div className="form-group">
              <label>{t('myListings.description')}</label>
              <VoiceInput multiline append value={formData.description} onChange={(v) => setField('description', v)} />
            </div>

            <div className="form-group">
              <label>{t('myListings.cropImage')}</label>
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ padding: '0.5rem' }} />
              {formData.image && <img src={formData.image} alt="Preview" style={{ marginTop: '1rem', width: '100%', maxHeight: '150px', objectFit: 'cover', borderRadius: '8px' }} />}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn" style={{ flex: 1 }} disabled={saving}>
                {editingId ? t('myListings.updateBtn') : t('myListings.postBtn')}
              </button>
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
                <div key={crop._id} className="glass-panel" style={{ margin: 0, maxWidth: '100%', padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
                  <img src={crop.image || cropPlaceholder} alt={crop.cropName} style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px' }} />
                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)' }}>{crop.cropName}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{crop.location}</p>
                    <p><strong>{crop.quantity} kg</strong> at <strong>₹{crop.price}/kg</strong></p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button className="btn" style={{ padding: '0.5rem 1.5rem', margin: 0 }} onClick={() => startEdit(crop)}>
                      {t('myListings.editBtn')}
                    </button>
                    <button
                      className="btn"
                      style={{ padding: '0.5rem 1.5rem', margin: 0, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}
                      onClick={() => handleDelete(crop)}
                    >
                      {t('myListings.deleteBtn')}
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
