import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SystemMonitoring = () => {
  const [systemHealth, setSystemHealth] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [servicesHealth, setServicesHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchAllData();
    
    const interval = autoRefresh ? setInterval(fetchAllData, 30000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timeRange, autoRefresh]);

  const fetchAllData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [healthResponse, performanceResponse, servicesResponse] = await Promise.allSettled([
        axios.get('/api/admin/health', { headers }),
        axios.get(`/api/admin/performance?timeRange=${timeRange}`, { headers }),
        axios.get('/api/admin/services/health', { headers })
      ]);

      if (healthResponse.status === 'fulfilled') {
        setSystemHealth(healthResponse.value.data);
      }
      
      if (performanceResponse.status === 'fulfilled') {
        setPerformanceMetrics(performanceResponse.value.data);
      }
      
      if (servicesResponse.status === 'fulfilled') {
        setServicesHealth(servicesResponse.value.data);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch monitoring data');
      setLoading(false);
      console.error('Monitoring data error:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatResponseTime = (time) => {
    if (time < 1000) return `${Math.round(time)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
            <p className="text-gray-600 mt-1">Real-time system health and performance monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="autoRefresh" className="text-sm text-gray-600">Auto-refresh</label>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
            </select>
            <button
              onClick={fetchAllData}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Services Health */}
      {servicesHealth && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Services Health</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(servicesHealth.overallStatus)}`}>
              Overall: {servicesHealth.overallStatus?.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicesHealth.services?.map((service, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold capitalize">{service.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Response Time:</span>
                    <span className={service.responseTime > 1000 ? 'text-red-600' : 'text-green-600'}>
                      {formatResponseTime(service.responseTime)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Check:</span>
                    <span>{new Date(service.timestamp).toLocaleTimeString()}</span>
                  </div>
                  
                  {service.error && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                      Error: {service.error}
                    </div>
                  )}
                  
                  {service.data && service.status === 'healthy' && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-xs">
                      <div className="font-medium text-green-800">Service Details:</div>
                      {service.data.version && <div>Version: {service.data.version}</div>}
                      {service.data.status && <div>Status: {service.data.status}</div>}
                      {service.data.uptime && <div>Uptime: {formatUptime(service.data.uptime)}</div>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Performance */}
      {performanceMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Response Time Metrics */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Response Time Metrics</h3>
            
            {performanceMetrics.metrics?.responseTime?.length > 0 ? (
              <div className="space-y-4">
                {performanceMetrics.metrics.responseTime.map((metric, index) => (
                  <div key={index} className="border-b pb-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{metric.action.replace('_', ' ')}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(metric.minute).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>Requests: {metric.request_count}</span>
                      <span className={`${metric.avg_response_time > 2 ? 'text-red-600' : 'text-green-600'}`}>
                        Avg: {metric.avg_response_time ? `${metric.avg_response_time.toFixed(2)}s` : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No response time data available for the selected time range
              </div>
            )}
          </div>

          {/* System Resources */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">System Resources</h3>
            
            {performanceMetrics.metrics?.system && (
              <div className="space-y-4">
                <div className="border rounded p-3">
                  <h4 className="font-medium mb-2">Memory Usage</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>RSS:</span>
                      <span>{formatBytes(performanceMetrics.metrics.system.memory?.rss || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heap Used:</span>
                      <span>{formatBytes(performanceMetrics.metrics.system.memory?.heapUsed || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Heap Total:</span>
                      <span>{formatBytes(performanceMetrics.metrics.system.memory?.heapTotal || 0)}</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded p-3">
                  <h4 className="font-medium mb-2">System Info</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span>{formatUptime(performanceMetrics.metrics.system.uptime || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform:</span>
                      <span>{performanceMetrics.metrics.system.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Node Version:</span>
                      <span>{performanceMetrics.metrics.system.nodeVersion}</span>
                    </div>
                  </div>
                </div>

                {performanceMetrics.metrics.database && (
                  <div className="border rounded p-3">
                    <h4 className="font-medium mb-2">Database</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Active Connections:</span>
                        <span className={performanceMetrics.metrics.database.active_connections > 50 ? 'text-red-600' : 'text-green-600'}>
                          {performanceMetrics.metrics.database.active_connections}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Connections:</span>
                        <span>{performanceMetrics.metrics.database.total_connections}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Health Details */}
      {systemHealth && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">System Health Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Database Health */}
            <div className="border rounded p-4">
              <h4 className="font-medium mb-3 flex items-center">
                Database
                <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(systemHealth.services?.database?.status)}`}>
                  {systemHealth.services?.database?.status || 'Unknown'}
                </span>
              </h4>
              {systemHealth.services?.database && (
                <div className="text-sm space-y-1">
                  <div>Connection: {systemHealth.services.database.connection ? 'Connected' : 'Disconnected'}</div>
                  {systemHealth.services.database.responseTime && (
                    <div>Response Time: {systemHealth.services.database.responseTime}ms</div>
                  )}
                </div>
              )}
            </div>

            {/* Storage Health */}
            <div className="border rounded p-4">
              <h4 className="font-medium mb-3 flex items-center">
                Storage
                <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(systemHealth.storage?.status)}`}>
                  {systemHealth.storage?.status || 'Unknown'}
                </span>
              </h4>
              {systemHealth.storage && (
                <div className="text-sm space-y-1">
                  <div>Total Documents: {systemHealth.storage.totalDocuments || 0}</div>
                  <div>Total Size: {formatBytes(systemHealth.storage.totalSize || 0)}</div>
                </div>
              )}
            </div>

            {/* Queue Health */}
            <div className="border rounded p-4">
              <h4 className="font-medium mb-3 flex items-center">
                Queues
                <span className={`ml-2 px-2 py-1 rounded text-xs ${getStatusColor(systemHealth.queues?.status)}`}>
                  {systemHealth.queues?.status || 'Unknown'}
                </span>
              </h4>
              {systemHealth.queues && (
                <div className="text-sm space-y-1">
                  <div>Active Jobs: {systemHealth.queues.activeJobs || 0}</div>
                  <div>Waiting Jobs: {systemHealth.queues.waitingJobs || 0}</div>
                  <div>Failed Jobs: {systemHealth.queues.failedJobs || 0}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Real-time Alerts */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">System Alerts</h3>
        
        <div className="space-y-3">
          {/* Generate alerts based on current data */}
          {servicesHealth?.services?.some(s => s.status === 'unhealthy') && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="text-red-800 font-medium">Service Health Alert</div>
              <div className="text-red-600 text-sm">
                One or more services are unhealthy. Check the services section for details.
              </div>
            </div>
          )}
          
          {performanceMetrics?.metrics?.database?.active_connections > 50 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-yellow-800 font-medium">High Database Connections</div>
              <div className="text-yellow-600 text-sm">
                Database has {performanceMetrics.metrics.database.active_connections} active connections.
              </div>
            </div>
          )}
          
          {performanceMetrics?.metrics?.system?.memory?.heapUsed > 1000000000 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <div className="text-yellow-800 font-medium">High Memory Usage</div>
              <div className="text-yellow-600 text-sm">
                Application is using {formatBytes(performanceMetrics.metrics.system.memory.heapUsed)} of heap memory.
              </div>
            </div>
          )}
          
          {/* Default message when no alerts */}
          {!servicesHealth?.services?.some(s => s.status === 'unhealthy') && 
           !(performanceMetrics?.metrics?.database?.active_connections > 50) &&
           !(performanceMetrics?.metrics?.system?.memory?.heapUsed > 1000000000) && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-green-800 font-medium">All Systems Operational</div>
              <div className="text-green-600 text-sm">
                No alerts or issues detected. All services are running normally.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemMonitoring;