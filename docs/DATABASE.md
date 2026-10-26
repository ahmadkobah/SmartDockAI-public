# 📊 SmartDockAI Database Documentation

## Overview

SmartDockAI uses a PostgreSQL database as the central data store for the entire document processing ecosystem. This document provides comprehensive information about the database schema, engine integrations, and data flow patterns.

## 🗄️ Database Configuration

- **Engine**: PostgreSQL 15 (Alpine)
- **Port**: 5432
- **Database Name**: `smartdock_db`
- **Environments**: Development, Test, Production
- **Connection Pooling**: Configured with min/max pool settings
- **SSL Support**: Available for production
- **Container**: `smartdock_postgres`

### Environment Variables
```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=smartdock_db
DB_USER=smartdock_user
DB_PASSWORD=smartdock_password
```

---

## 🏗️ Complete Database Schema

### Core Tables Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USERS       │    │     ROLES       │    │   USER_ROLES    │
│                 │    │                 │    │   (Junction)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │◄───┤ id (PK)         │◄───┤ id (PK)         │
│ email (UNIQUE)  │    │ name (UNIQUE)   │    │ userId (FK)     │
│ password        │    │ description     │    │ roleId (FK)     │
│ firstName       │    │ permissions     │    │ assignedBy (FK) │
│ lastName        │    │ isActive        │    │ assignedAt      │
│ isActive        │    │ createdAt       │    │ isActive        │
│ lastLoginAt     │    │ updatedAt       │    │ expiresAt       │
│ emailVerifiedAt │    └─────────────────┘    │ createdAt       │
│ passwordReset*  │                           │ updatedAt       │
│ createdAt       │                           └─────────────────┘
│ updatedAt       │
└─────────────────┘
```

### Document Management Tables
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   DOCUMENTS     │    │ DOCUMENT_       │    │ METADATA_       │
│                 │    │ VERSIONS        │    │ EXTRACTIONS     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │◄───┤ id (PK)         │    │ id (PK)         │
│ filename        │    │ documentId (FK) │    │ documentId (FK) │◄─┐
│ originalName    │    │ version         │    │ extractionType  │  │
│ mimeType        │    │ storageKey      │    │ fieldName       │  │
│ size            │    │ size            │    │ fieldValue      │  │
│ uploadedBy (FK) │    │ checksum        │    │ confidence      │  │
│ storageKey      │    │ changes         │    │ position (JSON) │  │
│ bucket          │    │ createdBy (FK)  │    │ extractedBy(FK) │  │
│ checksum        │    │ createdAt       │    │ isVerified      │  │
│ ocrStatus       │    │ updatedAt       │    │ createdAt       │  │
│ ocrText         │    └─────────────────┘    │ updatedAt       │  │
│ ocrConfidence   │                           └─────────────────┘  │
│ metadata (JSON) │                                                │
│ tags (ARRAY)    │                                                │
│ isPublic        │◄───────────────────────────────────────────────┘
│ downloadCount   │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
```

### Audit & Logging Table
```
┌─────────────────┐
│   AUDIT_LOGS    │
├─────────────────┤
│ id (PK)         │
│ userId (FK)     │
│ action          │
│ resource        │
│ resourceId      │
│ details (JSON)  │
│ ipAddress       │
│ userAgent       │
│ status          │
│ level           │
│ createdAt       │
│ updatedAt       │
└─────────────────┘
```

---

## 📋 Detailed Table Specifications

### 1. USERS Table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique user identifier |
| `email` | STRING | NOT NULL, UNIQUE | User's email address |
| `password` | STRING | NOT NULL | Encrypted password |
| `firstName` | STRING | NOT NULL | User's first name |
| `lastName` | STRING | NOT NULL | User's last name |
| `isActive` | BOOLEAN | DEFAULT true | Account active status |
| `lastLoginAt` | DATE | NULLABLE | Last login timestamp |
| `emailVerifiedAt` | DATE | NULLABLE | Email verification timestamp |
| `passwordResetToken` | STRING | NULLABLE | Password reset token |
| `passwordResetExpiresAt` | DATE | NULLABLE | Token expiration |

