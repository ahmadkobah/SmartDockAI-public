import React, { useState, useEffect } from 'react';
import { ocrAPI, documentsAPI, apiUtils } from '../../services/apiService';
import { EyeIcon, DocumentTextIcon, PlayIcon } from '@heroicons/react/24/outline';

const OCRServices = () => {
  const [activeTab, setActiveTab] = useState('extract');
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [languages, setLanguages] = useState([]);
  const [extractOptions, setExtractOptions] = useState({
    language: 'en',
    confidence: true,
    coordinates: true,
  });
  const [batchOptions, setBatchOptions] = useState({
    documentIds: [],
    language: 'en',
    priority: 'normal',
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const tabs = [
    { id: 'extract', name: 'Text Extraction', icon: EyeIcon },
    { id: 'batch', name: 'Batch Processing', icon: DocumentTextIcon },
  ];

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  useEffect(() => {
    loadDocuments();
    loadLanguages();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.list({ limit: 100 });
      setDocuments(response.data.data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const loadLanguages = async () => {
    try {
      const response = await ocrAPI.getSupportedLanguages();
      setLanguages(response.data.data || []);
    } catch (error) {
      console.error('Error loading languages:', error);
      // Fallback languages
      setLanguages([
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
      ]);
    }
  };

  const handleExtractText = async (e) => {
    e.preventDefault();
    
    if (!selectedDocument) {
      showMessage('Please select a document', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await ocrAPI.extractText({
        documentId: parseInt(selectedDocument),
        language: extractOptions.language,
        options: {
          confidence: extractOptions.confidence,
          coordinates: extractOptions.coordinates,
        },
      });
      
      setResults(response.data.data);
      showMessage('Text extraction completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchProcess = async (e) => {
    e.preventDefault();
    
    if (batchOptions.documentIds.length === 0) {
      showMessage('Please select at least one document', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await ocrAPI.batchProcess({
        documentIds: batchOptions.documentIds.map(id => parseInt(id)),
        language: batchOptions.language,
        priority: batchOptions.priority,
      });
      
      setResults(response.data.data);
      showMessage('Batch processing started successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelection = (documentId, checked) => {
    setBatchOptions(prev => ({
      ...prev,
      documentIds: checked
        ? [...prev.documentIds, documentId]
        : prev.documentIds.filter(id => id !== documentId)
    }));
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            OCR Services
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Extract text from images and documents using optical character recognition
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
        {/* Input Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {activeTab === 'extract' ? 'Text Extraction' : 'Batch Processing'}
          </h3>

          {activeTab === 'extract' ? (
            <form onSubmit={handleExtractText} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Document
                </label>
                <select
                  value={selectedDocument}
                  onChange={(e) => setSelectedDocument(e.target.value)}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Choose a document...</option>
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.filename || doc.originalName || `Document ${doc.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={extractOptions.language}
                  onChange={(e) => setExtractOptions(prev => ({ ...prev, language: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    id="confidence"
                    type="checkbox"
                    checked={extractOptions.confidence}
                    onChange={(e) => setExtractOptions(prev => ({ ...prev, confidence: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="confidence" className="ml-2 block text-sm text-gray-900">
                    Include confidence scores
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    id="coordinates"
                    type="checkbox"
                    checked={extractOptions.coordinates}
                    onChange={(e) => setExtractOptions(prev => ({ ...prev, coordinates: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="coordinates" className="ml-2 block text-sm text-gray-900">
                    Include text coordinates
                  </label>
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
                    Extracting...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Extract Text
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleBatchProcess} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Documents
                </label>
                <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-md p-3 space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center">
                      <input
                        id={`doc-${doc.id}`}
                        type="checkbox"
                        checked={batchOptions.documentIds.includes(doc.id.toString())}
                        onChange={(e) => handleDocumentSelection(doc.id.toString(), e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`doc-${doc.id}`} className="ml-2 block text-sm text-gray-900">
                        {doc.filename || doc.originalName || `Document ${doc.id}`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={batchOptions.language}
                  onChange={(e) => setBatchOptions(prev => ({ ...prev, language: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={batchOptions.priority}
                  onChange={(e) => setBatchOptions(prev => ({ ...prev, priority: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
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
                    Processing...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 mr-2" />
                    Start Batch Processing
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Results */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Results</h3>
          
          {results ? (
            <div className="space-y-4">
              {results.text && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Extracted Text</h4>
                  <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-auto">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {results.text}
                    </pre>
                  </div>
                </div>
              )}

              {results.confidence && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Confidence Score</h4>
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${results.confidence}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-sm text-gray-900">{results.confidence}%</span>
                  </div>
                </div>
              )}

              {results.jobId && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Batch Job</h4>
                  <p className="text-sm text-gray-600">Job ID: {results.jobId}</p>
                  <p className="text-sm text-gray-600">Status: {results.status || 'Queued'}</p>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Raw Response</h4>
                <pre className="text-xs text-gray-700 overflow-auto">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <EyeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No results yet. Run OCR processing to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OCRServices;