import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // Check API health
    fetch('/health')
      .then(res => res.json())
      .then(setHealth)
      .catch(console.error);
  }, []);

  const features = [
    {
      name: 'Document Management',
      description: 'Upload, process, and manage your documents',
      href: '/documents',
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Search Documents',
      description: 'Find documents using powerful search capabilities',
      href: '/search',
      icon: MagnifyingGlassIcon,
      color: 'bg-green-500',
    },
    {
      name: 'OCR Services',
      description: 'Extract text from images and PDFs',
      href: '/ocr',
      icon: EyeIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'ICR Services',
      description: 'Intelligent Character Recognition for handwriting',
      href: '/icr',
      icon: PencilIcon,
      color: 'bg-indigo-500',
    },
    {
      name: 'Document Intelligence',
      description: 'AI-powered document analysis and classification',
      href: '/intelligence',
      icon: CpuChipIcon,
      color: 'bg-orange-500',
    },
    {
      name: 'NLP Services',
      description: 'Natural language processing and analysis',
      href: '/nlp',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-pink-500',
    },
  ];

  // Add admin feature if user has admin role
  if (hasRole('admin')) {
    features.push({
      name: 'Admin Panel',
      description: 'System administration and management',
      href: '/admin',
      icon: Cog6ToothIcon,
      color: 'bg-red-500',
    });
  }

  return (
    <div>
      {/* Welcome Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Welcome back, {user?.firstName || user?.username}!
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Access all SmartDockAI features from your dashboard
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      System Status
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {health ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        <span className="text-red-600">Checking...</span>
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EyeIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Services Available
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {features.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CpuChipIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      User Role
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {user?.roles?.join(', ') || 'User'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="mt-8">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
          Available Features
        </h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link
              key={feature.name}
              to={feature.href}
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div>
                <span className={`rounded-lg inline-flex p-3 ring-4 ring-white ${feature.color}`}>
                  <feature.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  {feature.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {feature.description}
                </p>
              </div>
              <span
                className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                aria-hidden="true"
              >
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="m11.293 17.293 1.414 1.414L19.414 12l-6.707-6.707-1.414 1.414L15.586 11H5v2h10.586l-4.293 4.293z" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* API Health Details */}
      {health && (
        <div className="mt-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                System Health
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Current system status and information</p>
              </div>
              <div className="mt-5">
                <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto">
                  {JSON.stringify(health, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;