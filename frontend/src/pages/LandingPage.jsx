import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, BrainCircuit, LineChart, Loader2, Network } from 'lucide-react';
import './LandingPage.css';

export function LandingPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

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
        setSuccessMsg('Authentication successful. Initializing terminal...');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setError(data.detail || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection refused. Ensure backend is running.');
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
          email: `${username.toLowerCase()}@quantalab-user.com`
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg('Terminal ID provisioned. You may now authenticate.');
        setPassword('');
      } else {
        setError(data.detail || 'Provisioning failed. ID may be taken.');
      }
    } catch (err) {
      setError('Server unreachable. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="landing-page-wrapper">
      {/* Dynamic Background Elements */}
      <div className="landing-bg-elements">
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>
      </div>

      <div className="landing-content">
        <div className="hero-section">
          <div className="logo-container">
            <Activity size={56} color="#60a5fa" strokeWidth={2.5} />
            <h1>QuantaLab</h1>
          </div>
          <p className="subtitle">
            The next-generation quantitative analysis and algorithm simulation environment for modern traders.
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <LineChart size={28} />
              </div>
              <div className="feature-content">
                <h3>Institutional Grade Analytics</h3>
                <p>Real-time market data visualization with sub-millisecond precision and advanced technical indicators.</p>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <BrainCircuit size={28} />
              </div>
              <div className="feature-content">
                <h3>Predictive Intelligence</h3>
                <p>Leverage state-of-the-art machine learning models to identify market anomalies and price trends.</p>
              </div>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon-wrapper">
                <Network size={28} />
              </div>
              <div className="feature-content">
                <h3>Strategy Backtesting</h3>
                <p>Simulate high-frequency trading strategies against historical tick data in a risk-free environment.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-section">
          <div className="premium-auth-card">
            <div className="auth-header">
              <h2>Secure Access</h2>
              <p>Enter your credentials to initialize the terminal</p>
            </div>
            
            <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
              <div className="input-group">
                <label>Terminal ID</label>
                <input 
                  type="text"
                  className="premium-input"
                  placeholder="e.g. quant_trader_01" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </div>
              
              <div className="input-group">
                <label>Access Key</label>
                <input 
                  type="password"
                  className="premium-input"
                  placeholder="••••••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              
              {error && <div className="status-message status-error">{error}</div>}
              {successMsg && <div className="status-message status-success">{successMsg}</div>}
              
              <div className="auth-buttons-container">
                <button 
                  type="submit"
                  className="btn-premium btn-primary-glow"
                  onClick={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="spin-icon" size={20} />
                      Authenticating...
                    </>
                  ) : 'Initialize Session'}
                </button>
                <button 
                  type="button"
                  className="btn-premium btn-secondary-glass"
                  onClick={handleRegister}
                  disabled={loading}
                >
                  Provision New ID
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}