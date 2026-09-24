import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import { useTranslation } from 'react-i18next';
import { languageOptions } from './translations';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        Digital <span>APMC</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <select 
          onChange={handleLanguageChange} 
          value={i18n.language}
          style={{ padding: '0.4rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.2)' }}
        >
          {languageOptions.map((lang) => (
            <option key={lang.code} value={lang.code} style={{ color: 'black' }}>
              {lang.label}
            </option>
          ))}
        </select>
        {user ? (
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {user.role === 'Business Owner' && (
              <Link to="/marketplace" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>{t('navbar.marketplace')}</Link>
            )}
            {user.role === 'Farmer' && (
              <Link to="/my-listings" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>{t('navbar.myListings')}</Link>
            )}
            <span style={{ color: 'var(--text-muted)' }}>{user.name} ({user.role})</span>
            <button className="btn" style={{ padding: '0.4rem 1rem', marginTop: 0 }} onClick={logout}>
              {t('navbar.logout')}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>{t('navbar.login')}</Link>
            <Link to="/signup" className="btn" style={{ padding: '0.4rem 1rem', marginTop: 0, textDecoration: 'none' }}>{t('navbar.signup')}</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { t } = useTranslation();
  if (!user) return <Navigate to="/login" />;
  
  if (user.role === 'Farmer') {
    return <Navigate to="/my-listings" />;
  } else if (user.role === 'Business Owner') {
    return <Navigate to="/marketplace" />;
  }

  return (
    <div className="page-wrapper">
      <div className="glass-panel" style={{ maxWidth: '800px', width: '100%' }}>
        <h1>{t('dashboard.title')}</h1>
        <p className="subtitle">{t('dashboard.subtitle')} {user.role}</p>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          {t('dashboard.welcome')}
        </div>
      </div>
    </div>
  );
};

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;
  }

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/my-listings" element={<MyListings />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
