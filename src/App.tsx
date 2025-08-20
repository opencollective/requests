import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { NostrProvider } from './contexts/NostrProvider';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import NewRequestPage from './pages/NewRequestPage';
import EmbeddableRequestPage from './pages/EmbeddableRequestPage';
import { OpenBunkerLoginPopup } from './pages/OpenBunkerLoginPopup';
import './index.css';

function App() {
  return (
    <NostrProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/new-request" element={<NewRequestPage />} />
            <Route path="/embed" element={<EmbeddableRequestPage />} />
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