**Migration**: `20251006205756-create-users-roles-tables.js`

### 2. ROLES Table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique role identifier |
| `name` | STRING | NOT NULL, UNIQUE | Role name (admin, user, etc.) |
| `description` | TEXT | NULLABLE | Role description |
| `permissions` | JSONB | NOT NULL, DEFAULT [] | Permission array |
| `isActive` | BOOLEAN | DEFAULT true | Role active status |

**Migration**: `20251006205756-create-users-roles-tables.js`

### 3. USER_ROLES Table (Junction)

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique assignment identifier |
| `userId` | INTEGER | FK → users.id, CASCADE | User reference |
| `roleId` | INTEGER | FK → roles.id, CASCADE | Role reference |
| `assignedBy` | INTEGER | FK → users.id, SET NULL | Assigner reference |
| `assignedAt` | DATE | NOT NULL, DEFAULT NOW | Assignment timestamp |
| `isActive` | BOOLEAN | DEFAULT true | Assignment active status |
| `expiresAt` | DATE | NULLABLE | Assignment expiration |

**Unique Index**: `[userId, roleId]` WHERE `isActive = true`

### 4. DOCUMENTS Table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique document identifier |
| `filename` | STRING | NOT NULL | System filename |
| `originalName` | STRING | NOT NULL | Original upload filename |
| `mimeType` | STRING | NOT NULL | File MIME type |
| `size` | BIGINT | NOT NULL | File size in bytes |
| `uploadedBy` | INTEGER | FK → users.id, CASCADE | Uploader reference |
| `storageKey` | STRING | NOT NULL, UNIQUE | Storage system key |
| `bucket` | STRING | NOT NULL, DEFAULT 'documents' | Storage bucket |
| `checksum` | STRING | NULLABLE | File integrity checksum |
| `ocrStatus` | STRING | DEFAULT 'pending' | OCR processing status |
| `ocrText` | TEXT | NULLABLE | Extracted OCR text |
| `ocrConfidence` | FLOAT | NULLABLE | OCR confidence score |
| `metadata` | JSONB | NOT NULL, DEFAULT {} | Document metadata |
| `tags` | STRING[] | DEFAULT [] | Document tags array |
| `isPublic` | BOOLEAN | DEFAULT false | Public access flag |
| `downloadCount` | INTEGER | DEFAULT 0 | Download counter |

**Migration**: `20251006210000-create-documents-tables.js`

### 5. DOCUMENT_VERSIONS Table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique version identifier |
| `documentId` | INTEGER | FK → documents.id, CASCADE | Document reference |
| `version` | INTEGER | NOT NULL, DEFAULT 1 | Version number |
| `storageKey` | STRING | NOT NULL | Version storage key |
| `size` | BIGINT | NOT NULL | Version file size |
| `checksum` | STRING | NULLABLE | Version checksum |
| `changes` | TEXT | NULLABLE | Change description |
| `createdBy` | INTEGER | FK → users.id | Version creator |

**Unique Index**: `[documentId, version]`

### 6. METADATA_EXTRACTIONS Table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique extraction identifier |
| `documentId` | INTEGER | FK → documents.id, CASCADE | Document reference |
| `extractionType` | STRING | NOT NULL | Type of extraction (OCR, ICR, NLP) |
| `fieldName` | STRING | NOT NULL | Extracted field name |
| `fieldValue` | TEXT | NOT NULL | Extracted field value |
| `confidence` | FLOAT | NULLABLE | Extraction confidence score |
| `position` | JSONB | NULLABLE | Field position coordinates |
| `extractedBy` | INTEGER | FK → users.id, NULLABLE | Extractor reference |
| `isVerified` | BOOLEAN | DEFAULT false | Manual verification flag |

**Extraction Types**: `ocr`, `icr`, `nlp`, `intelligence`

