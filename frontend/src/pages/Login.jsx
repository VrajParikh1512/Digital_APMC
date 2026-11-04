import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!phoneNumber.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    const res = await login(phoneNumber, password);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Login failed');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="glass-panel">
        <h1>{t('auth.welcomeBack')}</h1>
        <p className="subtitle">{t('auth.signInSubtitle')}</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('auth.phone')}</label>
            <input 
              type="tel" 
              autoComplete="tel"
              placeholder={t('auth.phonePlaceholder')} 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>{t('auth.password')}</label>
            <input 
              type="password" 
              autoComplete="current-password"
              placeholder={t('auth.passwordPlaceholderLogin')} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn">{t('auth.signInBtn')}</button>
        </form>
        
        <div className="form-footer">
          {t('auth.noAccount')} <Link to="/signup">{t('auth.createOne')}</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
