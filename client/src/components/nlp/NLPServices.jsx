import React, { useState } from 'react';
import { nlpAPI, apiUtils } from '../../services/apiService';
import { ChatBubbleLeftRightIcon, SparklesIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';

const NLPServices = () => {
  const [activeTab, setActiveTab] = useState('entities');
  const [inputText, setInputText] = useState('');
  const [entityTypes, setEntityTypes] = useState(['PERSON', 'ORG', 'GPE', 'MONEY']);
  const [summaryOptions, setSummaryOptions] = useState({
    maxLength: 100,
    minLength: 50,
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const tabs = [
    { id: 'entities', name: 'Entity Extraction', icon: SparklesIcon },
    { id: 'sentiment', name: 'Sentiment Analysis', icon: ChatBubbleLeftRightIcon },
    { id: 'summary', name: 'Text Summary', icon: DocumentChartBarIcon },
  ];

  const availableEntityTypes = [
    'PERSON', 'ORG', 'GPE', 'MONEY', 'DATE', 'TIME', 'PERCENT', 'CARDINAL', 'ORDINAL'
  ];

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleEntityExtraction = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) {
      showMessage('Please enter some text to analyze', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await nlpAPI.extractEntities({
        text: inputText,
        entity_types: entityTypes,
      });
      
      setResults(response.data.data);
      showMessage('Entity extraction completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSentimentAnalysis = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) {
      showMessage('Please enter some text to analyze', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await nlpAPI.analyzeSentiment({
        text: inputText,
      });
      
      setResults(response.data.data);
      showMessage('Sentiment analysis completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSummarization = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) {
      showMessage('Please enter some text to summarize', 'error');
      return;
    }

    if (inputText.length < 100) {
      showMessage('Text should be at least 100 characters for meaningful summarization', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await nlpAPI.summarize({
        text: inputText,
        max_length: summaryOptions.maxLength,
        min_length: summaryOptions.minLength,
      });
      
      setResults(response.data.data);
      showMessage('Text summarization completed successfully');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEntityType = (entityType) => {
    setEntityTypes(prev => 
      prev.includes(entityType)
        ? prev.filter(type => type !== entityType)
        : [...prev, entityType]
    );
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'text-green-600 bg-green-100';
      case 'negative':
        return 'text-red-600 bg-red-100';
      case 'neutral':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSampleText = () => {
    const samples = {
      entities: "John Doe works at ACME Corporation in New York and earns $75,000 annually. He started his position on January 15, 2023.",
      sentiment: "This is an excellent product and I'm very satisfied with the service. The customer support team was incredibly helpful and responsive.",
      summary: "Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of 'intelligent agents': any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals. Colloquially, the term 'artificial intelligence' is often used to describe machines that mimic 'cognitive' functions that humans associate with the human mind, such as 'learning' and 'problem solving'. As machines become increasingly capable, tasks considered to require 'intelligence' are often removed from the definition of AI, a phenomenon known as the AI effect. A quip in Tesler's Theorem says 'AI is whatever hasn't been done yet.'"
    };
    return samples[activeTab] || '';
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            NLP Services
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Natural language processing for entity extraction, sentiment analysis, and text summarization
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {tabs.find(tab => tab.id === activeTab)?.name}
            </h3>
            <button
              onClick={() => setInputText(getSampleText())}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Use Sample Text
            </button>
          </div>

          <form 
            onSubmit={
              activeTab === 'entities' ? handleEntityExtraction :
              activeTab === 'sentiment' ? handleSentimentAnalysis :
              handleSummarization
            } 
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Text
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={8}
                placeholder={`Enter text for ${tabs.find(tab => tab.id === activeTab)?.name.toLowerCase()}...`}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              />
              <div className="mt-1 text-xs text-gray-500">
                Characters: {inputText.length}
                {activeTab === 'summary' && inputText.length < 100 && (
                  <span className="text-red-500 ml-2">
                    (Minimum 100 characters recommended for summarization)
                  </span>
                )}
              </div>
            </div>

            {/* Entity Types Selection */}
            {activeTab === 'entities' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Types to Extract
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableEntityTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleEntityType(type)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        entityTypes.includes(type)
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Options */}
            {activeTab === 'summary' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Length
                  </label>
                  <input
                    type="number"
                    value={summaryOptions.maxLength}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, maxLength: parseInt(e.target.value) }))}
                    min="50"
                    max="500"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Length
                  </label>
                  <input
                    type="number"
                    value={summaryOptions.minLength}
                    onChange={(e) => setSummaryOptions(prev => ({ ...prev, minLength: parseInt(e.target.value) }))}
                    min="10"
                    max="200"
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
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
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  {activeTab === 'entities' ? 'Extract Entities' :
                   activeTab === 'sentiment' ? 'Analyze Sentiment' :
                   'Generate Summary'}
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
              {/* Entity Results */}
              {activeTab === 'entities' && results.entities && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Extracted Entities ({results.entities.length})
                  </h4>
                  {results.entities.length > 0 ? (
                    <div className="space-y-2">
                      {results.entities.map((entity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                          <div>
                            <span className="font-medium text-gray-900">{entity.text}</span>
                            <span className="ml-2 text-sm text-gray-500">
                              ({entity.start_char}-{entity.end_char})
                            </span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800`}>
                            {entity.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No entities found</p>
                  )}
                </div>
              )}

              {/* Sentiment Results */}
              {activeTab === 'sentiment' && results.sentiment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Sentiment Analysis</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-700">Overall Sentiment</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(results.sentiment.label)}`}>
                        {results.sentiment.label}
                      </span>
                    </div>
                    
                    {results.sentiment.scores && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Confidence Scores</h5>
                        {Object.entries(results.sentiment.scores).map(([label, score]) => (
                          <div key={label} className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 capitalize">{label}</span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${score * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-900">{(score * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary Results */}
              {activeTab === 'summary' && results.summary && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Generated Summary</h4>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {results.summary.text || results.summary}
                    </p>
                  </div>
                  
                  {results.summary.stats && (
                    <div className="mt-3 grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{results.summary.stats.original_length}</p>
                        <p className="text-xs text-gray-500">Original</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{results.summary.stats.summary_length}</p>
                        <p className="text-xs text-gray-500">Summary</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {Math.round((results.summary.stats.summary_length / results.summary.stats.original_length) * 100)}%
                        </p>
                        <p className="text-xs text-gray-500">Compression</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Raw Response */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Raw Response</h4>
                <pre className="text-xs text-gray-700 overflow-auto max-h-48">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No results yet. Enter text and run analysis to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NLPServices;