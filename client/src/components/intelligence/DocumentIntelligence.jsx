import React, { useState, useEffect } from 'react';
import { intelligenceAPI, documentsAPI, apiUtils } from '../../services/apiService';
import { CpuChipIcon, DocumentMagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';

const DocumentIntelligence = () => {
  const [activeTab, setActiveTab] = useState('analyze');
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [analyzeOptions, setAnalyzeOptions] = useState({
    classification: true,
    extraction: true,
    validation: true,
  });
  const [classifyOptions, setClassifyOptions] = useState({
    confidence_threshold: 0.8,
  });
  const [extractOptions, setExtractOptions] = useState({
    extraction_types: ['entities', 'key_value_pairs', 'tables'],
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const tabs = [
    { id: 'analyze', name: 'Full Analysis', icon: CpuChipIcon },
    { id: 'classify', name: 'Classification', icon: DocumentMagnifyingGlassIcon },
    { id: 'extract', name: 'Information Extraction', icon: SparklesIcon },
  ];

  const extractionTypes = [
    'entities', 'key_value_pairs', 'tables', 'dates', 'amounts', 'addresses'
  ];

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await documentsAPI.list({ limit: 100 });
      setDocuments(response.data.data.documents || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFullAnalysis = async (e) => {
    e.preventDefault();
    
    if (!selectedDocument) {
      showMessage('Please select a document', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await intelligenceAPI.analyze({
        documentId: parseInt(selectedDocument),
        analysis: analyzeOptions,
      });
      
      setResults(response.data.data);
      showMessage('Document analysis completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClassification = async (e) => {
    e.preventDefault();
    
    if (!selectedDocument) {
      showMessage('Please select a document', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await intelligenceAPI.classify({
        documentId: parseInt(selectedDocument),
        confidence_threshold: classifyOptions.confidence_threshold,
      });
      
      setResults(response.data.data);
      showMessage('Document classification completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExtraction = async (e) => {
    e.preventDefault();
    
    if (!selectedDocument) {
      showMessage('Please select a document', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await intelligenceAPI.extract({
        documentId: parseInt(selectedDocument),
        extraction_types: extractOptions.extraction_types,
      });
      
      setResults(response.data.data);
      showMessage('Information extraction completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExtractionType = (type) => {
    setExtractOptions(prev => ({
      ...prev,
      extraction_types: prev.extraction_types.includes(type)
        ? prev.extraction_types.filter(t => t !== type)
        : [...prev.extraction_types, type]
    }));
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Document Intelligence
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered document analysis, classification, and information extraction
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
              onClick={() => {
                setActiveTab(tab.id);
                setResults(null);
              }}
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
            {tabs.find(tab => tab.id === activeTab)?.name}
          </h3>

          <form 
            onSubmit={
              activeTab === 'analyze' ? handleFullAnalysis :
              activeTab === 'classify' ? handleClassification :
              handleExtraction
            } 
            className="space-y-4"
          >
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

            {/* Full Analysis Options */}
            {activeTab === 'analyze' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Analysis Options
                </label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="classification"
                      type="checkbox"
                      checked={analyzeOptions.classification}
                      onChange={(e) => setAnalyzeOptions(prev => ({ ...prev, classification: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="classification" className="ml-2 block text-sm text-gray-900">
                      Document Classification
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="extraction"
                      type="checkbox"
                      checked={analyzeOptions.extraction}
                      onChange={(e) => setAnalyzeOptions(prev => ({ ...prev, extraction: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="extraction" className="ml-2 block text-sm text-gray-900">
                      Information Extraction
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      id="validation"
                      type="checkbox"
                      checked={analyzeOptions.validation}
                      onChange={(e) => setAnalyzeOptions(prev => ({ ...prev, validation: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="validation" className="ml-2 block text-sm text-gray-900">
                      Data Validation
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Classification Options */}
            {activeTab === 'classify' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Threshold: {classifyOptions.confidence_threshold}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={classifyOptions.confidence_threshold}
                  onChange={(e) => setClassifyOptions(prev => ({ 
                    ...prev, 
                    confidence_threshold: parseFloat(e.target.value) 
                  }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.1 (Low)</span>
                  <span>1.0 (High)</span>
                </div>
              </div>
            )}

            {/* Extraction Options */}
            {activeTab === 'extract' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extraction Types
                </label>
                <div className="flex flex-wrap gap-2">
                  {extractionTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleExtractionType(type)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        extractOptions.extraction_types.includes(type)
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  <CpuChipIcon className="h-4 w-4 mr-2" />
                  {activeTab === 'analyze' ? 'Run Full Analysis' :
                   activeTab === 'classify' ? 'Classify Document' :
                   'Extract Information'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Results</h3>
          
          {results ? (
            <div className="space-y-4">
              {/* Classification Results */}
              {(results.classification || results.documentType) && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Classification</h4>
                  <div className="space-y-2">
                    {results.classification?.predictions ? (
                      results.classification.predictions.map((pred, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <span className="font-medium text-gray-900">{pred.label}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(pred.confidence)}`}>
                            {Math.round(pred.confidence * 100)}%
                          </span>
                        </div>
                      ))
                    ) : results.documentType ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <span className="font-medium text-gray-900">{results.documentType}</span>
                        {results.confidence && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(results.confidence)}`}>
                            {Math.round(results.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No classification results</p>
                    )}
                  </div>
                </div>
              )}

              {/* Extraction Results */}
              {results.extraction && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Information Extraction</h4>
                  
                  {results.extraction.entities && results.extraction.entities.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Entities</h5>
                      <div className="flex flex-wrap gap-2">
                        {results.extraction.entities.map((entity, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {entity.text} ({entity.type})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.extraction.key_value_pairs && Object.keys(results.extraction.key_value_pairs).length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Key-Value Pairs</h5>
                      <div className="space-y-1">
                        {Object.entries(results.extraction.key_value_pairs).map(([key, value], index) => (
                          <div key={index} className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                            <span className="font-medium text-gray-700">{key}:</span>
                            <span className="text-gray-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.extraction.tables && results.extraction.tables.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">Tables Found: {results.extraction.tables.length}</h5>
                      <p className="text-sm text-gray-500">Table extraction results available in raw data</p>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Results */}
              {results.validation && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Data Validation</h4>
                  <div className="space-y-2">
                    {results.validation.errors && results.validation.errors.length > 0 ? (
                      results.validation.errors.map((error, index) => (
                        <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-700">{error.message}</p>
                          {error.field && (
                            <p className="text-xs text-red-500 mt-1">Field: {error.field}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-700">No validation errors found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Raw Results */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Raw Response</h4>
                <pre className="text-xs text-gray-700 overflow-auto max-h-64">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CpuChipIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No results yet. Select a document and run analysis to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentIntelligence;