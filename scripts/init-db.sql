-- =====================================================================
-- SmartDocs AI - Relational Schema (PostgreSQL)
-- Notes:
-- - Uses VARCHAR for IDs to match "string" in ERD (adjust to UUID if needed).
-- - Uses TIMESTAMPTZ for datetime fields.
-- - Adds indexes for FKs and common query fields.
-- - Handles cyclic FK (Document.CurrentVersionID -> DocumentVersion) via ALTER.
-- =====================================================================

-- Enable UUID extension and set timezone
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For similarity functions and full-text search
SET timezone = 'UTC';

-- Grant permissions to smartdock_user
GRANT ALL PRIVILEGES ON SCHEMA public TO smartdock_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartdock_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smartdock_user;

-- Enable safe transaction for creating cyclic FKs
BEGIN;

-- =========================
-- Core identity and roles
-- =========================

CREATE TABLE "USER" (
  UserID            VARCHAR(64) PRIMARY KEY,
  Email             VARCHAR(255) NOT NULL UNIQUE,
  Name              VARCHAR(255) NOT NULL,
  PasswordHash      VARCHAR(255) NOT NULL,
  Status            VARCHAR(50)  NOT NULL DEFAULT 'active', -- consider enum or check constraint
  LastLoginAt       TIMESTAMPTZ,
  CreatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UpdatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ROLE (
  RoleID            VARCHAR(64) PRIMARY KEY,
  Name              VARCHAR(100) NOT NULL UNIQUE,
  Description       TEXT,
  CreatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE PERMISSION (
  PermissionID      VARCHAR(64) PRIMARY KEY,
  Name              VARCHAR(100) NOT NULL UNIQUE,
  Description       TEXT
);

CREATE TABLE USER_ROLE (
  UserID            VARCHAR(64) NOT NULL,
  RoleID            VARCHAR(64) NOT NULL,
  AssignedAt        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (UserID, RoleID),
  CONSTRAINT fk_user_role_user
    FOREIGN KEY (UserID) REFERENCES "USER"(UserID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_user_role_role
    FOREIGN KEY (RoleID) REFERENCES ROLE(RoleID)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_user_role_user ON USER_ROLE (UserID);
CREATE INDEX idx_user_role_role ON USER_ROLE (RoleID);

CREATE TABLE ROLE_PERMISSION (
  RoleID            VARCHAR(64) NOT NULL,
  PermissionID      VARCHAR(64) NOT NULL,
  PRIMARY KEY (RoleID, PermissionID),
  CONSTRAINT fk_role_perm_role
    FOREIGN KEY (RoleID) REFERENCES ROLE(RoleID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_role_perm_perm
    FOREIGN KEY (PermissionID) REFERENCES PERMISSION(PermissionID)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_role_perm_role ON ROLE_PERMISSION (RoleID);
CREATE INDEX idx_role_perm_perm ON ROLE_PERMISSION (PermissionID);

CREATE TABLE ACCESS_CONTROL_POLICY (
  PolicyID          VARCHAR(64) PRIMARY KEY,
  Name              VARCHAR(150) NOT NULL,
  Rules             JSONB,  -- structured policy rules (optional: text)
  Description       TEXT,
  Enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  CreatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Document taxonomy & storage
-- =========================

CREATE TABLE DOCUMENT_TYPE (
  TypeID            VARCHAR(64) PRIMARY KEY,
  Name              VARCHAR(100) NOT NULL UNIQUE,
  Description       TEXT,
  TemplateData      JSONB, -- schema/templates for expected fields
  CreatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE STORAGE (
  StorageObjID      VARCHAR(64) PRIMARY KEY,
  StorageType       VARCHAR(50) NOT NULL, -- e.g., S3, Blob, OBS
  ObjectURI         TEXT NOT NULL,
  Checksum          VARCHAR(128),
  CreatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- Documents & versions
-- =========================

CREATE TABLE DOCUMENT (
  DocumentID        VARCHAR(64) PRIMARY KEY,
  OriginalFileName  VARCHAR(255) NOT NULL,
  Status            VARCHAR(50) NOT NULL DEFAULT 'uploaded', -- consider enum/check
  DocumentTypeID    VARCHAR(64) NOT NULL,
  UploadedByUserID  VARCHAR(64) NOT NULL,
  StorageObjID      VARCHAR(64),  -- optional until stored
  UploadedAt        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CurrentVersionID  VARCHAR(64),  -- FK added after DOCUMENT_VERSION exists
  CONSTRAINT fk_doc_type
    FOREIGN KEY (DocumentTypeID) REFERENCES DOCUMENT_TYPE(TypeID)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_doc_uploader
    FOREIGN KEY (UploadedByUserID) REFERENCES "USER"(UserID)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_doc_storage
    FOREIGN KEY (StorageObjID) REFERENCES STORAGE(StorageObjID)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_document_type ON DOCUMENT (DocumentTypeID);
CREATE INDEX idx_document_uploader ON DOCUMENT (UploadedByUserID);
CREATE INDEX idx_document_status ON DOCUMENT (Status);

CREATE TABLE DOCUMENT_VERSION (
  VersionID         VARCHAR(64) PRIMARY KEY,
  DocumentID        VARCHAR(64) NOT NULL,
  VersionNumber     INT NOT NULL,
  CreatedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CreatedByUserID   VARCHAR(64) NOT NULL,
  FilePath          TEXT NOT NULL,
  Hash              VARCHAR(128),
  ChangeDescription TEXT,
  DerivedFromVersionID VARCHAR(64),
  CONSTRAINT fk_docver_doc
    FOREIGN KEY (DocumentID) REFERENCES DOCUMENT(DocumentID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_docver_creator
    FOREIGN KEY (CreatedByUserID) REFERENCES "USER"(UserID)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_docver_derived
    FOREIGN KEY (DerivedFromVersionID) REFERENCES DOCUMENT_VERSION(VersionID)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX uq_docver_version ON DOCUMENT_VERSION (DocumentID, VersionNumber);
CREATE INDEX idx_docver_doc ON DOCUMENT_VERSION (DocumentID);
CREATE INDEX idx_docver_creator ON DOCUMENT_VERSION (CreatedByUserID);

-- Add cyclic FK after both tables exist
ALTER TABLE DOCUMENT
  ADD CONSTRAINT fk_doc_current_version
  FOREIGN KEY (CurrentVersionID) REFERENCES DOCUMENT_VERSION(VersionID)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX idx_document_current_version ON DOCUMENT (CurrentVersionID);

-- =========================
-- Pipelines & execution
-- =========================

CREATE TABLE PROCESSING_PIPELINE (
  PipelineID        VARCHAR(64) PRIMARY KEY,
  Name              VARCHAR(150) NOT NULL,
  Steps             JSONB, -- optional high-level spec; details in PIPELINE_STEP
  IsActive          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE PIPELINE_STEP (
  StepID            VARCHAR(64) PRIMARY KEY,
  PipelineID        VARCHAR(64) NOT NULL,
  StepOrder         INT NOT NULL,
  ActionType        VARCHAR(100) NOT NULL, -- e.g., PREPROCESS, OCR, ICR, NLP, VALIDATE
  Config            JSONB, -- engine/configuration
  CONSTRAINT fk_step_pipeline
    FOREIGN KEY (PipelineID) REFERENCES PROCESSING_PIPELINE(PipelineID)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX uq_step_order ON PIPELINE_STEP (PipelineID, StepOrder);
CREATE INDEX idx_step_pipeline ON PIPELINE_STEP (PipelineID);

CREATE TABLE PIPELINE_INSTANCE (
  InstanceID        VARCHAR(64) PRIMARY KEY,
  DocumentID        VARCHAR(64) NOT NULL,
  PipelineID        VARCHAR(64) NOT NULL,
  Status            VARCHAR(50) NOT NULL DEFAULT 'running', -- running/succeeded/failed
  StartedAt         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FinishedAt        TIMESTAMPTZ,
  RunByUserID       VARCHAR(64),
  CONSTRAINT fk_inst_doc
    FOREIGN KEY (DocumentID) REFERENCES DOCUMENT(DocumentID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_inst_pipeline
    FOREIGN KEY (PipelineID) REFERENCES PROCESSING_PIPELINE(PipelineID)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_inst_runner
    FOREIGN KEY (RunByUserID) REFERENCES "USER"(UserID)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_inst_doc ON PIPELINE_INSTANCE (DocumentID);
CREATE INDEX idx_inst_pipeline ON PIPELINE_INSTANCE (PipelineID);
CREATE INDEX idx_inst_status ON PIPELINE_INSTANCE (Status);

-- =========================
-- OCR/ICR & Metadata extraction
-- =========================

CREATE TABLE OCR_ICR_PROCESSING (
  TaskID            VARCHAR(64) PRIMARY KEY,
  DocumentVersionID VARCHAR(64) NOT NULL,
  EngineUsed        VARCHAR(100) NOT NULL, -- e.g., Tesseract, TrOCR, Donut
  ConfidenceScore   DOUBLE PRECISION,
  Status            VARCHAR(50) NOT NULL DEFAULT 'completed', -- queued/running/completed/failed
  OutputText        TEXT,
  StartAt           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  EndAt             TIMESTAMPTZ,
  CONSTRAINT fk_ocr_docver
    FOREIGN KEY (DocumentVersionID) REFERENCES DOCUMENT_VERSION(VersionID)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_ocr_docver ON OCR_ICR_PROCESSING (DocumentVersionID);
CREATE INDEX idx_ocr_status ON OCR_ICR_PROCESSING (Status);

CREATE TABLE METADATA_EXTRACTION (
  ExtractionID      VARCHAR(64) PRIMARY KEY,
  DocumentVersionID VARCHAR(64) NOT NULL,
  FieldName         VARCHAR(150) NOT NULL,
  FieldValue        TEXT,
  Confidence        DOUBLE PRECISION,
  ExtractedAt       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ExtractionTaskID  VARCHAR(64),
  CONSTRAINT fk_meta_docver
    FOREIGN KEY (DocumentVersionID) REFERENCES DOCUMENT_VERSION(VersionID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_meta_task
    FOREIGN KEY (ExtractionTaskID) REFERENCES OCR_ICR_PROCESSING(TaskID)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_meta_docver ON METADATA_EXTRACTION (DocumentVersionID);
CREATE INDEX idx_meta_field ON METADATA_EXTRACTION (FieldName);

-- =========================
-- Auditing
-- =========================

CREATE TABLE AUDIT_LOG (
  LogID             VARCHAR(64) PRIMARY KEY,
  UserID            VARCHAR(64),
  EntityType        VARCHAR(100) NOT NULL, -- e.g., DOCUMENT, USER, POLICY
  EntityID          VARCHAR(64) NOT NULL,
  ActionType        VARCHAR(100) NOT NULL, -- e.g., CREATE, UPDATE, DELETE, APPROVE
  Detail            TEXT,
  EventTime         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  IPAddress         INET, -- optional
  PreviousValue     JSONB,
  NewValue          JSONB,
  CONSTRAINT fk_audit_user
    FOREIGN KEY (UserID) REFERENCES "USER"(UserID)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_audit_entity ON AUDIT_LOG (EntityType, EntityID);
CREATE INDEX idx_audit_user ON AUDIT_LOG (UserID);
CREATE INDEX idx_audit_time ON AUDIT_LOG (EventTime);

-- =========================
-- Seed Data
-- =========================

-- Insert default roles
INSERT INTO ROLE (RoleID, Name, Description) VALUES 
    ('role_admin', 'admin', 'Administrator with full system access'),
    ('role_user', 'user', 'Regular user with basic access'),
    ('role_moderator', 'moderator', 'Moderator with elevated permissions')
ON CONFLICT (Name) DO NOTHING;

-- Insert default permissions
INSERT INTO PERMISSION (PermissionID, Name, Description) VALUES
    ('perm_doc_create', 'document:create', 'Create new documents'),
    ('perm_doc_read', 'document:read', 'Read documents'),
    ('perm_doc_update', 'document:update', 'Update documents'),
    ('perm_doc_delete', 'document:delete', 'Delete documents'),
    ('perm_user_manage', 'user:manage', 'Manage users'),
    ('perm_system_admin', 'system:admin', 'System administration'),
    ('perm_ocr_process', 'ocr:process', 'Process OCR tasks'),
    ('perm_pipeline_manage', 'pipeline:manage', 'Manage processing pipelines')
ON CONFLICT (Name) DO NOTHING;

-- Assign permissions to roles
INSERT INTO ROLE_PERMISSION (RoleID, PermissionID) VALUES
    -- Admin gets all permissions
    ('role_admin', 'perm_doc_create'),
    ('role_admin', 'perm_doc_read'),
    ('role_admin', 'perm_doc_update'),
    ('role_admin', 'perm_doc_delete'),
    ('role_admin', 'perm_user_manage'),
    ('role_admin', 'perm_system_admin'),
    ('role_admin', 'perm_ocr_process'),
    ('role_admin', 'perm_pipeline_manage'),
    -- Moderator gets document and OCR permissions
    ('role_moderator', 'perm_doc_create'),
    ('role_moderator', 'perm_doc_read'),
    ('role_moderator', 'perm_doc_update'),
    ('role_moderator', 'perm_doc_delete'),
    ('role_moderator', 'perm_ocr_process'),
    -- User gets basic document permissions
    ('role_user', 'perm_doc_create'),
    ('role_user', 'perm_doc_read'),
    ('role_user', 'perm_doc_update')
ON CONFLICT DO NOTHING;

-- Insert default document types
INSERT INTO DOCUMENT_TYPE (TypeID, Name, Description, TemplateData) VALUES
    ('type_pdf', 'PDF Document', 'Portable Document Format files', '{"expectedFields": ["title", "author", "pages"]}'),
    ('type_invoice', 'Invoice', 'Financial invoice documents', '{"expectedFields": ["invoiceNumber", "amount", "date", "vendor"]}'),
    ('type_contract', 'Contract', 'Legal contract documents', '{"expectedFields": ["parties", "effectiveDate", "expirationDate"]}'),
    ('type_identity', 'Identity Document', 'ID cards, passports, drivers licenses', '{"expectedFields": ["name", "documentNumber", "expirationDate"]}'),
    ('type_image', 'Image', 'Image files for OCR processing', '{"expectedFields": ["text", "language"]}')
ON CONFLICT (Name) DO NOTHING;

-- Insert default processing pipeline
INSERT INTO PROCESSING_PIPELINE (PipelineID, Name, Steps) VALUES
    ('pipeline_default', 'Default Document Processing', '{"steps": ["preprocess", "ocr", "metadata_extraction", "validation"]}'),
    ('pipeline_invoice', 'Invoice Processing Pipeline', '{"steps": ["preprocess", "ocr", "invoice_fields", "validation"]}'),
    ('pipeline_identity', 'Identity Document Pipeline', '{"steps": ["preprocess", "ocr", "identity_fields", "validation"]}')
ON CONFLICT (Name) DO NOTHING;

-- Grant permissions on all tables to smartdock_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartdock_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smartdock_user;

-- =========================
-- Done
-- =========================

COMMIT;

-- Success message
SELECT 'SmartDockAI database with comprehensive schema initialized successfully!' as message;