import React, { useState, useEffect } from 'react';
import { documentsAPI, ocrAPI, intelligenceAPI, nlpAPI, apiUtils } from '../../services/apiService';
import { 
  ArrowLeftIcon, 
  DocumentTextIcon, 
  EyeIcon, 
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  CalendarIcon,
  TagIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

const DocumentDetails = ({ document, onClose, onUpdate }) => {
  const [documentData, setDocumentData] = useState(document);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [ocrResults, setOcrResults] = useState(null);
  const [intelligenceResults, setIntelligenceResults] = useState(null);
  const [nlpResults, setNlpResults] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const tabs = [
    { id: 'details', name: 'Details', icon: InformationCircleIcon },
    { id: 'ocr', name: 'OCR Text', icon: EyeIcon },
    { id: 'intelligence', name: 'AI Analysis', icon: CpuChipIcon },
    { id: 'nlp', name: 'NLP Analysis', icon: ChatBubbleLeftRightIcon },
  ];

  useEffect(() => {
    // Load fresh document details
    loadDocumentDetails();
  }, [document.id]);

  const loadDocumentDetails = async () => {
    try {
      const response = await documentsAPI.getDetails(document.id);
      setDocumentData(response.data.data);
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    }
  };

  const runOCR = async () => {
    setLoading(true);
    try {
      const response = await ocrAPI.extractText({
        documentId: documentData.id,
        language: 'en',
        options: {
          confidence: true,
          coordinates: true,
        },
      });
      setOcrResults(response.data.data);
      showMessage('OCR analysis completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const runIntelligenceAnalysis = async () => {
    setLoading(true);
    try {
      const response = await intelligenceAPI.analyze({
        documentId: documentData.id,
        analysis: {
          classification: true,
          extraction: true,
          validation: true,
        },
      });
      setIntelligenceResults(response.data.data);
      showMessage('Intelligence analysis completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const runNLPAnalysis = async (text) => {
    if (!text) {
      showMessage('No text available for NLP analysis. Run OCR first.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Run multiple NLP analyses in parallel
      const [entitiesResponse, sentimentResponse, summaryResponse] = await Promise.all([
        nlpAPI.extractEntities({ text, entity_types: ['PERSON', 'ORG', 'GPE', 'MONEY', 'DATE'] }),
        nlpAPI.analyzeSentiment({ text }),
        nlpAPI.summarize({ text, max_length: 100, min_length: 50 }),
      ]);

      setNlpResults({
        entities: entitiesResponse.data.data,
        sentiment: sentimentResponse.data.data,
        summary: summaryResponse.data.data,
      });
      showMessage('NLP analysis completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={onClose}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <DocumentTextIcon className="h-6 w-6 text-gray-400 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {documentData.filename || documentData.originalName || 'Unnamed Document'}
                </h3>
                <div className="flex items-center mt-1 text-sm text-gray-500 space-x-4">
                  <span className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {formatDate(documentData.createdAt)}
                  </span>
                  {getStatusBadge(documentData.status)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-4 rounded-md ${
            messageType === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200' 
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
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

      {/* Tab Content */}
      <div className="px-6 py-6">
        {activeTab === 'details' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">File Information</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Filename</dt>
                    <dd className="text-sm text-gray-900">{documentData.filename || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Original Name</dt>
                    <dd className="text-sm text-gray-900">{documentData.originalName || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">MIME Type</dt>
                    <dd className="text-sm text-gray-900">{documentData.mimeType || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">File Size</dt>
                    <dd className="text-sm text-gray-900">
                      {documentData.fileSize ? `${Math.round(documentData.fileSize / 1024)} KB` : 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Processing Information</h4>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Status</dt>
                    <dd className="text-sm text-gray-900">{getStatusBadge(documentData.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Created</dt>
                    <dd className="text-sm text-gray-900">{formatDate(documentData.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-gray-500">Updated</dt>
                    <dd className="text-sm text-gray-900">{formatDate(documentData.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Tags */}
            {documentData.tags && documentData.tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <TagIcon className="h-4 w-4 mr-1" />
                  Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {documentData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {documentData.metadata && Object.keys(documentData.metadata).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Metadata</h4>
                <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-auto">
                  {JSON.stringify(documentData.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ocr' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">OCR Text Extraction</h4>
              <button
                onClick={runOCR}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Run OCR'}
              </button>
            </div>

            {ocrResults ? (
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Extracted Text</h5>
                  <div className="bg-gray-50 p-4 rounded-md max-h-96 overflow-auto">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {ocrResults.text || 'No text extracted'}
                    </pre>
                  </div>
                </div>
                
                {ocrResults.confidence && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Confidence Score</h5>
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${ocrResults.confidence}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-900">{ocrResults.confidence}%</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <EyeIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No OCR results available. Click "Run OCR" to extract text from this document.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'intelligence' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">AI Document Analysis</h4>
              <button
                onClick={runIntelligenceAnalysis}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            </div>

            {intelligenceResults ? (
              <div className="space-y-6">
                {intelligenceResults.classification && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Document Classification</h5>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <pre className="text-sm text-gray-900">
                        {JSON.stringify(intelligenceResults.classification, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {intelligenceResults.extraction && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Key Information Extraction</h5>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <pre className="text-sm text-gray-900">
                        {JSON.stringify(intelligenceResults.extraction, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {intelligenceResults.validation && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Validation Results</h5>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <pre className="text-sm text-gray-900">
                        {JSON.stringify(intelligenceResults.validation, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CpuChipIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No AI analysis results available. Click "Run AI Analysis" to analyze this document.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'nlp' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">NLP Analysis</h4>
              <button
                onClick={() => runNLPAnalysis(ocrResults?.text)}
                disabled={loading || !ocrResults?.text}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Run NLP Analysis'}
              </button>
            </div>

            {nlpResults ? (
              <div className="space-y-6">
                {nlpResults.entities && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Named Entities</h5>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <pre className="text-sm text-gray-900">
                        {JSON.stringify(nlpResults.entities, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {nlpResults.sentiment && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Sentiment Analysis</h5>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <pre className="text-sm text-gray-900">
                        {JSON.stringify(nlpResults.sentiment, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {nlpResults.summary && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Document Summary</h5>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <pre className="text-sm text-gray-900">
                        {JSON.stringify(nlpResults.summary, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No NLP analysis results available. Run OCR first, then click "Run NLP Analysis".</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentDetails;