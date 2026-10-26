/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication and authorization
 *   - name: Documents
 *     description: Document management and processing
 *   - name: OCR
 *     description: Optical Character Recognition services
 *   - name: ICR
 *     description: Intelligent Character Recognition for handwriting
 *   - name: Document Intelligence
 *     description: Advanced document analysis and intelligence
 *   - name: Search
 *     description: Document search and filtering
 *   - name: Admin
 *     description: Administrative functions and system management
 *   - name: Model Registry
 *     description: ML model management and versioning
 *   - name: NLP
 *     description: Natural Language Processing services
 */

/**
 * @swagger
 * components:
 *   examples:
 *     LoginRequest:
 *       summary: User login request
 *       value:
 *         email: "user@example.com"
 *         password: "securePassword123"
 *     
 *     RegisterRequest:
 *       summary: User registration request
 *       value:
 *         username: "johndoe"
 *         email: "john@example.com"
 *         password: "securePassword123"
 *         firstName: "John"
 *         lastName: "Doe"
 *     
 *     DocumentUploadResponse:
 *       summary: Document upload response
 *       value:
 *         message: "Document uploaded successfully"
 *         data:
 *           id: 123
 *           filename: "contract.pdf"
 *           status: "processing"
 *           uploadedAt: "2025-10-16T12:00:00.000Z"
 *         timestamp: "2025-10-16T12:00:00.000Z"
 *     
 *     OCRResultResponse:
 *       summary: OCR processing result
 *       value:
 *         message: "OCR processing completed"
 *         data:
 *           documentId: 123
 *           extractedText: "This is the extracted text from the document..."
 *           confidence: 0.95
 *           processingTime: 2500
 *           language: "en"
 *           pageCount: 2
 *         timestamp: "2025-10-16T12:00:00.000Z"
 *     
 *     DocumentIntelligenceResponse:
 *       summary: Document intelligence analysis result
 *       value:
 *         message: "Document intelligence analysis completed"
 *         data:
 *           documentId: 123
 *           classification:
 *             type: "invoice"
 *             confidence: 0.92
 *           extraction:
 *             entities:
 *               - type: "amount"
 *                 value: "$1,250.00"
 *                 confidence: 0.98
 *               - type: "date"
 *                 value: "2025-10-15"
 *                 confidence: 0.94
 *             keyValuePairs:
 *               invoice_number: "INV-2025-001"
 *               vendor: "ACME Corp"
 *               total_amount: "1250.00"
 *           validation:
 *             isValid: true
 *             errors: []
 *         timestamp: "2025-10-16T12:00:00.000Z"
 *     
 *     SearchResponse:
 *       summary: Document search results
 *       value:
 *         message: "Search completed successfully"
 *         data:
 *           documents:
 *             - id: 123
 *               filename: "contract.pdf"
 *               relevanceScore: 0.95
 *               snippet: "This contract agreement..."
 *               metadata:
 *                 type: "contract"
 *                 date: "2025-10-15"
 *             - id: 124
 *               filename: "invoice.pdf"
 *               relevanceScore: 0.87
 *               snippet: "Invoice for services..."
 *               metadata:
 *                 type: "invoice"
 *                 amount: "1250.00"
 *           totalCount: 2
 *           page: 1
 *           limit: 10
 *         timestamp: "2025-10-16T12:00:00.000Z"
 *     
 *     AdminAnalyticsResponse:
 *       summary: Admin analytics dashboard data
 *       value:
 *         message: "Analytics data retrieved successfully"
 *         data:
 *           totalDocuments: 1547
 *           documentsProcessedToday: 23
 *           averageProcessingTime: 3200
 *           successRate: 0.97
 *           errorRate: 0.03
 *           trends:
 *             daily:
 *               - date: "2025-10-16"
 *                 count: 23
 *               - date: "2025-10-15"
 *                 count: 45
 *             hourly:
 *               - hour: 9
 *                 count: 12
 *               - hour: 10
 *                 count: 8
 *         timestamp: "2025-10-16T12:00:00.000Z"
 *     
 *     ServiceHealthResponse:
 *       summary: Service health status
 *       value:
 *         message: "Service health status retrieved"
 *         data:
 *           services:
 *             - service: "ocr-service"
 *               status: "healthy"
 *               responseTime: 120
 *               lastCheck: "2025-10-16T12:00:00.000Z"
 *               details:
 *                 version: "1.0.0"
 *                 uptime: "7d 12h 30m"
 *             - service: "nlp-service"
 *               status: "healthy"
 *               responseTime: 89
 *               lastCheck: "2025-10-16T12:00:00.000Z"
 *               details:
 *                 version: "1.0.0"
 *                 uptime: "7d 12h 30m"
 *         timestamp: "2025-10-16T12:00:00.000Z"
 *     
 *     ErrorResponse:
 *       summary: Error response example
 *       value:
 *         error: "Validation failed"
 *         code: "VALIDATION_ERROR"
 *         details:
 *           field: "email"
 *           message: "Email is required"
 *         timestamp: "2025-10-16T12:00:00.000Z"
 *   
 *   parameters:
 *     DocumentId:
 *       name: id
 *       in: path
 *       required: true
 *       description: Document ID
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 123
 *     
 *     UserId:
 *       name: userId
 *       in: path
 *       required: true
 *       description: User ID
 *       schema:
 *         type: integer
 *         minimum: 1
 *       example: 456
 *     
 *     PageParam:
 *       name: page
 *       in: query
 *       description: Page number for pagination
 *       schema:
 *         type: integer
 *         minimum: 1
 *         default: 1
 *       example: 1
 *     
 *     LimitParam:
 *       name: limit
 *       in: query
 *       description: Number of items per page
 *       schema:
 *         type: integer
 *         minimum: 1
 *         maximum: 100
 *         default: 10
 *       example: 10
 *     
 *     SearchQuery:
 *       name: q
 *       in: query
 *       description: Search query string
 *       schema:
 *         type: string
 *         minLength: 1
 *         maxLength: 500
 *       example: "invoice 2025"
 *     
 *     DateRangeStart:
 *       name: startDate
 *       in: query
 *       description: Start date for filtering (ISO 8601 format)
 *       schema:
 *         type: string
 *         format: date
 *       example: "2025-10-01"
 *     
 *     DateRangeEnd:
 *       name: endDate
 *       in: query
 *       description: End date for filtering (ISO 8601 format)
 *       schema:
 *         type: string
 *         format: date
 *       example: "2025-10-16"
 *     
 *     StatusFilter:
 *       name: status
 *       in: query
 *       description: Filter by processing status
 *       schema:
 *         type: string
 *         enum: [pending, processing, completed, failed]
 *       example: "completed"
 *     
 *     DocumentType:
 *       name: type
 *       in: query
 *       description: Filter by document type
 *       schema:
 *         type: string
 *         enum: [invoice, contract, receipt, form, other]
 *       example: "invoice"
 */