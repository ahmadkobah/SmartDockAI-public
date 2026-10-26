import React, { useState, useEffect } from 'react';
import { adminAPI, apiUtils } from '../../services/apiService';
import { ChartBarIcon, CpuChipIcon, UserGroupIcon, DocumentIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    limit: 10
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const tabs = [
    { id: 'stats', name: 'System Statistics', icon: ChartBarIcon },
    { id: 'health', name: 'System Health', icon: CpuChipIcon },
    { id: 'users', name: 'User Management', icon: UserGroupIcon },
    { id: 'audit', name: 'Audit Logs', icon: ClockIcon },
  ];

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  useEffect(() => {
    if (activeTab === 'stats') {
      loadSystemStats();
    } else if (activeTab === 'health') {
      loadSystemHealth();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab]);

  const loadSystemStats = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSystemStats();
      setStats(response.data.data);
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getSystemHealth();
      setHealth(response.data.data);
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUsers({
        page: pagination.current_page,
        limit: pagination.limit
      });
      setUsers(response.data.data.users || response.data.data || []);
      if (response.data.pagination) {
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async (page = 1) => {
    setLoading(true);
    try {
      const response = await adminAPI.getAuditLogs({
        page,
        limit: pagination.limit
      });
      setAuditLogs(response.data.data.logs || response.data.data || []);
      if (response.data.pagination) {
        setPagination(prev => ({ ...prev, ...response.data.pagination }));
      }
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      if (action === 'activate') {
        await adminAPI.activateUser(userId);
        showMessage('User activated successfully');
      } else if (action === 'deactivate') {
        await adminAPI.deactivateUser(userId);
        showMessage('User deactivated successfully');
      } else if (action === 'delete') {
        if (window.confirm('Are you sure you want to delete this user?')) {
          await adminAPI.deleteUser(userId);
          showMessage('User deleted successfully');
        } else {
          return;
        }
      }
      loadUsers(); // Reload users list
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'active':
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'warning':
      case 'inactive':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'offline':
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Admin Panel
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            System administration, monitoring, and user management
          </p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          messageType === 'error' 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="mr-2 h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-8">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}

      {/* System Statistics */}
      {activeTab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Document Stats */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Documents</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.documents?.total || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.users?.total || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Stats */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CpuChipIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Processed Today</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.processing?.today || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Storage Stats */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Storage Used</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatBytes(stats.storage?.used)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="md:col-span-2 lg:col-span-4 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Document Status</h4>
                <div className="space-y-2">
                  {stats.documents?.by_status && Object.entries(stats.documents.by_status).map(([status, count]) => (
                    <div key={status} className="flex justify-between">
                      <span className="text-sm text-gray-600 capitalize">{status}:</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">User Activity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Active Users:</span>
                    <span className="text-sm font-medium text-gray-900">{stats.users?.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">New This Month:</span>
                    <span className="text-sm font-medium text-gray-900">{stats.users?.newThisMonth || 0}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">System Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Processing Time:</span>
                    <span className="text-sm font-medium text-gray-900">{stats.performance?.avgProcessingTime || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate:</span>
                    <span className="text-sm font-medium text-gray-900">{stats.performance?.successRate || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Health */}
      {activeTab === 'health' && health && (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">System Status</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.overall_status)}`}>
                {health.overall_status || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Service Health */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Service Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {health.services && Object.entries(health.services).map(([service, status]) => (
                <div key={service} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {service.replace(/[-_]/g, ' ')}
                    </h4>
                    {status.response_time && (
                      <p className="text-xs text-gray-500">
                        Response: {status.response_time}ms
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.status || status)}`}>
                    {typeof status === 'object' ? status.status : status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System Resources */}
          {health.resources && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">System Resources</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {health.resources.memory && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Memory Usage</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Used:</span>
                        <span>{formatBytes(health.resources.memory.used)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span>{formatBytes(health.resources.memory.total)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(health.resources.memory.used / health.resources.memory.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {health.resources.cpu && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">CPU Usage</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Usage:</span>
                        <span>{health.resources.cpu.usage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${health.resources.cpu.usage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {health.resources.disk && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Disk Usage</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Used:</span>
                        <span>{formatBytes(health.resources.disk.used)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Free:</span>
                        <span>{formatBytes(health.resources.disk.free)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-600 h-2 rounded-full"
                          style={{ width: `${(health.resources.disk.used / (health.resources.disk.used + health.resources.disk.free)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Management */}
      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">User Management</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.username || user.name || `User ${user.id}`}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {user.role || 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status || 'active')}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt ? formatDate(user.createdAt) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.status !== 'active' && (
                        <button
                          onClick={() => handleUserAction(user.id, 'activate')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Activate
                        </button>
                      )}
                      {user.status === 'active' && (
                        <button
                          onClick={() => handleUserAction(user.id, 'deactivate')}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleUserAction(user.id, 'delete')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {pagination.current_page} of {pagination.total_pages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => loadUsers(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadUsers(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log, index) => (
                  <tr key={log.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.timestamp || log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user || log.username || 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.resource || log.target || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {pagination.current_page} of {pagination.total_pages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => loadAuditLogs(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadAuditLogs(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;