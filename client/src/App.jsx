import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EventsPage from './pages/EventsPage.jsx';
import MediaLibraryPage from './pages/MediaLibraryPage.jsx';
import DisplayScreen from './pages/DisplayScreen.jsx';
import LiveCamera from './pages/LiveCamera.jsx';
import SuperAdminPage from './pages/SuperAdminPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <EventsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/media"
              element={
                <ProtectedRoute>
                  <MediaLibraryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute role="superadmin">
                  <SuperAdminPage />
                </ProtectedRoute>
              }
            />

            {/* Public presentation endpoints: no admin login required */}
            <Route path="/display" element={<DisplayScreen />} />
            <Route path="/camera" element={<LiveCamera />} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
