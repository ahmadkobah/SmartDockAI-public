import React, { useState } from 'react';
import { documentsAPI, apiUtils } from '../../services/apiService';
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline';

const DocumentUpload = ({ onUploadSuccess }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [tags, setTags] = useState('');
  const [metadata, setMetadata] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      showMessage('Please select at least one file', 'error');
      return;
    }

    setIsUploading(true);
    
    try {
      let tagsArray = [];
      let metadataObj = {};
      
      // Parse tags
      if (tags.trim()) {
        try {
          tagsArray = JSON.parse(tags);
        } catch {
          tagsArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
        }
      }
      
      // Parse metadata
      if (metadata.trim()) {
        try {
          metadataObj = JSON.parse(metadata);
        } catch (error) {
          showMessage('Invalid JSON format for metadata', 'error');
          setIsUploading(false);
          return;
        }
      }

      if (selectedFiles.length === 1) {
        // Single file upload
        const formData = new FormData();
        formData.append('document', selectedFiles[0]);
        if (tagsArray.length > 0) formData.append('tags', JSON.stringify(tagsArray));
        if (Object.keys(metadataObj).length > 0) formData.append('metadata', JSON.stringify(metadataObj));
        
        const response = await documentsAPI.upload(formData);
        showMessage('Document uploaded successfully');
        
        if (onUploadSuccess) onUploadSuccess(response.data.data);
      } else {
        // Multiple files upload
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('documents', file);
        });
        if (tagsArray.length > 0) formData.append('tags', JSON.stringify(tagsArray));
        if (Object.keys(metadataObj).length > 0) formData.append('metadata', JSON.stringify(metadataObj));
        
        const response = await documentsAPI.uploadMultiple(formData);
        showMessage(`${selectedFiles.length} documents uploaded successfully`);
        
        if (onUploadSuccess) onUploadSuccess(response.data.data);
      }
      
      // Reset form
      setSelectedFiles([]);
      setTags('');
      setMetadata('');
    } catch (error) {
      const errorInfo = apiUtils.handleApiError(error);
      showMessage(errorInfo.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Upload Documents</h3>
      
      {message && (
        <div className={`mb-4 p-4 rounded-md ${
          messageType === 'error' 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-6">
        {/* File Upload Area */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Files
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="sr-only"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">
                <span className="font-medium text-blue-600 hover:text-blue-500">
                  Click to upload
                </span>{' '}
                or drag and drop
              </p>
              <p className="text-xs text-gray-500">
                PDF, DOC, DOCX, TXT, JPG, PNG up to 10MB each
              </p>
            </label>
          </div>
        </div>

        {/* Selected Files */}
        {selectedFiles.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              Selected Files ({selectedFiles.length})
            </h4>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <DocumentIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags (JSON array or comma-separated)
          </label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder='["invoice", "finance"] or invoice, finance'
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter tags as JSON array or comma-separated values
          </p>
        </div>

        {/* Metadata */}
        <div>
          <label htmlFor="metadata" className="block text-sm font-medium text-gray-700 mb-2">
            Metadata (JSON)
          </label>
          <textarea
            id="metadata"
            value={metadata}
            onChange={(e) => setMetadata(e.target.value)}
            rows={4}
            placeholder='{"department": "Finance", "project": "Q4-2025"}'
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <p className="mt-1 text-xs text-gray-500">
            Enter additional metadata as JSON object
          </p>
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isUploading || selectedFiles.length === 0}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              `Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Document' : 'Documents'}`
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DocumentUpload;