### 7. AUDIT_LOGS Table

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO_INCREMENT | Unique log identifier |
| `userId` | INTEGER | FK → users.id, SET NULL | User reference |
| `action` | STRING | NOT NULL | Action performed |
| `resource` | STRING | NOT NULL | Resource affected |
| `resourceId` | INTEGER | NULLABLE | Specific resource ID |
| `details` | JSONB | NOT NULL, DEFAULT {} | Action details |
| `ipAddress` | INET | NULLABLE | Client IP address |
| `userAgent` | TEXT | NULLABLE | Client user agent |
| `status` | STRING | DEFAULT 'success' | Action status |
| `level` | STRING | DEFAULT 'info' | Log level |

---

## 🔗 Foreign Key Relationships

```
USERS (1) ←→ (N) USER_ROLES (N) ←→ (1) ROLES
  ↓
  └─→ DOCUMENTS (1) ←→ (N) DOCUMENT_VERSIONS
        ↓
        └─→ METADATA_EXTRACTIONS
        ↓
        └─→ AUDIT_LOGS
```

### Relationship Details

- **Users ↔ User_Roles**: Many-to-many relationship through junction table
- **Users → Documents**: One-to-many (user can upload multiple documents)
- **Documents → Document_Versions**: One-to-many (document versioning)
- **Documents → Metadata_Extractions**: One-to-many (multiple extractions per document)
- **Users → Audit_Logs**: One-to-many (user activity tracking)

---

## 📊 Database Indexes

### Performance Indexes

#### Documents Table
- `documents.uploadedBy` - User document queries
- `documents.storageKey` - Storage key lookups  
- `documents.ocrStatus` - OCR status filtering
- `documents.tags` (GIN) - Tag-based searches
- `documents.metadata` (GIN) - Metadata searches

#### Document Versions Table
- `document_versions.[documentId, version]` (UNIQUE) - Version control

#### Metadata Extractions Table
- `metadata_extractions.documentId` - Extraction queries
- `metadata_extractions.fieldName` - Field-based searches
- `metadata_extractions.extractionType` - Type filtering

#### Audit Logs Table
- `audit_logs.userId` - User activity tracking
- `audit_logs.action` - Action-based queries
- `audit_logs.resource` - Resource-based queries
- `audit_logs.resourceId` - Resource instance queries
- `audit_logs.createdAt` - Time-based queries
- `audit_logs.status` - Status filtering
- `audit_logs.level` - Log level filtering

#### User Roles Table
- `user_roles.[userId, roleId]` (UNIQUE WHERE isActive=true) - Role assignments

---

## 🔄 Engine-Database Integration

### Complete Engine-Database Integration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                               SMARTDOCKAI ECOSYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  Frontend (React) ← API Routes ← Controllers ← Services ← Engines ← Database         │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────────────┐
                                 │   PostgreSQL    │
                                 │    Database     │
                                 │  (Port 5432)    │
                                 └─────────┬───────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
            ┌───────▼────────┐    ┌───────▼────────┐    ┌───────▼────────┐
            │     USERS      │    │   DOCUMENTS    │    │  AUDIT_LOGS    │
            │   & ROLES      │    │ & VERSIONS     │    │ & METADATA     │
            └────────────────┘    └───────┬────────┘    └────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
          ┌─────────▼──────┐    ┌────────▼────────┐   ┌────────▼────────┐
          │ METADATA_      │    │ DOCUMENT_       │   │ AUDIT_LOGS      │
          │ EXTRACTIONS    │    │ VERSIONS        │   │                 │
          └────────────────┘    └─────────────────┘   └─────────────────┘
