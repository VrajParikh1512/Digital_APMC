import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Marketplace from './pages/Marketplace';
import MyListings from './pages/MyListings';
import PriceHistory from './pages/PriceHistory';
import PricePrediction from './pages/PricePrediction';
import AdminPanel from './pages/AdminPanel';

// Sends each role to its own home page after login
const Dashboard = () => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'Farmer') return <Navigate to="/my-listings" replace />;
  if (user.role === 'Business Owner') return <Navigate to="/marketplace" replace />;
  return <Navigate to="/admin" replace />;
};

// Login/Signup are not useful when already logged in
const GuestOnly = ({ children }) => {
  const { user } = useContext(AuthContext);
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const NotFound = () => (
  <div className="page-wrapper">
    <div className="glass-panel" style={{ textAlign: 'center' }}>
      <h1>404</h1>
      <p className="subtitle">This page does not exist.</p>
      <a href="/" className="btn" style={{ display: 'inline-block', textDecoration: 'none', width: 'auto', padding: '0.75rem 2rem' }}>
        Go home
      </a>
    </div>
  </div>
);

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;
  }

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login"  element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/marketplace" element={<ProtectedRoute roles={['Business Owner']}><Marketplace /></ProtectedRoute>} />
        <Route path="/my-listings" element={<ProtectedRoute roles={['Farmer']}><MyListings /></ProtectedRoute>} />
        <Route path="/price-history" element={<ProtectedRoute roles={['Farmer']}><PriceHistory /></ProtectedRoute>} />
        <Route path="/price-prediction" element={<ProtectedRoute roles={['Farmer']}><PricePrediction /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute roles={['Admin']}><AdminPanel /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
