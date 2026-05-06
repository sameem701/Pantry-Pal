import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, verifyEmail } from '../api/UserApi';
import { Utensils } from 'lucide-react';
import './Auth.css';

function validateUsername(v) {
  return v.length >= 1 && v.length <= 20 && !/[\s-]/.test(v);
}

function CodeInput({ onChange }) {
  const inputRefs = useRef([]);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);

  function handleChange(index, e) {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    onChange(next.join(''));
    if (val && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    onChange(next.join(''));
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  }

  return (
    <div className="code-input-row">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => inputRefs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          className="code-box"
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // 'form' | 'verify'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateUsername(username)) {
      setError('Username must be 1–20 characters with no spaces or hyphens.');
      return;
    }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      await register(username, password, confirm);
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'verify') {
    return <VerifyStep username={username} />;
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><Utensils size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} />PantryPal</div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Find recipes you can make right now</p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleSubmit} className="auth-form">
          <label>Username</label>
          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
            required
            autoFocus
          />
          {username && !validateUsername(username) && (
            <span className="auth-field-hint">Max 20 chars, no spaces or hyphens</span>
          )}

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

function VerifyStep({ username }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    if (code.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      await verifyEmail(username, code);
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
        <div className="auth-logo"><Utensils size={22} style={{ verticalAlign: 'middle', marginRight: 6 }} />PantryPal</div>
        <h1 className="auth-title">Verify your account</h1>
        <p className="auth-sub">We sent a 6-digit code to <strong>{username}</strong></p>

        {error && <p className="auth-error">{error}</p>}

        <form onSubmit={handleVerify} className="auth-form">
          <label>Verification Code</label>
          <CodeInput onChange={setCode} />
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Verifying…' : 'Verify Account'}
          </button>
        </form>
      </div>
    </div>
  );
}


