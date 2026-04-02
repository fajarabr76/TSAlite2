import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import KetikApp from './pages/ketik';
import PDKTApp from './pages/pdkt';
import TelefunApp from './pages/telefun';

import LandingPage from './pages/LandingPage';
import Register from './pages/Register';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['trainer', 'agent']}><Dashboard /></ProtectedRoute>} />
            <Route path="/ketik/*" element={<ProtectedRoute allowedRoles={['agent', 'trainer']}><KetikApp /></ProtectedRoute>} />
            <Route path="/pdkt/*" element={<ProtectedRoute allowedRoles={['agent', 'trainer']}><PDKTApp /></ProtectedRoute>} />
            <Route path="/telefun/*" element={<ProtectedRoute allowedRoles={['agent', 'trainer']}><TelefunApp /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
