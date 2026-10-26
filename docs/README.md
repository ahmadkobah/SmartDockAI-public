# SmartDockAI API Documentation

Welcome to the SmartDockAI API documentation. This comprehensive guide provides detailed information about all available endpoints, authentication, request/response formats, and integration examples.

## 🚀 Getting Started

### Base URL
- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.smartdockai.com`

### Interactive Documentation
Access the interactive Swagger UI documentation at:
- **Development**: `http://localhost:3000/api-docs`
- **Production**: `https://api.smartdockai.com/api-docs`

## 🔐 Authentication

SmartDockAI uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting an Access Token

1. **Register a new account** or **login** with existing credentials
2. The API will return a JWT token and refresh token
3. Use the access token for authenticated requests
4. Refresh the token when it expires using the refresh endpoint

### Token Lifecycle
- **Access Token**: Expires in 1 hour
- **Refresh Token**: Expires in 7 days
- **Rate Limiting**: 20 requests per 15 minutes for auth endpoints

## 📚 API Endpoints Overview

### 🔑 Authentication (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile
- `PUT /auth/change-password` - Change password

### 📄 Documents (`/documents`)
- `POST /documents/upload` - Upload single document
- `POST /documents/upload-multiple` - Upload multiple documents
- `GET /documents` - List user documents
- `GET /documents/:id` - Get document details
- `PUT /documents/:id` - Update document
- `DELETE /documents/:id` - Delete document
- `GET /documents/:id/download` - Download document
- `POST /documents/:id/reprocess` - Reprocess document

### 🔍 OCR (`/ocr`)
- `POST /ocr/extract` - Extract text from image/document
- `GET /ocr/languages` - Get supported languages
- `POST /ocr/batch` - Batch OCR processing
- `GET /ocr/confidence/:documentId` - Get OCR confidence scores

### 🧠 Document Intelligence (`/intelligence`)
- `POST /intelligence/analyze` - Analyze document structure
- `POST /intelligence/classify` - Classify document type
- `POST /intelligence/extract` - Extract key information
- `POST /intelligence/validate` - Validate document data
- `GET /intelligence/templates` - Get available templates

### 🔎 Search (`/search`)
- `GET /search` - Search documents
- `POST /search/advanced` - Advanced search with filters
- `GET /search/suggestions` - Get search suggestions
- `POST /search/similar` - Find similar documents

### 🔧 Natural Language Processing (`/nlp`)
- `POST /nlp/entities` - Extract named entities
- `POST /nlp/sentiment` - Analyze sentiment
- `POST /nlp/summarize` - Generate document summary
- `POST /nlp/keywords` - Extract keywords
- `POST /nlp/language` - Detect language

### 👑 Admin (`/admin`)
- `GET /admin/statistics` - System statistics
- `GET /admin/users` - List all users
- `GET /admin/documents` - List all documents
- `GET /admin/services/health` - Service health monitoring
- `GET /admin/analytics/dashboard` - Analytics dashboard
- `GET /admin/performance` - Performance metrics
- `GET /admin/config` - System configuration
- `PUT /admin/config` - Update system configuration
- `GET /admin/roles` - Role management
- `PUT /admin/users/:userId/roles` - Update user roles

### 🤖 Model Registry (`/models/registry`)
- `GET /models/registry` - List available models
- `POST /models/registry` - Register new model
- `GET /models/registry/:id` - Get model details
- `PUT /models/registry/:id` - Update model
- `DELETE /models/registry/:id` - Delete model
- `POST /models/registry/:id/deploy` - Deploy model
- `GET /models/registry/:id/metrics` - Get model metrics

## 📊 Data Formats

### Standard Response Format
```json
{
  "message": "Operation completed successfully",
  "data": {
    // Response data
  },
  "timestamp": "2025-10-16T12:00:00.000Z"
}
```

### Error Response Format
```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  },
  "timestamp": "2025-10-16T12:00:00.000Z"
}
```

### Pagination Format
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## 🚨 HTTP Status Codes

