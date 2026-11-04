import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Signup = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    password: '',
    role: 'Farmer' // default
  });
  const [error, setError] = useState('');
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim() || !formData.phoneNumber || !formData.password || !formData.role) {
      setError('Please fill in all fields');
      return;
    }

    // Same rules as the server: 10-digit phone, password of at least 6 characters
    const digits = formData.phoneNumber.replace(/\D/g, '');
    const phone10 = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
    if (!/^\d{10}$/.test(phone10)) {
      setError('Phone number must be 10 digits');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const res = await signup(formData.name, formData.phoneNumber, formData.password, formData.role);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Signup failed');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="glass-panel">
        <h1>{t('auth.createAccount')}</h1>
        <p className="subtitle">{t('auth.joinPlatform')}</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.fullName')}</label>
            <input 
              type="text" 
              name="name"
              placeholder={t('auth.namePlaceholder')} 
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>{t('auth.phone')}</label>
            <input 
              type="tel" 
              autoComplete="tel"
              name="phoneNumber"
              placeholder={t('auth.phonePlaceholder')} 
              value={formData.phoneNumber}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input 
              type="password" 
              autoComplete="new-password"
              name="password"
              placeholder={t('auth.passwordPlaceholderSignup')} 
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>{t('auth.iAmA')}</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="Farmer">{t('auth.farmer')}</option>
              <option value="Business Owner">{t('auth.businessOwner')}</option>
            </select>
          </div>
          
          <button type="submit" className="btn">{t('auth.signUpBtn')}</button>
        </form>
        
        <div className="form-footer">
          {t('auth.haveAccount')} <Link to="/login">{t('auth.signInLink')}</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