```

### 1. OCR Engine Integration

**Flow**: Document Upload → OCR Processing → Database Update

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   OCR REQUEST   │    │  OCR PROCESSING │    │ DATABASE UPDATE │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • User uploads  │───▶│ • Python OCR    │───▶│ • Document.update│
│   document      │    │   Service       │    │   ocrText       │
│ • Document.create│    │   (Port 8000)   │    │   ocrConfidence │
│   in DB         │    │ • Text extraction│    │   ocrStatus     │
│                 │    │ • Confidence    │    │ • MetadataExtraction│
│                 │    │   scoring       │    │   .create       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Controller**: `OCRController.js`  
**Route**: `/api/ocr/documents/:id/process`

**Database Updates**:
```sql
-- Update document with OCR results
UPDATE documents 
SET ocrText = 'extracted_text_content',
    ocrConfidence = 0.95,
    ocrStatus = 'completed',
    metadata = jsonb_set(metadata, '{ocr}', '{"timestamp": "2025-10-16T10:30:00Z", "language": "eng"}')
WHERE id = document_id;

-- Store detailed OCR metadata
INSERT INTO metadata_extractions (documentId, extractionType, fieldName, fieldValue, confidence)
VALUES (document_id, 'ocr', 'full_text', 'extracted_text_content', 0.95);
```

### 2. ICR Engine Integration

**Flow**: Handwriting Recognition → Field Extraction → Position Mapping

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ICR REQUEST   │    │  ICR PROCESSING │    │ DATABASE UPDATE │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Handwriting   │───▶│ • Python ICR    │───▶│ • MetadataExtraction│
│   recognition   │    │   Service       │    │   extractionType │
│ • Signature     │    │   (Port 8001)   │    │   = 'icr'       │
│   detection     │    │ • Form processing│    │ • fieldName/Value│
│ • Form fields   │    │ • Region analysis│    │ • confidence    │
│                 │    │                 │    │ • position (JSON)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Controller**: `ICRController.js`  
**Route**: `/api/icr/documents/:id/process`

**Database Updates**:
```sql
-- Store handwriting recognition results
INSERT INTO metadata_extractions (documentId, extractionType, fieldName, fieldValue, confidence, position)
VALUES 
  (document_id, 'icr', 'handwriting', 'extracted_handwriting_text', 0.87, 
   '{"x": 100, "y": 200, "width": 300, "height": 50}'),
  (document_id, 'icr', 'signature', 'signature_detected', 0.92,
   '{"x": 400, "y": 500, "width": 150, "height": 75}'),
  (document_id, 'icr', 'form_field_name', 'John Doe', 0.89,
   '{"x": 200, "y": 150, "width": 200, "height": 30}');
```

### 3. NLP Engine Integration

**Flow**: Text Analysis → Entity Extraction → Sentiment Analysis

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NLP REQUEST   │    │  NLP PROCESSING │    │ DATABASE UPDATE │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Text from OCR │───▶│ • Python NLP    │───▶│ • MetadataExtraction│
│ • Sentiment     │    │   Service       │    │   extractionType │
│   analysis      │    │   (Port 8002)   │    │   = 'nlp'       │
│ • Entity        │    │ • Named entities│    │ • Entity results│
│   extraction    │    │ • Sentiment     │    │ • Sentiment scores│
│ • Summarization │    │ • Key phrases   │    │ • Summary text  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Controller**: `NLPController.js`  
**Route**: `/api/nlp/analyze`

**Database Updates**:
```sql
-- Store NLP analysis results
INSERT INTO metadata_extractions (documentId, extractionType, fieldName, fieldValue, confidence)
VALUES 
  (document_id, 'nlp', 'sentiment', '{"score": 0.8, "label": "positive"}', 0.92),
  (document_id, 'nlp', 'entities', '[{"text": "John Doe", "label": "PERSON"}, {"text": "Microsoft", "label": "ORG"}]', 0.95),
  (document_id, 'nlp', 'summary', 'Document summary text...', 0.88),
  (document_id, 'nlp', 'keywords', '["contract", "agreement", "terms"]', 0.90);
