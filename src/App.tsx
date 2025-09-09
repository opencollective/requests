import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { NostrProvider } from './contexts/NostrProvider';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import RequestPage from './pages/RequestPage';
import QueueItemPage from './pages/QueueItemPage';
import './index.css';

function App() {
  return (
    <NostrProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/request" element={<RequestPage />} />
            <Route
              path="/requests/:requestId"
              element={<RequestDetailPage />}
            />
            <Route path="/queue/:queueItemId" element={<QueueItemPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </NostrProvider>
  );
}

export default App;
