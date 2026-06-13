import { BrowserRouter, Routes, Route } from 'react-router-dom';

/**
 * Placeholder home page component.
 * Will be replaced with the real Dashboard and AuthPage in subsequent tasks.
 */
function HomePage(): JSX.Element {
  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1>Blog Application</h1>
      <p>Welcome! The application is loading...</p>
    </div>
  );
}

/**
 * Root application component.
 * Sets up React Router with the top-level route structure.
 * Feature routes will be added in subsequent tasks.
 */
function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
