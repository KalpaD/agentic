import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const GENERIC_ERROR = 'Invalid username or password';

export function AuthPage(): JSX.Element {
  const { status, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // If we're already signed in, skip the form entirely.
  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
      // Don't reset `submitting` on success — this component unmounts after
      // navigation and setState on an unmounted component is a noop that
      // React warns about during tests.
    } catch {
      // Generic, field-agnostic message (Property 1 mirrors the API behavior).
      setError(GENERIC_ERROR);
      setSubmitting(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 360,
        margin: '4rem auto',
        padding: '2rem',
        border: '1px solid #ddd',
        borderRadius: 8,
        fontFamily: 'sans-serif',
      }}
    >
      <h1 style={{ marginTop: 0 }}>Sign in</h1>
      <form onSubmit={handleSubmit} noValidate>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>
          Username
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-label="Username"
            autoComplete="username"
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: '1rem' }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password"
            autoComplete="current-password"
            required
            style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          style={{ width: '100%', padding: '0.75rem', cursor: submitting ? 'progress' : 'pointer' }}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        {error && (
          <div
            role="alert"
            style={{
              marginTop: '1rem',
              padding: '0.5rem',
              background: '#fdd',
              border: '1px solid #f99',
              borderRadius: 4,
              color: '#900',
            }}
          >
            {error}
          </div>
        )}
      </form>
    </main>
  );
}
