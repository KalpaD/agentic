import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthPage } from './auth/AuthPage';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<AuthPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Header />
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/articles/:id/edit"
            element={
              <ProtectedRoute>
                <Header />
                <EditorPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
