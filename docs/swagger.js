const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartDockAI API',
      version: '1.0.0',
      description: `
        SmartDockAI is an intelligent document management system with advanced OCR capabilities, 
        metadata extraction, and AI-powered search. This API provides comprehensive endpoints 
        for document processing, user management, and system administration.
        
        ## Features
        - **Document Processing**: Upload, OCR, ICR, and NLP analysis
        - **Document Intelligence**: Advanced document classification and extraction
        - **User Management**: Authentication, authorization, and user roles
        - **Admin Dashboard**: System monitoring, analytics, and configuration
        - **Search**: AI-powered document search and filtering
        - **Model Registry**: ML model management and versioning
        
        ## Authentication
        Most endpoints require JWT authentication. Include the token in the Authorization header:
        \`Authorization: Bearer <your-jwt-token>\`
        
        ## Rate Limiting
        API requests are rate-limited to prevent abuse. Standard limits apply per endpoint.
        
        ## Error Handling
        The API uses standard HTTP status codes and returns detailed error messages in JSON format.
      `,
      contact: {
        name: 'SmartDockAI Support',
        email: 'support@smartdockai.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server'
      },
      {
        url: 'https://api.smartdockai.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token for authentication'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique user identifier'
            },
            username: {
              type: 'string',
              description: 'User username',
              minLength: 3,
              maxLength: 50
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              maxLength: 100
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              maxLength: 100
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the user account is active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          },
          required: ['username', 'email']
        },
        Document: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'Unique document identifier'
            },
            filename: {
              type: 'string',
              description: 'Original filename'
            },
            mimeType: {
              type: 'string',
              description: 'Document MIME type'
            },
            size: {
              type: 'integer',
              description: 'File size in bytes'
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              description: 'Processing status'
            },
            ocrText: {
              type: 'string',
              description: 'Extracted OCR text'
            },
            metadata: {
              type: 'object',
              description: 'Extracted metadata'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Document tags'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'OCR confidence score'
            },
            processingTime: {
              type: 'integer',
              description: 'Processing time in milliseconds'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: ['filename', 'mimeType', 'size']
        },
        DocumentIntelligence: {
          type: 'object',
          properties: {
            classification: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Document type classification'
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1
                }
              }
            },
            extraction: {
              type: 'object',
              properties: {
                entities: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      value: { type: 'string' },
                      confidence: { type: 'number' }
                    }
                  }
                },
                keyValuePairs: {
                  type: 'object',
                  additionalProperties: {
                    type: 'string'
                  }
                }
              }
            },
            validation: {
              type: 'object',
              properties: {
                isValid: {
                  type: 'boolean'
                },
                errors: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        ICRResult: {
          type: 'object',
          properties: {
            extractedText: {
              type: 'string',
              description: 'Recognized handwritten text'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Overall confidence score'
            },
            handwritingRegions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  x: { type: 'integer' },
                  y: { type: 'integer' },
                  width: { type: 'integer' },
                  height: { type: 'integer' },
                  text: { type: 'string' },
                  confidence: { type: 'number' }
                }
              }
            },
            signatures: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  x: { type: 'integer' },
                  y: { type: 'integer' },
                  width: { type: 'integer' },
                  height: { type: 'integer' },
                  confidence: { type: 'number' },
                  type: { type: 'string', enum: ['handwritten', 'digital'] }
                }
              }
            },
            processingTime: {
              type: 'integer',
              description: 'Processing time in milliseconds'
            },
            metadata: {
              type: 'object',
              properties: {
                mode: { type: 'string' },
                language: { type: 'string' },
                imageQuality: { type: 'string' },
                textOrientation: { type: 'number' }
              }
            }
          }
        },
        ServiceHealth: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name'
            },
            status: {
              type: 'string',
              enum: ['healthy', 'warning', 'error'],
              description: 'Service health status'
            },
            responseTime: {
              type: 'integer',
              description: 'Response time in milliseconds'
            },
            lastCheck: {
              type: 'string',
              format: 'date-time',
              description: 'Last health check timestamp'
            },
            details: {
              type: 'object',
              description: 'Additional health check details'
            }
          }
        },
        Analytics: {
          type: 'object',
          properties: {
            totalDocuments: {
              type: 'integer',
              description: 'Total number of documents'
            },
            documentsProcessedToday: {
              type: 'integer',
              description: 'Documents processed today'
            },
            averageProcessingTime: {
              type: 'number',
              description: 'Average processing time in milliseconds'
            },
            successRate: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Processing success rate'
            },
            errorRate: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Processing error rate'
            },
            trends: {
              type: 'object',
              properties: {
                daily: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', format: 'date' },
                      count: { type: 'integer' }
                    }
                  }
                },
                hourly: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      hour: { type: 'integer' },
                      count: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            code: {
              type: 'string',
              description: 'Error code'
            },
            details: {
              type: 'object',
              description: 'Additional error details'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp'
            }
          },
          required: ['error']
        },
        Success: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Success message'
            },
            data: {
              type: 'object',
              description: 'Response data'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Response timestamp'
            }
          },
          required: ['message']
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Unauthorized access',
                code: 'AUTH_REQUIRED',
                timestamp: '2025-10-16T12:00:00.000Z'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'User does not have permission to access this resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Insufficient permissions',
                code: 'FORBIDDEN',
                timestamp: '2025-10-16T12:00:00.000Z'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Resource not found',
                code: 'NOT_FOUND',
                timestamp: '2025-10-16T12:00:00.000Z'
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: {
                  field: 'email',
                  message: 'Invalid email format'
                },
                timestamp: '2025-10-16T12:00:00.000Z'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Internal server error',
                code: 'INTERNAL_ERROR',
                timestamp: '2025-10-16T12:00:00.000Z'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/*.js',
    './src/controllers/*.js',
    './docs/swagger-components.js'
  ]
};

const specs = swaggerJSDoc(options);

module.exports = {
  specs,
  swaggerUi,
  options: {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .scheme-container { background: #fafafa; padding: 20px; border-radius: 5px; margin: 20px 0; }
    `,
    customSiteTitle: 'SmartDockAI API Documentation',
    customfavIcon: '/favicon.ico'
  }
};