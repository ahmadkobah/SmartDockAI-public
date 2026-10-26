import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import Profile from './components/auth/Profile';
import DocumentManagement from './components/documents/DocumentManagement';
import DocumentDetails from './components/documents/DocumentDetails';
import OCRServices from './components/ocr/OCRServices';
import ICRServices from './components/icr/ICRServices';
import SearchServices from './components/search/SearchServices';
import NLPServices from './components/nlp/NLPServices';
import DocumentIntelligence from './components/intelligence/DocumentIntelligence';
import AdminPanel from './components/admin/AdminPanel';

// Protected Route component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />

            {/* Protected Routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                      {/* Dashboard */}
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      {/* Profile */}
                      <Route path="/profile" element={<Profile />} />
                      
                      {/* Document Management */}
                      <Route path="/documents" element={<DocumentManagement />} />
                      <Route path="/documents/:id" element={<DocumentDetails />} />
                      
                      {/* AI Services */}
                      <Route path="/ocr" element={<OCRServices />} />
                      <Route path="/icr" element={<ICRServices />} />
                      <Route path="/intelligence" element={<DocumentIntelligence />} />
                      <Route path="/nlp" element={<NLPServices />} />
                      <Route path="/search" element={<SearchServices />} />
                      
                      {/* Admin Routes */}
                      <Route 
                        path="/admin" 
                        element={
                          <ProtectedRoute requiredRole="admin">
                            <AdminPanel />
                          </ProtectedRoute>
                        } 
                      />
                      
                      {/* Default redirects */}
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;