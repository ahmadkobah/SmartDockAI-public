import React, { useState, useEffect } from 'react';
import { icrAPI, documentsAPI, apiUtils } from '../../services/apiService';
import { PencilIcon, CpuChipIcon, DocumentIcon } from '@heroicons/react/24/outline';

const ICRServices = () => {
  const [activeTab, setActiveTab] = useState('recognize');
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [recognizeOptions, setRecognizeOptions] = useState({
    confidence_threshold: 0.8,
    language: 'en',
    output_format: 'text',
  });
  const [trainOptions, setTrainOptions] = useState({
    model_name: '',
    epochs: 10,
    batch_size: 32,
  });
  const [batchOptions, setBatchOptions] = useState({
    selectedDocuments: [],
    confidence_threshold: 0.8,
  });
  const [modelId, setModelId] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const tabs = [
    { id: 'recognize', name: 'Handwriting Recognition', icon: PencilIcon },
    { id: 'train', name: 'Train Model', icon: CpuChipIcon },
    { id: 'batch', name: 'Batch Processing', icon: DocumentIcon },
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ar', name: 'Arabic' },
  ];

  const outputFormats = [
    { value: 'text', label: 'Plain Text' },
    { value: 'json', label: 'Structured JSON' },
    { value: 'xml', label: 'XML Format' },
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setSelectedDocument(''); // Clear selected document when uploading new file
    }
  };

  const handleRecognizeHandwriting = async (e) => {
    e.preventDefault();
    
    if (!selectedDocument && !selectedFile) {
      showMessage('Please select a document or upload a file', 'error');
      return;
    }

    setLoading(true);
    try {
      let formData = new FormData();
      
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('documentId', selectedDocument);
      }
      
      formData.append('confidence_threshold', recognizeOptions.confidence_threshold);
      formData.append('language', recognizeOptions.language);
      formData.append('output_format', recognizeOptions.output_format);

      const response = await icrAPI.recognizeHandwriting(formData);
      
      setResults(response.data.data);
      showMessage('Handwriting recognition completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModel = async (e) => {
    e.preventDefault();
    
    if (!trainOptions.model_name) {
      showMessage('Please enter a model name', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await icrAPI.trainModel({
        model_name: trainOptions.model_name,
        epochs: trainOptions.epochs,
        batch_size: trainOptions.batch_size,
      });
      
      setResults(response.data.data);
      showMessage('Model training started successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchProcess = async (e) => {
    e.preventDefault();
    
    if (batchOptions.selectedDocuments.length === 0) {
      showMessage('Please select at least one document for batch processing', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await icrAPI.batchProcess({
        document_ids: batchOptions.selectedDocuments,
        confidence_threshold: batchOptions.confidence_threshold,
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

  const handleCheckModelStatus = async () => {
    if (!modelId) {
      showMessage('Please enter a model ID', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await icrAPI.getModelStatus(modelId);
      setResults(response.data.data);
      showMessage('Model status retrieved successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleBatchDocument = (docId) => {
    setBatchOptions(prev => ({
      ...prev,
      selectedDocuments: prev.selectedDocuments.includes(docId)
        ? prev.selectedDocuments.filter(id => id !== docId)
        : [...prev.selectedDocuments, docId]
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
            ICR Services
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Intelligent Character Recognition for handwritten documents and images
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

          {/* Handwriting Recognition */}
          {activeTab === 'recognize' && (
            <form onSubmit={handleRecognizeHandwriting} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Input Source
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Upload New File</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div className="text-center text-sm text-gray-500">OR</div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Select Existing Document</label>
                    <select
                      value={selectedDocument}
                      onChange={(e) => {
                        setSelectedDocument(e.target.value);
                        setSelectedFile(null); // Clear file when selecting document
                      }}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Choose a document...</option>
                      {documents.map(doc => (
                        <option key={doc.id} value={doc.id}>
                          {doc.filename || doc.originalName || `Document ${doc.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  value={recognizeOptions.language}
                  onChange={(e) => setRecognizeOptions(prev => ({ ...prev, language: e.target.value }))}
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
                  Output Format
                </label>
                <select
                  value={recognizeOptions.output_format}
                  onChange={(e) => setRecognizeOptions(prev => ({ ...prev, output_format: e.target.value }))}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  {outputFormats.map(format => (
                    <option key={format.value} value={format.value}>
                      {format.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Threshold: {recognizeOptions.confidence_threshold}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={recognizeOptions.confidence_threshold}
                  onChange={(e) => setRecognizeOptions(prev => ({ 
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
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Recognize Handwriting
                  </>
                )}
              </button>
            </form>
          )}

          {/* Train Model */}
          {activeTab === 'train' && (
            <div className="space-y-4">
              <form onSubmit={handleTrainModel} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={trainOptions.model_name}
                    onChange={(e) => setTrainOptions(prev => ({ ...prev, model_name: e.target.value }))}
                    placeholder="Enter model name"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Epochs: {trainOptions.epochs}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={trainOptions.epochs}
                    onChange={(e) => setTrainOptions(prev => ({ ...prev, epochs: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size: {trainOptions.batch_size}
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="128"
                    step="8"
                    value={trainOptions.batch_size}
                    onChange={(e) => setTrainOptions(prev => ({ ...prev, batch_size: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>8</span>
                    <span>128</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Training...
                    </>
                  ) : (
                    <>
                      <CpuChipIcon className="h-4 w-4 mr-2" />
                      Start Training
                    </>
                  )}
                </button>
              </form>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Check Model Status</h4>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    placeholder="Enter model ID"
                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button
                    onClick={handleCheckModelStatus}
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Check Status
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Batch Processing */}
          {activeTab === 'batch' && (
            <form onSubmit={handleBatchProcess} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Documents for Batch Processing
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3 space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center">
                      <input
                        id={`doc-${doc.id}`}
                        type="checkbox"
                        checked={batchOptions.selectedDocuments.includes(doc.id)}
                        onChange={() => toggleBatchDocument(doc.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`doc-${doc.id}`} className="ml-2 block text-sm text-gray-900">
                        {doc.filename || doc.originalName || `Document ${doc.id}`}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Selected: {batchOptions.selectedDocuments.length} documents
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Threshold: {batchOptions.confidence_threshold}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={batchOptions.confidence_threshold}
                  onChange={(e) => setBatchOptions(prev => ({ 
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

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
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
                    <DocumentIcon className="h-4 w-4 mr-2" />
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
              {/* Recognition Results */}
              {results.recognized_text && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recognized Text</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900">
                      {results.recognized_text}
                    </pre>
                  </div>
                  {results.confidence && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(results.confidence)}`}>
                        Confidence: {Math.round(results.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Word-level Results */}
              {results.words && results.words.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Word-level Recognition</h4>
                  <div className="space-y-2">
                    {results.words.map((word, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium text-gray-900">{word.text}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(word.confidence)}`}>
                          {Math.round(word.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Training Results */}
              {results.training_id && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Training Started</h4>
                  <div className="bg-green-50 p-4 rounded-md">
                    <p className="text-sm text-green-700">
                      <strong>Training ID:</strong> {results.training_id}
                    </p>
                    <p className="text-sm text-green-700">
                      <strong>Status:</strong> {results.status || 'Started'}
                    </p>
                    {results.estimated_completion && (
                      <p className="text-sm text-green-700">
                        <strong>Estimated Completion:</strong> {results.estimated_completion}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Model Status */}
              {results.model_status && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Model Status</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        results.model_status === 'completed' ? 'bg-green-100 text-green-800' :
                        results.model_status === 'training' ? 'bg-yellow-100 text-yellow-800' :
                        results.model_status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {results.model_status}
                      </span>
                    </div>
                    {results.accuracy && (
                      <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium text-gray-700">Accuracy:</span>
                        <span className="text-gray-900">{(results.accuracy * 100).toFixed(2)}%</span>
                      </div>
                    )}
                    {results.progress && (
                      <div className="flex justify-between p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium text-gray-700">Progress:</span>
                        <span className="text-gray-900">{results.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Batch Results */}
              {results.batch_id && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Batch Processing</h4>
                  <div className="bg-blue-50 p-4 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Batch ID:</strong> {results.batch_id}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Documents:</strong> {results.document_count || 'N/A'}
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Status:</strong> {results.status || 'Started'}
                    </p>
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
              <PencilIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No results yet. Upload a document or select one from the list to start handwriting recognition.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ICRServices;