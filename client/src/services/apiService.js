import axios from 'axios';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post('http://localhost:3000/api/auth/refresh', {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('token', token);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  register: (userData) => apiClient.post('/auth/register', userData),
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (profileData) => apiClient.put('/auth/profile', profileData),
  changePassword: (passwordData) => apiClient.put('/auth/change-password', passwordData),
  refreshToken: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
};

// Documents API
export const documentsAPI = {
  upload: (formData) => apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadMultiple: (formData) => apiClient.post('/documents/upload-multiple', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  list: (params) => apiClient.get('/documents', { params }),
  getDetails: (documentId) => apiClient.get(`/documents/${documentId}`),
  delete: (documentId) => apiClient.delete(`/documents/${documentId}`),
  update: (documentId, data) => apiClient.put(`/documents/${documentId}`, data),
};

// OCR API
export const ocrAPI = {
  extractText: (data) => apiClient.post('/ocr/extract', data),
  getSupportedLanguages: () => apiClient.get('/ocr/languages'),
  batchProcess: (data) => apiClient.post('/ocr/batch', data),
  getJobStatus: (jobId) => apiClient.get(`/ocr/jobs/${jobId}`),
};

// Document Intelligence API
export const intelligenceAPI = {
  analyze: (data) => apiClient.post('/intelligence/analyze', data),
  classify: (data) => apiClient.post('/intelligence/classify', data),
  extract: (data) => apiClient.post('/intelligence/extract', data),
  getAnalysisResults: (analysisId) => apiClient.get(`/intelligence/results/${analysisId}`),
};

// Search API
export const searchAPI = {
  search: (params) => apiClient.get('/search', { params }),
  advancedSearch: (data) => apiClient.post('/search/advanced', data),
  suggestions: (query) => apiClient.get('/search/suggestions', { params: { q: query } }),
};

// NLP API
export const nlpAPI = {
  extractEntities: (data) => apiClient.post('/nlp/entities', data),
  analyzeSentiment: (data) => apiClient.post('/nlp/sentiment', data),
  summarize: (data) => apiClient.post('/nlp/summarize', data),
  detectLanguage: (data) => apiClient.post('/nlp/language', data),
  keywordExtraction: (data) => apiClient.post('/nlp/keywords', data),
};

// Admin API
export const adminAPI = {
  getStatistics: () => apiClient.get('/admin/statistics'),
  getServiceHealth: () => apiClient.get('/admin/services/health'),
  getAnalyticsDashboard: (params) => apiClient.get('/admin/analytics/dashboard', { params }),
  listUsers: (params) => apiClient.get('/admin/users', { params }),
  getPerformanceMetrics: () => apiClient.get('/admin/performance'),
  updateUserRoles: (userId, roles) => apiClient.put(`/admin/users/${userId}/roles`, { roles }),
  getSystemLogs: (params) => apiClient.get('/admin/logs', { params }),
};

// ICR API
export const icrAPI = {
  recognizeHandwriting: (data) => apiClient.post('/icr/recognize', data),
  trainModel: (data) => apiClient.post('/icr/train', data),
  getModelStatus: (modelId) => apiClient.get(`/icr/models/${modelId}/status`),
  batchProcess: (data) => apiClient.post('/icr/batch', data),
};

// Utility functions
export const apiUtils = {
  handleApiError: (error) => {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.message || 'An error occurred',
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        message: 'Network error - please check your connection',
        status: 0,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        status: -1,
      };
    }
  },
  
  downloadFile: async (url, filename) => {
    try {
      const response = await apiClient.get(url, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw error;
    }
  },
};

export default apiClient;