- `200` - OK: Request successful
- `201` - Created: Resource created successfully
- `400` - Bad Request: Invalid request data
- `401` - Unauthorized: Authentication required
- `403` - Forbidden: Insufficient permissions
- `404` - Not Found: Resource not found
- `409` - Conflict: Resource already exists
- `413` - Payload Too Large: File size exceeds limit
- `422` - Unprocessable Entity: Validation failed
- `429` - Too Many Requests: Rate limit exceeded
- `500` - Internal Server Error: Server error

## 🔄 Rate Limiting

Rate limiting is applied per endpoint:
- **Authentication**: 20 requests per 15 minutes
- **File Upload**: 10 requests per minute
- **Search**: 60 requests per minute
- **General API**: 100 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time (Unix timestamp)

## 📁 File Upload Requirements

### Supported Formats
- **Documents**: PDF, DOC, DOCX, TXT
- **Images**: PNG, JPG, JPEG, TIFF, BMP, GIF
- **Archives**: ZIP (containing supported formats)

### File Size Limits
- **Single File**: 50MB maximum
- **Batch Upload**: 10 files maximum, 200MB total

### Upload Process
1. Upload file(s) via multipart/form-data
2. System validates file format and size
3. Document queued for processing
4. OCR/ICR/NLP analysis performed
5. Results available via document endpoints

## 🔧 SDK and Integration Examples

### JavaScript/Node.js
```javascript
const SmartDockAI = require('@smartdockai/sdk');

const client = new SmartDockAI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.smartdockai.com'
});

// Upload and process document
const result = await client.documents.upload({
  file: fileBuffer,
  filename: 'invoice.pdf',
  tags: ['invoice', 'finance']
});
```

### Python
```python
import smartdockai

client = smartdockai.Client(
    api_key='your-api-key',
    base_url='https://api.smartdockai.com'
)

# Upload and process document
result = client.documents.upload(
    file=open('invoice.pdf', 'rb'),
    tags=['invoice', 'finance']
)
```

### cURL Examples
```bash
# Login
curl -X POST https://api.smartdockai.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Upload document
curl -X POST https://api.smartdockai.com/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "document=@invoice.pdf" \
  -F "tags=invoice,finance"
```

## 🔍 Search Query Syntax

### Basic Search
```
GET /search?q=invoice 2025
```

### Advanced Search
```json
{
  "query": "contract agreement",
  "filters": {
    "documentType": "contract",
    "dateRange": {
      "start": "2025-01-01",
      "end": "2025-12-31"
    },
    "tags": ["legal", "active"],
    "confidence": { "min": 0.8 }
  },
  "sort": {
    "field": "relevance",
    "order": "desc"
  }
}
```

## 🛠️ Webhook Configuration

Configure webhooks to receive real-time notifications:

### Supported Events
- `document.uploaded` - Document uploaded
- `document.processed` - Processing completed
- `document.failed` - Processing failed
- `user.registered` - New user registered
- `system.alert` - System alerts

### Webhook Payload
```json
{
  "event": "document.processed",
  "data": {
    "documentId": 123,
    "status": "completed",
    "processingTime": 3200
  },
  "timestamp": "2025-10-16T12:00:00.000Z"
}
```

## 🔒 Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Secure Storage**: Store API keys securely
3. **Token Rotation**: Regularly refresh access tokens
4. **Input Validation**: Validate all input data
5. **Rate Limiting**: Respect rate limits
6. **Error Handling**: Implement proper error handling
7. **Logging**: Log API interactions for debugging

## 📞 Support and Resources

- **Documentation**: [docs.smartdockai.com](https://docs.smartdockai.com)
- **API Status**: [status.smartdockai.com](https://status.smartdockai.com)
- **Support**: [support@smartdockai.com](mailto:support@smartdockai.com)
- **GitHub**: [github.com/smartdockai](https://github.com/smartdockai)
- **Discord**: [discord.gg/smartdockai](https://discord.gg/smartdockai)

## 📝 Changelog

### v1.0.0 (2025-10-16)
- Initial API release
- Complete document processing pipeline
- Admin dashboard and analytics
- Multi-service architecture
- Comprehensive authentication system