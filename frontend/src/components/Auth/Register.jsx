import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import styles from './Auth.module.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasNumber: false,
    hasSymbol: false
  });
  const { register } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Real-time password validation
  useEffect(() => {
    setPasswordValidation({
      minLength: password.length >= 9,
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSymbol: /[!@#$%^&*()_+\-=\[\]{}|;:'",.<>?/~`]/.test(password)
    });
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await register(username, email, password);
      addNotification('Registration successful! Welcome aboard!', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      setPassword('');
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <Link to="/" className={styles.backLink}>← Back to Dashboard</Link>
        <h1>Register</h1>
        <p className={styles.subtitle}>Create your account</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <div className={styles.passwordRequirements}>
                <p className={styles.requirementsTitle}>Password must contain:</p>
                <div className={styles.requirementsList}>
                  <div className={`${styles.requirement} ${passwordValidation.minLength ? styles.valid : styles.invalid}`}>
                    <span className={styles.icon}>{passwordValidation.minLength ? '✓' : '○'}</span>
                    <span>At least 9 characters</span>
                  </div>
                  <div className={`${styles.requirement} ${passwordValidation.hasUppercase ? styles.valid : styles.invalid}`}>
                    <span className={styles.icon}>{passwordValidation.hasUppercase ? '✓' : '○'}</span>
                    <span>One uppercase letter (A-Z)</span>
                  </div>
                  <div className={`${styles.requirement} ${passwordValidation.hasNumber ? styles.valid : styles.invalid}`}>
                    <span className={styles.icon}>{passwordValidation.hasNumber ? '✓' : '○'}</span>
                    <span>One number (0-9)</span>
                  </div>
                  <div className={`${styles.requirement} ${passwordValidation.hasSymbol ? styles.valid : styles.invalid}`}>
                    <span className={styles.icon}>{passwordValidation.hasSymbol ? '✓' : '○'}</span>
                    <span>One symbol (!@#$%^&*...)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Register
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
