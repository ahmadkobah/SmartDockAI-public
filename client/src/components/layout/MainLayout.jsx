import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Documents', href: '/documents', icon: DocumentTextIcon },
    { name: 'Search', href: '/search', icon: MagnifyingGlassIcon },
    { name: 'OCR Services', href: '/ocr', icon: EyeIcon },
    { name: 'ICR Services', href: '/icr', icon: PencilIcon },
    { name: 'Document Intelligence', href: '/intelligence', icon: CpuChipIcon },
    { name: 'NLP Services', href: '/nlp', icon: ChatBubbleLeftRightIcon },
  ];

  // Add admin navigation if user has admin role
  if (hasRole('admin')) {
    navigation.push({ name: 'Admin', href: '/admin', icon: Cog6ToothIcon });
  }

  const userNavigation = [
    { name: 'Profile', href: '/profile', icon: UserIcon },
    { name: 'Sign out', onClick: handleLogout, icon: ArrowRightOnRectangleIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">SmartDockAI</h1>
            <button onClick={() => setSidebarOpen(false)} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <nav className="mt-5 px-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className={`mr-3 flex-shrink-0 h-6 w-6 ${
                    isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 flex-shrink-0 items-center px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">SmartDockAI</h1>
          </div>
          
          <div className="flex flex-1 flex-col overflow-y-auto">
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className={`mr-3 flex-shrink-0 h-6 w-6 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white shadow">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              {/* Search could go here if needed */}
            </div>
            
            <div className="ml-4 flex items-center md:ml-6">
              {/* User menu */}
              <div className="relative ml-3">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-700">Welcome, {user?.firstName || user?.username}</span>
                  
                  {userNavigation.map((item) => (
                    <button
                      key={item.name}
                      onClick={item.onClick || (() => navigate(item.href))}
                      className="flex items-center text-sm text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100"
                    >
                      <item.icon className="h-5 w-5 mr-1" />
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;