import { useAuth } from '../auth/AuthContext';

// Placeholder — full dashboard arrives in TASK-07.
export function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Dashboard</h1>
      <p>
        Welcome, <strong>{user?.username}</strong>. Article list coming in TASK-07.
      </p>
    </main>
  );
}