```

### 4. Document Intelligence Integration

**Flow**: Document Classification → Template Matching → Intelligent Routing

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ INTELLIGENCE    │    │ AI PROCESSING   │    │ DATABASE UPDATE │
│ REQUEST         │    │                 │    │                 │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Document      │───▶│ • Python Doc    │───▶│ • Document.metadata│
│   classification│    │   Intelligence  │    │   = AI analysis │
│ • Template      │    │   (Port 8004)   │    │ • MetadataExtraction│
│   matching      │    │ • ML models     │    │   extractionType │
│ • Advanced      │    │ • Classification│    │   = 'intelligence'│
│   analysis      │    │ • Routing       │    │ • Structured data│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Controller**: `DocumentIntelligenceController.js`  
**Route**: `/api/intelligence/analyze`

**Database Updates**:
```sql
-- Update document with intelligence analysis
UPDATE documents 
SET metadata = jsonb_set(metadata, '{intelligence}', 
    '{"classification": "invoice", "confidence": 0.93, "template_match": "standard_invoice", "routing": "accounts_payable"}')
WHERE id = document_id;

-- Store detailed intelligence metadata
INSERT INTO metadata_extractions (documentId, extractionType, fieldName, fieldValue, confidence)
VALUES 
  (document_id, 'intelligence', 'classification', 'invoice', 0.93),
  (document_id, 'intelligence', 'template', 'standard_invoice', 0.91),
  (document_id, 'intelligence', 'routing', 'accounts_payable', 0.89);
