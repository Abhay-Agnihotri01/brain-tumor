import { useState } from 'react';
import axios from 'axios';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', adminCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const validatePassword = (password) => {
    // Basic password strength: at least 8 chars, 1 number, 1 special char
    const re = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    return re.test(password);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear errors when typing
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!isLogin && !formData.name.trim()) newErrors.name = "Name is required.";
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email format.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (!isLogin && !validatePassword(formData.password)) {
      newErrors.password = "Password must be at least 8 chars long with 1 number & 1 special character.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      if (!isLogin) {
        // SIGNUP
        await axios.post(`${API_URL}/api/register`, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          admin_code: formData.adminCode.trim()
        });
        // Switch to login after successful signup
        setIsLogin(true);
        setFormData({ ...formData, password: '', adminCode: '' });
        alert('Registration successful! Please login.');
      } else {
        // LOGIN
        const res = await axios.post(`${API_URL}/api/login`, {
          email: formData.email.trim(),
          password: formData.password
        });
        localStorage.setItem('mri_token', res.data.access_token);
        localStorage.setItem('mri_user_name', res.data.name);
        localStorage.setItem('mri_is_admin', res.data.is_admin);
        onLogin(res.data.access_token, res.data.name, res.data.is_admin);
      }
    } catch (err) {
      if (err.response && err.response.data) {
        setErrors({ general: err.response.data.error || 'Authentication failed' });
      } else {
        setErrors({ general: 'Network error. Make sure the backend is running.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-bg-sphere sphere-1"></div>
      <div className="auth-bg-sphere sphere-2"></div>
      
      <div className={`auth-card ${isLogin ? 'login-mode' : 'signup-mode'}`}>
        <div className="auth-header">
          <div className="auth-logo">🧠</div>
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>
            {isLogin 
             ? 'Enter your credentials to access the MRI Dashboard.' 
             : 'Sign up to start analyzing Brain MRI scans with AI.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {errors.general && <div className="error-banner">{errors.general}</div>}
          
          {!isLogin && (
            <div className={`input-group ${errors.name ? 'has-error' : ''}`}>
              <input 
                type="text" 
                name="name" 
                placeholder="Full Name" 
                value={formData.name} 
                onChange={handleChange} 
              />
              <span className="input-icon">👤</span>
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
          )}

          <div className={`input-group ${isLogin ? '' : 'slide-in'} ${errors.email ? 'has-error' : ''}`}>
            <input 
              type="email" 
              name="email" 
              placeholder="Email Address" 
              value={formData.email} 
              onChange={handleChange} 
            />
            <span className="input-icon">✉️</span>
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className={`input-group ${errors.password ? 'has-error' : ''}`}>
            <input 
              type={showPassword ? "text" : "password"} 
              name="password" 
              placeholder="Password" 
              value={formData.password} 
              onChange={handleChange} 
            />
            <span className="input-icon">🔒</span>
            <span 
              className="toggle-password" 
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </span>
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          {!isLogin && (
            <div className={`input-group slide-in`}>
              <input 
                type="text" 
                name="adminCode" 
                placeholder="Admin Code (Optional)" 
                value={formData.adminCode} 
                onChange={handleChange} 
              />
              <span className="input-icon">🔑</span>
            </div>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Login to Dashboard' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span className="auth-toggle" onClick={() => {
              setIsLogin(!isLogin);
              setErrors({});
            }}>
              {isLogin ? ' Sign up here' : ' Login here'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
