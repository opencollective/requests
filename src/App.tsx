import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { NostrProvider } from './contexts/NostrProvider';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CommunityPage } from './pages/CommunityPage';
import { CommunitiesPage } from './pages/CommunitiesPage';
import { ProfilePage } from './pages/ProfilePage';
import { RequestDetailPage } from './pages/RequestDetailPage';
import { EventRawDataPage } from './pages/EventRawDataPage';
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
            <Route
              path="/community/:communityId/dashboard"
              element={<DashboardPage />}
            />
            <Route path="/community/:communityId" element={<CommunityPage />} />
            <Route path="/communities" element={<CommunitiesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/request" element={<RequestPage />} />
            <Route
              path="/requests/:requestId"
              element={<RequestDetailPage />}
            />
            <Route path="/queue/:queueItemId" element={<QueueItemPage />} />
            <Route path="/event/:nevent" element={<EventRawDataPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </NostrProvider>
  );
}

export default App;
