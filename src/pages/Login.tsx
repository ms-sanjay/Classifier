import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { UserCircle2, Lock, Stethoscope, User } from 'lucide-react';
import '../styles/login.css';

function Login() {
  const [userType, setUserType] = useState<'doctor' | 'patient'>('doctor');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(userType, { username, password });
      navigate('/analysis');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Medical Foot Analysis System</h1>
          <p>Login to access the analysis tools</p>
        </div>

        <div className="user-type-selector">
          <button
            onClick={() => setUserType('doctor')}
            className={`user-type-btn ${userType === 'doctor' ? 'active-doctor' : ''}`}
          >
            <Stethoscope className={`icon ${userType === 'doctor' ? 'active-icon-doctor' : ''}`} />
            <p className={userType === 'doctor' ? 'active-text-doctor' : ''}>Doctor</p>
          </button>
          <button
            onClick={() => setUserType('patient')}
            className={`user-type-btn ${userType === 'patient' ? 'active-patient' : ''}`}
          >
            <User className={`icon ${userType === 'patient' ? 'active-icon-patient' : ''}`} />
            <p className={userType === 'patient' ? 'active-text-patient' : ''}>Patient</p>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <div className="input-wrapper">
              <UserCircle2 className="input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="login-input"
                required
              />
            </div>
          </div>
          <div className="input-group">
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="login-input"
                required
              />
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button type="submit" className="login-button">
            Login
          </button>
        </form>

        {/* <div className="demo-credentials">
          <h3>Demo Credentials</h3>
          <div className="credentials-grid">
            <div>
              <strong>Doctor:</strong>
              <p>Username: Doctor</p>
              <p>Password: Doctor123</p>
            </div>
            <div>
              <strong>Patient:</strong>
              <p>Username: patient1</p>
              <p>Password: patient123</p>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}

export default Login;