```

### 5. Model Registry Integration

**Flow**: Model Management → Version Control → Deployment Tracking

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ MODEL REGISTRY  │    │ MODEL MANAGEMENT│    │ DATABASE UPDATE │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Model upload  │───▶│ • Python Model  │───▶│ • AuditLog.create│
│ • Versioning    │    │   Registry      │    │   action = 'model'│
│ • Deployment    │    │   (Port 8003)   │    │ • Model metadata│
│ • Monitoring    │    │ • MLflow        │    │ • Version tracking│
│                 │    │ • MinIO storage │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Controller**: `ModelRegistryController.js`  
**Route**: `/api/models/registry/*`

**Database Updates**:
```sql
-- Log model registry operations
INSERT INTO audit_logs (userId, action, resource, resourceId, details, status)
VALUES 
  (user_id, 'model_upload', 'model_registry', model_id, 
   '{"model_name": "ocr_v2", "version": "1.2.0", "size": "45MB"}', 'success'),
  (user_id, 'model_deploy', 'model_registry', model_id,
   '{"environment": "production", "endpoint": "/api/ocr/v2"}', 'success');
```

---

## 🛡️ Security Features

### Data Protection
- **Cascade Deletes**: Automatic cleanup of related records
- **Soft Deletes**: `isActive` flags for logical deletion
- **Foreign Key Constraints**: Data integrity enforcement
- **Unique Indexes**: Prevent duplicate critical data

### Audit Trail
- **Complete Action Logging**: Every operation tracked
- **IP Address Tracking**: Security monitoring
- **User Agent Logging**: Client identification
- **Timestamp Recording**: Chronological audit trail

### Access Control
- **Role-based Permissions**: Flexible RBAC system
- **User Authentication**: Secure login system
- **Password Security**: Encrypted storage
- **Session Management**: Redis-based sessions

---

## 🔧 Database Operations

### Common Queries

#### User Management
```sql
-- Get user with roles
SELECT u.*, r.name as role_name, r.permissions
FROM users u
JOIN user_roles ur ON u.id = ur.userId
JOIN roles r ON ur.roleId = r.id
WHERE u.id = $1 AND ur.isActive = true;

-- Create new user with role
INSERT INTO users (email, password, firstName, lastName) 
VALUES ($1, $2, $3, $4) RETURNING id;

INSERT INTO user_roles (userId, roleId, assignedBy)
VALUES ($1, $2, $3);
```

#### Document Processing
```sql
-- Get document with all extractions
SELECT d.*, 
       array_agg(me.extractionType) as extraction_types,
       array_agg(me.fieldName) as field_names
FROM documents d
LEFT JOIN metadata_extractions me ON d.id = me.documentId
WHERE d.id = $1
GROUP BY d.id;

-- Search documents by content
SELECT d.* FROM documents d
JOIN metadata_extractions me ON d.id = me.documentId
WHERE me.fieldValue ILIKE '%search_term%'
   OR d.ocrText ILIKE '%search_term%';
```

#### Analytics Queries
```sql
-- Processing statistics
SELECT 
  COUNT(*) as total_documents,
  COUNT(CASE WHEN ocrStatus = 'completed' THEN 1 END) as ocr_completed,
  AVG(ocrConfidence) as avg_confidence
FROM documents;

-- User activity summary
SELECT 
  u.email,
  COUNT(d.id) as documents_uploaded,
  COUNT(al.id) as total_actions
FROM users u
LEFT JOIN documents d ON u.id = d.uploadedBy
LEFT JOIN audit_logs al ON u.id = al.userId
GROUP BY u.id, u.email;
```

### Maintenance Operations

#### Cleanup Procedures
```sql
-- Clean old audit logs (older than 6 months)
DELETE FROM audit_logs 
WHERE createdAt < NOW() - INTERVAL '6 months';

-- Archive completed document versions
UPDATE document_versions 
SET archived = true 
WHERE createdAt < NOW() - INTERVAL '1 year';
```

#### Performance Optimization
```sql
-- Reindex for performance
REINDEX INDEX CONCURRENTLY idx_documents_metadata;
REINDEX INDEX CONCURRENTLY idx_metadata_extractions_document_id;

-- Update table statistics
ANALYZE documents;
ANALYZE metadata_extractions;
ANALYZE audit_logs;
```

---

## 📈 Monitoring & Metrics

### Database Health Checks
```sql
-- Connection count
SELECT count(*) FROM pg_stat_activity;

-- Table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT schemaname, tablename, indexname, 
       idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Performance Metrics
- **Query Performance**: Monitor slow queries
- **Index Usage**: Track index effectiveness
- **Connection Pool**: Monitor connection utilization
- **Storage Growth**: Track database size growth

---

## 🚀 Deployment & Migration

### Migration Management
```bash
# Run migrations
npm run migrate

# Rollback migration
npm run migrate:undo

# Create new migration
npx sequelize-cli migration:generate --name migration-name
```

### Environment Setup
```bash
# Development
NODE_ENV=development npm run migrate

# Production
NODE_ENV=production npm run migrate
```

### Backup Procedures
```bash
# Full database backup
pg_dump -h localhost -U smartdock_user smartdock_db > backup.sql

# Restore database
psql -h localhost -U smartdock_user smartdock_db < backup.sql
```

---

## 📝 Schema Evolution

### Version History
- **v1.0**: Initial schema with users, documents, basic metadata
- **v1.1**: Added audit logging and advanced metadata extractions
- **v1.2**: Enhanced role-based access control
- **v1.3**: Added document versioning and position tracking

### Future Enhancements
- **Workflow Management**: Document approval workflows
- **Advanced Analytics**: Time-series data for processing metrics
- **Multi-tenant Support**: Organization-based data isolation
- **Real-time Notifications**: Event-driven updates

---

## 🔍 Troubleshooting

### Common Issues

#### Connection Problems
```bash
# Check database connectivity
psql -h localhost -U smartdock_user -d smartdock_db

# Verify environment variables
echo $DB_HOST $DB_PORT $DB_NAME
```

#### Performance Issues
```sql
-- Find slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check for locks
SELECT * FROM pg_locks WHERE NOT granted;
```

#### Migration Issues
```bash
# Check migration status
npx sequelize-cli db:migrate:status

# Fix migration conflicts
npx sequelize-cli db:migrate:undo
# Fix conflict and re-run
npx sequelize-cli db:migrate
```

---

## 📚 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Sequelize ORM Guide](https://sequelize.org/docs/)
- [Database Design Best Practices](https://www.postgresql.org/docs/current/ddl-basics.html)
- [Performance Tuning Guide](https://www.postgresql.org/docs/current/performance-tips.html)

---

*Last Updated: October 16, 2025*  
*Version: 1.3*  
*SmartDockAI Database Documentation*