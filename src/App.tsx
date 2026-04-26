import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import KetikApp from './pages/ketik';
import PDKTApp from './pages/pdkt';
import TelefunApp from './pages/telefun';
import DashboardMonitoring from './pages/DashboardMonitoring';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/monitoring" element={<DashboardMonitoring />} />
            <Route path="/ketik/*" element={<KetikApp />} />
            <Route path="/pdkt/*" element={<PDKTApp />} />
            <Route path="/telefun/*" element={<TelefunApp />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
