import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  return (
    <nav className="navbar">
      <Link to="/" className="logo">
        Digital <span>APMC</span>
      </Link>
      <div>
        {user ? (
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {user.role === 'Business Owner' && (
              <Link to="/marketplace" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>Marketplace</Link>
            )}
            {user.role === 'Farmer' && (
              <Link to="/my-listings" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>My Listings</Link>
            )}
            <span style={{ color: 'var(--text-muted)' }}>{user.name} ({user.role})</span>
            <button className="btn" style={{ padding: '0.4rem 1rem', marginTop: 0 }} onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>Login</Link>
            <Link to="/signup" className="btn" style={{ padding: '0.4rem 1rem', marginTop: 0, textDecoration: 'none' }}>Sign Up</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" />;
  
  if (user.role === 'Farmer') {
    return <Navigate to="/my-listings" />;
  } else if (user.role === 'Business Owner') {
    return <Navigate to="/marketplace" />;
  }

  return (
    <div className="page-wrapper">
      <div className="glass-panel" style={{ maxWidth: '800px', width: '100%' }}>
        <h1>Dashboard</h1>
        <p className="subtitle">Role: {user.role}</p>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Welcome Admin. Future features will be available here.
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
