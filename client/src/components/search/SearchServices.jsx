import React, { useState } from 'react';
import { searchAPI, apiUtils } from '../../services/apiService';
import { MagnifyingGlassIcon, FunnelIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const SearchServices = () => {
  const [activeTab, setActiveTab] = useState('simple');
  const [searchQuery, setSearchQuery] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState({
    query: '',
    filters: {
      documentType: '',
      dateRange: {
        start: '',
        end: '',
      },
      tags: [],
      confidence: { min: 0.5 },
    },
    sort: {
      field: 'relevance',
      order: 'desc',
    },
    page: 1,
    limit: 10,
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const tabs = [
    { id: 'simple', name: 'Simple Search', icon: MagnifyingGlassIcon },
    { id: 'advanced', name: 'Advanced Search', icon: FunnelIcon },
  ];

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSimpleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      showMessage('Please enter a search query', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await searchAPI.search({
        q: searchQuery,
        page: 1,
        limit: 10,
      });
      
      setResults(response.data.data);
      showMessage('Search completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancedSearch = async (e) => {
    e.preventDefault();
    
    if (!advancedFilters.query.trim()) {
      showMessage('Please enter a search query', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await searchAPI.advancedSearch(advancedFilters);
      setResults(response.data.data);
      showMessage('Advanced search completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateAdvancedFilter = (path, value) => {
    setAdvancedFilters(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const addTag = (tag) => {
    if (tag && !advancedFilters.filters.tags.includes(tag)) {
      updateAdvancedFilter('filters.tags', [...advancedFilters.filters.tags, tag]);
    }
  };

  const removeTag = (index) => {
    const newTags = [...advancedFilters.filters.tags];
    newTags.splice(index, 1);
    updateAdvancedFilter('filters.tags', newTags);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Document Search
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Search through your documents using powerful search capabilities
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {activeTab === 'simple' ? 'Simple Search' : 'Advanced Search'}
          </h3>

          {activeTab === 'simple' ? (
            <form onSubmit={handleSimpleSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Query
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter your search terms..."
                    className="pl-10 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdvancedSearch} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Query
                </label>
                <input
                  type="text"
                  value={advancedFilters.query}
                  onChange={(e) => updateAdvancedFilter('query', e.target.value)}
                  placeholder="Enter your search terms..."
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Type
                </label>
                <select
                  value={advancedFilters.filters.documentType}
                  onChange={(e) => updateAdvancedFilter('filters.documentType', e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All Types</option>
                  <option value="invoice">Invoice</option>
                  <option value="contract">Contract</option>
                  <option value="report">Report</option>
                  <option value="letter">Letter</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={advancedFilters.filters.dateRange.start}
                    onChange={(e) => updateAdvancedFilter('filters.dateRange.start', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={advancedFilters.filters.dateRange.end}
                    onChange={(e) => updateAdvancedFilter('filters.dateRange.end', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {advancedFilters.filters.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add tag and press Enter"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Confidence: {advancedFilters.filters.confidence.min}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={advancedFilters.filters.confidence.min}
                  onChange={(e) => updateAdvancedFilter('filters.confidence.min', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={advancedFilters.sort.field}
                    onChange={(e) => updateAdvancedFilter('sort.field', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order
                  </label>
                  <select
                    value={advancedFilters.sort.order}
                    onChange={(e) => updateAdvancedFilter('sort.order', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    Advanced Search
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Results */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Search Results</h3>
          
          {results ? (
            <div className="space-y-4">
              {results.documents && results.documents.length > 0 ? (
                <>
                  <div className="text-sm text-gray-500 mb-4">
                    Found {results.totalResults || results.documents.length} results
                    {results.searchTime && ` in ${results.searchTime}ms`}
                  </div>
                  
                  <div className="space-y-3">
                    {results.documents.map((doc, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3 mt-1" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900">
                              {doc.title || doc.filename || doc.originalName || 'Unnamed Document'}
                            </h4>
                            
                            {doc.snippet && (
                              <p className="text-sm text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: doc.snippet }} />
                            )}
                            
                            <div className="flex items-center mt-2 text-xs text-gray-500 space-x-4">
                              {doc.createdAt && (
                                <span>{formatDate(doc.createdAt)}</span>
                              )}
                              {doc.score && (
                                <span>Relevance: {Math.round(doc.score * 100)}%</span>
                              )}
                              {doc.documentType && (
                                <span className="bg-gray-100 px-2 py-1 rounded">{doc.documentType}</span>
                              )}
                            </div>
                            
                            {doc.tags && doc.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {doc.tags.map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No documents found matching your search criteria.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Enter a search query to find documents.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchServices;