import { useParams } from 'react-router-dom';

// Placeholder — TipTap editor arrives in TASK-08.
export function EditorPage(): JSX.Element {
  const { id } = useParams();
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Editor</h1>
      <p>
        Editing article <code>{id}</code>. Editor UI coming in TASK-08.
      </p>
    </main>
  );
}
