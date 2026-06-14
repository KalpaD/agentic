import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Header(): JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid #ddd',
        fontFamily: 'sans-serif',
      }}
    >
      <strong>Blog</strong>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span data-testid="header-username">{user?.username}</span>
        <button type="button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}
