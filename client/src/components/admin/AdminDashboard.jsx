import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [servicesHealth, setServicesHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
    fetchServicesHealth();
    
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchServicesHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/admin/analytics/dashboard?timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    }
  };

  const fetchServicesHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/services/health', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServicesHealth(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch services health');
      setLoading(false);
      console.error('Services health error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">SmartDockAI System Management</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            <button
              onClick={() => {
                fetchDashboardData();
                fetchServicesHealth();
              }}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'services', name: 'Services' },
              { id: 'analytics', name: 'Analytics' },
              { id: 'users', name: 'Users' },
              { id: 'system', name: 'System' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && dashboardData && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900">Total Documents</h3>
                  <p className="text-3xl font-bold text-blue-600">{dashboardData.summary.totalDocuments}</p>
                  <p className="text-sm text-blue-700 mt-1">In {timeRange}</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900">OCR Success Rate</h3>
                  <p className="text-3xl font-bold text-green-600">{dashboardData.summary.ocrSuccessRate}%</p>
                  <p className="text-sm text-green-700 mt-1">{dashboardData.summary.totalOcrProcessed} processed</p>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-900">Error Rate</h3>
                  <p className="text-3xl font-bold text-yellow-600">{dashboardData.summary.errorRate}%</p>
                  <p className="text-sm text-yellow-700 mt-1">{dashboardData.summary.totalErrors} errors</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900">Total Requests</h3>
                  <p className="text-3xl font-bold text-purple-600">{dashboardData.summary.totalRequests}</p>
                  <p className="text-sm text-purple-700 mt-1">In {timeRange}</p>
                </div>
              </div>

              {/* Processing Trends Chart */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Document Processing Trends</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  {/* Placeholder for chart - you'd integrate with a charting library like Chart.js or recharts */}
                  <p className="text-gray-500">Chart: {dashboardData.charts.processingTrends.length} data points</p>
                </div>
              </div>

              {/* Document Types */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Top Document Types</h3>
                <div className="space-y-3">
                  {dashboardData.charts.documentTypes.slice(0, 5).map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="font-medium">{type.document_type || 'Unknown'}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">{type.count} docs</span>
                        <span className="text-sm text-blue-600">
                          {type.avg_confidence ? `${(type.avg_confidence * 100).toFixed(1)}% confidence` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && servicesHealth && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Service Health Status</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(servicesHealth.overallStatus)}`}>
                  {servicesHealth.overallStatus.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {servicesHealth.services.map((service, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-lg capitalize">{service.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                        {service.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">URL:</span> {service.url}</p>
                      <p><span className="text-gray-600">Response Time:</span> {service.responseTime}ms</p>
                      <p><span className="text-gray-600">Last Check:</span> {new Date(service.timestamp).toLocaleTimeString()}</p>
                      {service.error && (
                        <p className="text-red-600"><span className="text-gray-600">Error:</span> {service.error}</p>
                      )}
                      {service.data && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                          <pre>{JSON.stringify(service.data, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && dashboardData && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Detailed Analytics</h3>
              
              {/* User Activity */}
              <div className="bg-white border rounded-lg p-6">
                <h4 className="font-semibold mb-4">User Activity Trends</h4>
                <div className="h-48 flex items-center justify-center bg-gray-50 rounded">
                  <p className="text-gray-500">User Activity Chart: {dashboardData.charts.userActivity.length} data points</p>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="bg-white border rounded-lg p-6">
                <h4 className="font-semibold mb-4">Top Storage Users</h4>
                <div className="space-y-3">
                  {dashboardData.charts.storageByUser.slice(0, 10).map((user, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{user.first_name} {user.last_name}</span>
                        <span className="text-gray-500 ml-2">({user.email})</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatBytes(user.total_storage)}</div>
                        <div className="text-xs text-gray-500">{user.document_count} documents</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">User Management</h3>
                <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
                  Add User
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-gray-600">User management interface would go here</p>
                <p className="text-sm text-gray-500 mt-2">Features: User list, role assignment, status management</p>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">System Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* System Stats */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="font-semibold mb-4">System Statistics</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Uptime:</span>
                      <span>{formatDuration(process?.uptime || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Node Version:</span>
                      <span>{process?.version || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform:</span>
                      <span>{process?.platform || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Environment:</span>
                      <span>{process?.env?.NODE_ENV || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="bg-white border rounded-lg p-6">
                  <h4 className="font-semibold mb-4">Memory Usage</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">RSS:</span>
                      <span>{formatBytes(process?.memoryUsage?.()?.rss || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heap Used:</span>
                      <span>{formatBytes(process?.memoryUsage?.()?.heapUsed || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heap Total:</span>
                      <span>{formatBytes(process?.memoryUsage?.()?.heapTotal || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">External:</span>
                      <span>{formatBytes(process?.memoryUsage?.()?.external || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="bg-white border rounded-lg p-6">
                <h4 className="font-semibold mb-4">System Configuration</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-gray-600">Configuration management interface would go here</p>
                  <p className="text-sm text-gray-500 mt-2">Features: Service URLs, feature flags, limits configuration</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;