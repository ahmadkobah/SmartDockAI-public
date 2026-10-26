import React, { useState } from 'react';
import DocumentUpload from './DocumentUpload';
import DocumentList from './DocumentList';
import DocumentDetails from './DocumentDetails';

const DocumentManagement = () => {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = (uploadedDocuments) => {
    // Trigger refresh of document list
    setRefreshTrigger(prev => prev + 1);
    
    // If single document uploaded, show its details
    if (uploadedDocuments && !Array.isArray(uploadedDocuments)) {
      setSelectedDocument(uploadedDocuments);
    }
  };

  const handleDocumentSelect = (document) => {
    setSelectedDocument(document);
  };

  const handleDocumentClose = () => {
    setSelectedDocument(null);
  };

  return (
    <div>
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Document Management
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload, manage, and process your documents with AI-powered analysis
          </p>
        </div>
      </div>

      {selectedDocument ? (
        <DocumentDetails 
          document={selectedDocument} 
          onClose={handleDocumentClose}
          onUpdate={() => setRefreshTrigger(prev => prev + 1)}
        />
      ) : (
        <div className="space-y-6">
          <DocumentUpload onUploadSuccess={handleUploadSuccess} />
          <DocumentList 
            onDocumentSelect={handleDocumentSelect}
            refreshTrigger={refreshTrigger}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentManagement;