import React, { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import UserManagement from './UserManagement';
import SystemMonitoring from './SystemMonitoring';

const AdminLayout = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  const navigation = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: '📊',
      description: 'System overview and analytics'
    },
    {
      id: 'users',
      name: 'User Management',
      icon: '👥',
      description: 'Manage users, roles, and permissions'
    },
    {
      id: 'monitoring',
      name: 'System Monitoring',
      icon: '🔍',
      description: 'Real-time system health and performance'
    },
    {
      id: 'documents',
      name: 'Document Management',
      icon: '📄',
      description: 'Manage documents and storage'
    },
    {
      id: 'services',
      name: 'Service Configuration',
      icon: '⚙️',
      description: 'Configure OCR, NLP, and other services'
    },
    {
      id: 'audit',
      name: 'Audit Logs',
      icon: '📝',
      description: 'View system audit trails'
    },
    {
      id: 'settings',
      name: 'System Settings',
      icon: '🔧',
      description: 'Configure system parameters'
    }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'monitoring':
        return <SystemMonitoring />;
      case 'documents':
        return <DocumentManagementPlaceholder />;
      case 'services':
        return <ServiceConfigurationPlaceholder />;
      case 'audit':
        return <AuditLogsPlaceholder />;
      case 'settings':
        return <SystemSettingsPlaceholder />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">SmartDockAI Admin</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, Admin
              </div>
              <button className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-white shadow-sm h-screen sticky top-0">
          <div className="p-4">
            <nav className="space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    activeSection === item.id
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="text-lg mr-3">{item.icon}</span>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="border-t mt-4 pt-4 px-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">System Status:</span>
                <span className="text-green-600 font-medium">Healthy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Users:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Documents:</span>
                <span className="font-medium">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Queue Jobs:</span>
                <span className="font-medium">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

// Placeholder components for sections not yet implemented
const DocumentManagementPlaceholder = () => (
  <div className="bg-white shadow rounded-lg p-8 text-center">
    <div className="text-6xl mb-4">📄</div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Document Management</h2>
    <p className="text-gray-600 mb-6">Comprehensive document management interface</p>
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="font-semibold mb-4">Features to be implemented:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div>
          <h4 className="font-medium mb-2">Document Overview</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Total documents and storage usage</li>
            <li>• Document type distribution</li>
            <li>• Processing status overview</li>
            <li>• Failed processing reports</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-2">Management Actions</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Bulk document operations</li>
            <li>• Reprocess failed documents</li>
            <li>• Storage cleanup utilities</li>
            <li>• Export document metadata</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const ServiceConfigurationPlaceholder = () => (
  <div className="bg-white shadow rounded-lg p-8 text-center">
    <div className="text-6xl mb-4">⚙️</div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Service Configuration</h2>
    <p className="text-gray-600 mb-6">Configure and manage microservices</p>
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="font-semibold mb-4">Configuration Options:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div>
          <h4 className="font-medium mb-2">OCR Service</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Language model settings</li>
            <li>• Confidence thresholds</li>
            <li>• Processing timeouts</li>
            <li>• Training mode toggle</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-2">Document Intelligence</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Classification models</li>
            <li>• Entity extraction rules</li>
            <li>• Template management</li>
            <li>• Routing configurations</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const AuditLogsPlaceholder = () => (
  <div className="bg-white shadow rounded-lg p-8 text-center">
    <div className="text-6xl mb-4">📝</div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">Audit Logs</h2>
    <p className="text-gray-600 mb-6">System audit trail and security logs</p>
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="font-semibold mb-4">Audit Features:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div>
          <h4 className="font-medium mb-2">Activity Tracking</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• User login/logout events</li>
            <li>• Document upload/download</li>
            <li>• Administrative actions</li>
            <li>• System configuration changes</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-2">Security Monitoring</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Failed authentication attempts</li>
            <li>• Permission violations</li>
            <li>• Suspicious activity detection</li>
            <li>• Compliance reporting</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

const SystemSettingsPlaceholder = () => (
  <div className="bg-white shadow rounded-lg p-8 text-center">
    <div className="text-6xl mb-4">🔧</div>
    <h2 className="text-2xl font-bold text-gray-900 mb-4">System Settings</h2>
    <p className="text-gray-600 mb-6">Global system configuration and parameters</p>
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="font-semibold mb-4">Settings Categories:</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div>
          <h4 className="font-medium mb-2">Application Settings</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• File upload limits</li>
            <li>• Session timeouts</li>
            <li>• Default user roles</li>
            <li>• Email notifications</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-2">Performance Settings</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Queue processing limits</li>
            <li>• Caching configurations</li>
            <li>• Database connection pools</li>
            <li>• Resource allocation</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

export default AdminLayout;