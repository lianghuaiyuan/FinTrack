import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Assets from './pages/Assets';
import Deposits from './pages/Deposits';
import Transactions from './pages/Transactions';
import DataImportExport from './pages/DataImportExport';
import ReportExport from './pages/ReportExport';
import Settings from './pages/Settings';
import Guide from './pages/Guide';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/accounts" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
      <Route path="/deposits" element={<ProtectedRoute><Deposits /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/import-export" element={<ProtectedRoute><DataImportExport /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportExport /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/guide" element={<ProtectedRoute><Guide /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
