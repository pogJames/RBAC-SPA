import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Notification from './components/Notification/Notification';
import ApiInterceptor from './components/ApiInterceptor';
import GuestLayout from './components/Layout/GuestLayout';
import UserLayout from './components/Layout/UserLayout';
import Dashboard from './components/Dashboard/Dashboard';
import SensorManager from './components/Sensors/SensorManager';
import UserManager from './components/Admin/UserManager';
import SensorAdmin from './components/Admin/SensorAdmin';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import './styles/global.css';

function ProtectedRoute({ children, requireAdmin }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <UserLayout>{children}</UserLayout>;
}

function GuestRoute({ children }) {
  return <GuestLayout>{children}</GuestLayout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Guest routes */}
      <Route path="/" element={
        user ? <Navigate to="/dashboard" /> : <GuestRoute><Dashboard /></GuestRoute>
      } />
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/sensors" element={
        <ProtectedRoute>
          <SensorManager />
        </ProtectedRoute>
      } />

      {/* Admin routes */}
      <Route path="/admin/users" element={
        <ProtectedRoute requireAdmin>
          <UserManager />
        </ProtectedRoute>
      } />
      <Route path="/admin/sensors" element={
        <ProtectedRoute requireAdmin>
          <SensorAdmin />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <ApiInterceptor />
          <Notification />
          <AppRoutes />
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
