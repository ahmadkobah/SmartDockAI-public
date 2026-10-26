import React, { useState, useEffect } from 'react';
import { documentsAPI, apiUtils } from '../../services/apiService';
import { 
  DocumentTextIcon, 
  EyeIcon, 
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

const DocumentList = ({ onDocumentSelect, refreshTrigger }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    status: '',
    search: '',
  });
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
  ];

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      );
      
      const response = await documentsAPI.list(params);
      setDocuments(response.data.data.documents || []);
      setPagination(response.data.data.pagination || {});
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      console.error('Error fetching documents:', errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [filters, refreshTrigger]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await documentsAPI.delete(documentId);
      fetchDocuments(); // Refresh the list
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      alert(`Error deleting document: ${errorInfo.message}`);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusClasses[status] || 'bg-gray-100 text-gray-800'
      }`}>
        {status || 'Unknown'}
      </span>
    );
  };

  const renderPagination = () => {
    if (!pagination.totalPages || pagination.totalPages <= 1) return null;

    const pages = [];
    const currentPage = pagination.currentPage || 1;
    const totalPages = pagination.totalPages;

    // Add previous button
    pages.push(
      <button
        key="prev"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
    );

    // Add page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
              i === currentPage
                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {i}
          </button>
        );
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        pages.push(
          <span key={i} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
            ...
          </span>
        );
      }
    }

    // Add next button
    pages.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    );

    return (
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-700">
          Showing {pagination.startIndex || 1} to {pagination.endIndex || documents.length} of{' '}
          {pagination.totalDocuments || documents.length} results
        </div>
        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
          {pages}
        </nav>
      </div>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Documents</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search documents..."
                  className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Per Page
              </label>
              <select
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Document List */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No documents found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((document) => (
              <div
                key={document.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {document.filename || document.originalName || 'Unnamed Document'}
                        </h4>
                        <div className="flex items-center mt-1 text-xs text-gray-500 space-x-4">
                          <span className="flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-1" />
                            {formatDate(document.createdAt)}
                          </span>
                          {document.fileSize && (
                            <span>{Math.round(document.fileSize / 1024)} KB</span>
                          )}
                          {document.mimeType && (
                            <span>{document.mimeType}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {document.tags && document.tags.length > 0 && (
                      <div className="mt-2 flex items-center">
                        <TagIcon className="h-3 w-3 text-gray-400 mr-1" />
                        <div className="flex flex-wrap gap-1">
                          {document.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {getStatusBadge(document.status)}
                    
                    <button
                      onClick={() => onDocumentSelect?.(document)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(document.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                      title="Delete Document"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {renderPagination()}
      </div>
    </div>
  );
};

export default DocumentList;