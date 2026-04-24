import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, verifyEmail } from '../api/UserApi';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await register(email, password, confirm);
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'verify') {
    return <VerifyStep email={email} />;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🥗 PantryPal</div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Find recipes you can make right now</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function VerifyStep({ email }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verifyEmail(email, code);
      navigate('/login', { state: { verified: true } });
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🥗 PantryPal</div>
        <h1 className="auth-title">Verify your email</h1>
        <p className="auth-sub">We sent a 6-digit code to <strong>{email}</strong></p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleVerify} className="auth-form">
          <label>Verification Code</label>
          <input
            type="text"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            maxLength={6}
            autoFocus
          />
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify Email'}
          </button>
        </form>
      </div>
    </div>
  );
}
