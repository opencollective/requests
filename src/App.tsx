import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { NostrProvider } from './contexts/NostrProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import NewRequestPage from './pages/NewRequestPage';
import { AllRequestsPage } from './pages/AllRequestsPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import EmbeddableRequestPage from './pages/EmbeddableRequestPage';
import { OpenBunkerLoginPopup } from './pages/OpenBunkerLoginPopup';
import './index.css';

function App() {
  return (
    <NostrProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route
              path="/login"
              element={
                <ProtectedRoute requireAuth={false}>
                  <LoginPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requireAuth={true}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/new-request"
              element={
                <ProtectedRoute requireAuth={true}>
                  <NewRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests"
              element={
                <ProtectedRoute requireAuth={true}>
                  <AllRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/requests/:requestId"
              element={
                <ProtectedRoute requireAuth={true}>
                  <RequestDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/embed"
              element={
                <ProtectedRoute requireAuth={true}>
                  <EmbeddableRequestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/openbunker-login-popup"
              element={<OpenBunkerLoginPopup />}
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </NostrProvider>
  );
}

export default App;
