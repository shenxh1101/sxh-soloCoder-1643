import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import EventList from '@/pages/EventList';
import EventOverview from '@/pages/EventOverview';
import GuestManagement from '@/pages/GuestManagement';
import GuestDetail from '@/pages/GuestDetail';
import CheckInPage from '@/pages/CheckInPage';
import SeatManagement from '@/pages/SeatManagement';
import ReportPage from '@/pages/ReportPage';
import ForumManagement from '@/pages/ForumManagement';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="events" element={<EventList />} />
          <Route path="events/:eventId" element={<EventOverview />} />
          <Route path="events/:eventId/guests" element={<GuestManagement />} />
          <Route path="events/:eventId/guests/:guestId" element={<GuestDetail />} />
          <Route path="events/:eventId/checkin" element={<CheckInPage />} />
          <Route path="events/:eventId/seats" element={<SeatManagement />} />
          <Route path="events/:eventId/reports" element={<ReportPage />} />
          <Route path="events/:eventId/forums" element={<ForumManagement />} />
        </Route>

        <Route path="*" element={<Navigate to="/events" replace />} />
      </Routes>
    </Router>
  );
}
