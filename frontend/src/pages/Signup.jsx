import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
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
    
    if (!formData.name || !formData.email || !formData.password || !formData.role) {
      setError('Please fill in all fields');
      return;
    }

    const res = await signup(formData.name, formData.email, formData.password, formData.role);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.message || 'Signup failed');
    }
  };

  return (
    <div className="page-wrapper">
      <div className="glass-panel">
        <h1>Create Account</h1>
        <p className="subtitle">Join the Digital APMC platform today</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              name="name"
              placeholder="Enter your full name" 
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              name="email"
              placeholder="Enter your email" 
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              name="password"
              placeholder="Create a strong password" 
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>I am a</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="Farmer">Farmer</option>
              <option value="Business Owner">Business Owner</option>
            </select>
          </div>
          
          <button type="submit" className="btn">Sign Up</button>
        </form>
        
        <div className="form-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
