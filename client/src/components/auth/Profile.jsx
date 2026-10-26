import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    username: user?.username || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const result = await updateProfile(profileData);
    
    if (result.success) {
      showMessage('Profile updated successfully');
    } else {
      showMessage(result.error || 'Failed to update profile', 'error');
    }
    
    setIsLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }
    
    setIsLoading(true);
    
    const result = await changePassword({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
    
    if (result.success) {
      showMessage('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      showMessage(result.error || 'Failed to change password', 'error');
    }
    
    setIsLoading(false);
  };

  const tabs = [
    { id: 'profile', name: 'Profile Information', icon: UserIcon },
    { id: 'password', name: 'Change Password', icon: KeyIcon },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-6xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between lg:border-t lg:border-gray-200">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:leading-9 sm:truncate">
                    {user?.firstName} {user?.lastName}
                  </h1>
                  <div className="flex items-center">
                    <EnvelopeIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="hidden sm:block">
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
      </div>

      <div className="mt-6">
        {message && (
          <div className={`mb-4 p-4 rounded-md ${
            messageType === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Profile Information
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Update your personal information.</p>
              </div>
              <form onSubmit={handleProfileSubmit} className="mt-5">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      id="firstName"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      id="lastName"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      value={profileData.username}
                      disabled
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
                    />
                    <p className="mt-1 text-sm text-gray-500">Username cannot be changed.</p>
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Change Password
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Ensure your account stays secure by using a strong password.</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="mt-5">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                      Current password
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      id="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                      New password
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      id="newPassword"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;