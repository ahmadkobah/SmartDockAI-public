import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams(filters).toString();
      const response = await axios.get(`/api/admin/users?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
      setPagination(response.data.pagination);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch users');
      setLoading(false);
      console.error('Fetch users error:', err);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(response.data.roles);
    } catch (err) {
      console.error('Fetch roles error:', err);
    }
  };

  const updateUserStatus = async (userId, isActive, reason) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/users/${userId}/status`, {
        isActive,
        reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers(); // Refresh the list
    } catch (err) {
      setError('Failed to update user status');
      console.error('Update user status error:', err);
    }
  };

  const updateUserRoles = async (userId, roleIds, reason) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/admin/users/${userId}/roles`, {
        roleIds,
        reason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowRoleModal(false);
      setSelectedUser(null);
      fetchUsers(); // Refresh the list
    } catch (err) {
      setError('Failed to update user roles');
      console.error('Update user roles error:', err);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
          </div>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
            Add New User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search users..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                handleFilterChange('sortBy', sortBy);
                handleFilterChange('sortOrder', sortOrder);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="email-asc">Email A-Z</option>
              <option value="email-desc">Email Z-A</option>
              <option value="first_name-asc">Name A-Z</option>
              <option value="first_name-desc">Name Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>Created: {formatDate(user.created_at)}</div>
                      {user.last_login_at && (
                        <div>Last login: {formatDate(user.last_login_at)}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{user.document_count} documents</div>
                      <div>{formatBytes(user.total_storage_used)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit Roles
                    </button>
                    <button
                      onClick={() => updateUserStatus(user.id, !user.is_active, 'Admin action')}
                      className={user.is_active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                disabled={!pagination.hasPrev}
                onClick={() => handleFilterChange('page', pagination.page - 1)}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={!pagination.hasNext}
                onClick={() => handleFilterChange('page', pagination.page + 1)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.totalCount}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    disabled={!pagination.hasPrev}
                    onClick={() => handleFilterChange('page', pagination.page - 1)}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    disabled={!pagination.hasNext}
                    onClick={() => handleFilterChange('page', pagination.page + 1)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Roles for {selectedUser.first_name} {selectedUser.last_name}
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const roleIds = formData.getAll('roles');
                const reason = formData.get('reason');
                updateUserRoles(selectedUser.id, roleIds, reason);
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                    <div className="space-y-2">
                      {roles.map(role => (
                        <label key={role.id} className="flex items-center">
                          <input
                            type="checkbox"
                            name="roles"
                            value={role.id}
                            defaultChecked={selectedUser.roles?.includes(role.name)}
                            className="mr-2"
                          />
                          <span>{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                    <textarea
                      name="reason"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Reason for role change..."
                    />
                  </div>
                </div>
                <div className="flex space-x-3 mt-6">
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  >
                    Update Roles
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedUser(null);
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;