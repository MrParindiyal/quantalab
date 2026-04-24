import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { LineChart, TrendingUp, Loader2 } from 'lucide-react';
import './LandingPage.css';

export function LandingPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  // Helper to clear messages
  const clearStatus = () => {
    setError('');
    setSuccessMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return setError('Credentials required');
    
    clearStatus();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Note: We send a dummy email because the schema requires it for now
        body: JSON.stringify({ username, password, email: "auth@quantalab.io" })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('token', data.access_token);
        setSuccessMsg('Welcome back! Entering terminal...');
        setTimeout(() => navigate('/dashboard'), 1200);
      } else {
        setError(data.detail || 'Invalid username or password');
      }
    } catch (err) {
      setError('Connection refused. Ensure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!username || !password) return setError('Please fill all fields');

    clearStatus();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          email: `${username.toLowerCase()}@quantalab-user.com` // Auto-generating email for the schema
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg('Account created! You can now log in.');
        // Optional: clear password field after registration
        setPassword('');
      } else {
        setError(data.detail || 'Registration failed. User might exist.');
      }
    } catch (err) {
      setError('Server unreachable. Check your backend terminal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="hero-section">
          <div className="logo">
            <TrendingUp size={48} color="var(--primary)" />
            <h1>QuantaLab</h1>
          </div>
          <p className="subtitle">Advanced AI Stock Market Dashboard & Simulator</p>
          <div className="features">
            <div className="feature-item">
              <LineChart size={24} />
              <span>Real-time technical analysis</span>
            </div>
            <div className="feature-item">
              <span style={{ fontSize: '1.5rem' }}>🧠</span>
              <span>Machine Learning predictions</span>
            </div>
            <div className="feature-item">
              <span style={{ fontSize: '1.5rem' }}>🧪</span>
              <span>Algorithm backtesting environment</span>
            </div>
          </div>
        </div>

        <div className="auth-section">
          <Card className="auth-card">
            <h2>Access Terminal</h2>
            <p className="auth-desc">Authenticate to manage your portfolios and strategies</p>
            
            <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
              <Input 
                label="Username" 
                placeholder="Terminal ID" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
              <Input 
                label="Password" 
                type="password"
                placeholder="Access Key" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              
              {error && <div className="form-alert error">{error}</div>}
              {successMsg && <div className="form-alert success">{successMsg}</div>}
              
              <div className="auth-buttons">
                <Button 
                  onClick={handleLogin} 
                  variant="primary" 
                  style={{ flex: 1 }} 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="spin" size={18} /> : 'Login'}
                </Button>
                <Button 
                  onClick={handleRegister} 
                  variant="secondary" 
                  style={{ flex: 1 }} 
                  disabled={loading}
                >
                  Register
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}