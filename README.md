# SmartDockAI

SmartDockAI is a document management system built with Node.js and Express. Users upload documents, the files are stored in MinIO, text is extracted with OCR (Tesseract), and documents can be searched with PostgreSQL full-text search. A React web client and optional Python AI services (OCR, handwriting recognition, NLP, document intelligence and a model registry) extend the core API.

## Table of Contents

- [Overview](#overview)
- [Project Status](#project-status)
- [How It Works](#how-it-works)
- [Components](#components)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Testing](#testing)
- [Security](#security)
- [Known Issues](#known-issues)
- [License](#license)

## Overview

### Purpose

Organisations keep many scanned papers, invoices, contracts and ID documents as images or PDFs. The text inside these files cannot be searched. SmartDockAI stores such files in one place, runs OCR on them in background jobs, extracts simple metadata (for example dates, amounts and email addresses) and offers a search API over document titles, descriptions and extracted text.

### Intended users

- Teams that need a central place to upload and find documents.
- Administrators who manage users, roles and system health.
- Developers who want to experiment with OCR, handwriting recognition and NLP on documents.

## Project Status

This is a development project. The core API works for authentication and document storage. Several parts are incomplete or not connected end to end. See [Known Issues](#known-issues) for details.

| Component | Status | Notes |
|---|---|---|
| Authentication (register, login, refresh, profile) | Working | JWT access and refresh tokens, bcrypt password hashing |
| Document upload, list, download, update, delete | Working | Files stored in MinIO, records in PostgreSQL via Sequelize |
| OCR job queue | Partial | Jobs run through Bull and Redis; the result is not written back to the document record |
| Full-text search | Partial | SQL is written; it reads a table that the Sequelize migrations do not create |
| Admin API | Partial | Routes exist; the role check may reject admin users (see Known Issues) |
| React web client (`client/`) | Working (dev) | Vite + React + Tailwind; pages for documents, OCR, ICR, NLP, search, intelligence and admin |
| Python services (OCR, ICR, NLP, intelligence, model registry) | Experimental | FastAPI services; heavy ML dependencies are optional |
| Separate worker process (`npm run worker`) | Missing | `src/worker.js` is referenced but does not exist |
| Automated tests | Missing | Jest is configured but there is no `tests/` folder |

## How It Works

### Architecture

```
+------------------+        +-----------------------------+
|  React client    |  /api  |  Express API (src/app.js)   |
|  (Vite, :5173)   +------->+  auth, documents, ocr,      |
+------------------+  proxy |  search, admin, icr, nlp,   |
                            |  intelligence, models       |
                            +--+-------+-------+-------+--+
                               |       |       |       |
                     +---------+  +----+---+  +--+----+ +-----------------+
                     |PostgreSQL| | MinIO  |  | Redis | | Python services |
                     |Sequelize | | files  |  | Bull  | | OCR      :8000  |
                     |full-text | |        |  | queues| | ICR      :8001  |
                     +----------+ +--------+  +-------+ | NLP      :8002  |
                                                        | Registry :8003  |
                                                        | Intell.  :8004  |
                                                        +-----------------+
```

### Document flow

1. **Upload.** The client sends a file to `POST /api/documents/upload` (multipart). The API checks file type and size, stores the file in the MinIO bucket and creates a `documents` row with `ocrStatus` and a storage key.
2. **Queue.** The client starts OCR with `POST /api/ocr/documents/:documentId/process`. The API adds a `process-ocr` job to the Bull queue in Redis and returns `202` with a job id. Upload does not start OCR automatically.
3. **OCR.** The queue processor (registered inside the API process by `QueueService`) downloads the file from MinIO, preprocesses it with Sharp and runs Tesseract.js. It then extracts simple metadata from the text. `EnhancedOCRService` can call the Python OCR service first and fall back to Tesseract.js.
4. **Result.** The job result (text, confidence, metadata) is stored as the Bull job result. Clients read it with `GET /api/ocr/jobs/:jobId/status`. The current code does not save the text into the database.
5. **Search.** `GET /api/search/documents` uses PostgreSQL `to_tsvector`, `plainto_tsquery`, `ts_rank` and `ts_headline` over document titles, descriptions and OCR text. `GET /api/documents?search=` uses a simpler `ILIKE` filter.

A pipeline endpoint (`POST /api/ocr/documents/:documentId/pipeline`) runs OCR plus validation steps for four built-in pipelines: default, invoice, identity document and contract.

## Components

### Backend API (`src/`)

- `server.js` starts the HTTP server. In development it also runs Sequelize migrations and seeders.
- `app.js` sets up Helmet, CORS, Morgan, JSON parsing, the health endpoint, Swagger UI at `/api-docs` and all route groups.
- `controllers/` hold the request logic for each route group.
- `services/` hold storage (MinIO), queue (Bull), OCR (Tesseract.js, Sharp), search (SQL), auth (JWT), the processing pipelines and HTTP clients for the Python services.
- `middleware/auth.js` provides `authenticate`, `authorize`, `requireRole`, `requireAdmin` and ownership checks.
- `ServiceOrchestrator` can start the client and the Python services as child processes when `START_ALL_SERVICES=true` (`npm run dev:all`).

### Web client (`client/`)

React 18 single-page app with React Router, Axios and Tailwind CSS. It has login and registration, a dashboard, document upload and details, OCR, ICR, NLP, search and document intelligence pages, and an admin area (dashboard, user management, system monitoring). In development Vite runs on port 5173 and proxies `/api` and `/health` to port 3000. In production the API serves `client/dist`.

### Python services

Each folder is a FastAPI app with its own `Dockerfile`, `requirements.txt` and README:

| Folder | Port | Purpose |
|---|---|---|
| `python-ocr-service/` | 8000 | OCR with pytesseract and OpenCV preprocessing, training data collection |
| `python-icr-service/` | 8001 | Handwriting recognition (TrOCR); heavy ML packages in `requirements.heavy.txt` |
| `python-nlp-service/` | 8002 | Sentiment, entities, keywords, summaries, language detection, classification |
| `model-registry-service/` | 8003 | Model upload, deployment, metrics and comparison |
| `python-document-intelligence-service/` | 8004 | Classification, entity extraction, template matching, validation, routing |

The Node.js API reaches them over HTTP through the `src/services/Python*Integration.js` and `ModelRegistryIntegration.js` clients.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js, Express 5 | HTTP API |
| Sequelize 6, pg | PostgreSQL ORM, migrations and seeders |
| PostgreSQL 15 (`pg_trgm`) | Data storage, full-text search, similarity |
| MinIO | S3-compatible object storage for files |
| Redis, Bull, ioredis | Background job queues |
| Tesseract.js, Sharp | OCR and image preprocessing |
| jsonwebtoken, bcryptjs | Authentication and password hashing |
| Multer | Multipart file uploads |
| Helmet, cors, Morgan | HTTP security headers, CORS, request logging |
| swagger-jsdoc, swagger-ui-express | API documentation |
| React 18, Vite 5, Tailwind CSS 4 | Web client |
| Python, FastAPI, uvicorn | AI microservices |
| Jest, Supertest, ESLint, Prettier | Test and code quality tooling (configured) |
| Docker, Docker Compose | Local infrastructure |

## Project Structure

```
SmartDockAI/
|-- src/
|   |-- server.js              # Entry point
|   |-- app.js                 # Express app and route mounting
|   |-- controllers/           # Auth, Document, OCR, ICR, NLP, Search, Admin, ...
|   |-- middleware/auth.js     # JWT and role checks
|   |-- models/                # User, Role, UserRole, Document, DocumentVersion, ...
|   |-- migrations/            # Sequelize migrations
|   |-- seeders/               # Default roles
|   |-- routes/                # One file per route group
|   `-- services/              # Storage, Queue, OCR, Search, Auth, Python clients
|-- config/                    # App and Sequelize configuration
|-- client/                    # React + Vite web client
|-- docs/                      # Swagger setup, Postman collection, DATABASE.md
|-- scripts/                   # seed, reset, clean, init-db.sql, integration tests
|-- python-ocr-service/
|-- python-icr-service/
|-- python-nlp-service/
|-- python-document-intelligence-service/
|-- model-registry-service/
|-- docker-compose.yml         # Postgres, MinIO, Redis, app, worker, Python services
|-- docker-compose.dev.yml     # Hot-reload overrides for the app
|-- docker-compose.model-registry.yml
|-- Dockerfile                 # development and production targets
|-- eng.traineddata            # Tesseract English language data
`-- package.json
```

## Getting Started

### Prerequisites

- Node.js 18 or later and npm
- Docker and Docker Compose (for PostgreSQL, Redis and MinIO)
- Python 3.11 (only if you run the Python services outside Docker)

### 1. Clone and install

```bash
git clone https://github.com/ahmadkobah/SmartDockAI-public.git
cd SmartDockAI-public
npm install
npm --prefix client install
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` and set your own database, MinIO, Redis and JWT values. `docker-compose.yml` reads
`POSTGRES_USER`, `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` and `JWT_SECRET`
from this file, so set them before you start Docker. See [Configuration](#configuration).

### 3. Start the infrastructure

Start Redis, PostgreSQL and MinIO:

```bash
docker-compose up -d redis postgres minio
```

`docker-compose up -d` without service names also builds the app, the worker and all Python services. The `worker` service needs `src/worker.js`, which is missing, so start only the infrastructure services for local development.

### 4. Prepare the database

In development (`NODE_ENV=development`) the server runs the Sequelize migrations and seeders on start. To create sample data by hand:

```bash
npm run seed      # sample roles plus sample admin and user accounts
npm run setup     # reset the database, then seed
```

The seed script creates sample admin and user accounts. See `scripts/seed-database.js` for the details. Change these accounts before any shared use.

### 5. Run

```bash
npm run dev       # API on http://localhost:3000 (nodemon)
npm run client    # web client on http://localhost:5173
npm run dev:full  # both together
```

OCR jobs are processed inside the API process. `npm run worker` is defined in `package.json` but fails because `src/worker.js` does not exist.

Useful URLs:

- Health check: `http://localhost:3000/health`
- API index: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api-docs`

### Other scripts

| Script | Purpose |
|---|---|
| `npm start` | Start the API with Node |
| `npm run dev:all` | Start the API and let it launch the client and Python services |
| `npm run build:client` | Build the client into `client/dist` |
| `npm run reset` | Reset the database |
| `npm run test:integration` | Run `scripts/test-integration.js` against a running server |
| `npm run test:quick` | Run `scripts/quick-test.js` |
| `npm run lint`, `npm run format` | ESLint and Prettier |

## Configuration

All settings come from environment variables. `.env.example` lists them. Only names are shown here.

| Group | Variables |
|---|---|
| Application | `NODE_ENV`, `PORT`, `APP_NAME`, `APP_VERSION`, `START_ALL_SERVICES` |
| Database | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL`, `DB_POOL_MIN`, `DB_POOL_MAX` |
| MinIO | `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_USE_SSL` |
| Redis | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` |
| JWT | `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` |
| API limits | `API_RATE_LIMIT_WINDOW_MS`, `API_RATE_LIMIT_MAX_REQUESTS`, `API_REQUEST_SIZE_LIMIT` |
| Uploads | `MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `UPLOAD_PATH` |
| OCR | `TESSERACT_PATH`, `OCR_LANGUAGES`, `OCR_TIMEOUT`, `OCR_TRAINING_MODE` |
| Logging | `LOG_LEVEL`, `LOG_FILE`, `LOG_MAX_SIZE`, `LOG_MAX_FILES` |
| Security | `BCRYPT_ROUNDS`, `SESSION_SECRET`, `CORS_ORIGIN` |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` |
| Debug | `DEBUG_MODE`, `ENABLE_API_DOCS`, `ENABLE_METRICS` |
| Python services | `PYTHON_OCR_URL`, `PYTHON_ICR_URL`, `NLP_SERVICE_URL`, `PYTHON_INTELLIGENCE_URL`, `MODEL_REGISTRY_URL` |

## API Reference

All routes except `/health`, `/api`, `/api/services/*`, register, login and refresh need an `Authorization: Bearer <token>` header. A Postman collection is in `docs/SmartDockAI-API.postman_collection.json`.

### System

| Method | Path | Description |
|---|---|---|
| GET | `/health` | API and database health, running child services |
| GET | `/api` | List of route groups |
| POST | `/api/services/start-all`, `/api/services/stop-all` | Start or stop child services |
| GET | `/api/services/status` | Status of child services |

### Auth (`/api/auth`)

| Method | Path | Description |
|---|---|---|
| POST | `/register`, `/login`, `/refresh`, `/logout` | Account and token handling |
| GET, PUT | `/profile` | Read or update own profile |
| PUT | `/change-password` | Change own password |

### Documents (`/api/documents`)

| Method | Path | Description |
|---|---|---|
| POST | `/upload`, `/upload-multiple` | Upload one or several files |
| GET | `/` | List own documents (paging, `search` filter) |
| GET | `/:id`, `/:id/download` | Document details or file download |
| PUT, DELETE | `/:id` | Update or delete a document |
| GET, DELETE | `/admin/all`, `/admin/:id` | Admin list and delete |

### OCR (`/api/ocr`)

| Method | Path | Description |
|---|---|---|
| POST | `/documents/:documentId/process` | Queue an OCR job |
| POST | `/documents/:documentId/pipeline` | Run a processing pipeline |
| GET | `/jobs`, `/jobs/:jobId/status` | List jobs or read one job |
| POST, DELETE | `/jobs/:jobId/retry`, `/jobs/:jobId/cancel` | Retry or cancel a job |
| GET | `/pipelines`, `/pipelines/:pipelineId` | Pipeline list and configuration |
| GET, POST | `/admin/statistics`, `/admin/clean-jobs` | Queue statistics and cleanup |

### Search (`/api/search`)

| Method | Path | Description |
|---|---|---|
| GET | `/documents` | Full-text search |
| POST | `/advanced` | Search with filters |
| GET | `/similar/:documentId` | Similar documents (trigram similarity) |
| GET | `/suggestions`, `/analytics` | Query suggestions and search statistics |

### Admin (`/api/admin`, admin role)

`GET /statistics`, `GET /users`, `PUT /users/:userId/status`, `PUT /users/:userId/roles`, `GET /documents`, `DELETE /documents/:documentId`, `GET /health`, `GET /services/health`, `GET /audit-logs`, `GET /analytics/dashboard`, `GET|PUT /config`, `GET /roles`, `GET /performance`.

### AI services

| Prefix | Main routes |
|---|---|
| `/api/icr` | `/documents/:documentId/process`, `/upload`, `/analyze/handwriting`, `/signatures/detect`, `/forms/process`, `/forms/templates`, `/batch`, `/capabilities`, `/health` |
| `/api/nlp` | `/analyze/sentiment`, `/entities`, `/keywords`, `/summarize`, `/language`, `/classify`, `/similarity`, `/batch`, `/document`, `/process-document`, `/models`, `/info`, `/health` |
| `/api/intelligence` | `/analyze`, `/upload`, `/classify`, `/extract`, `/templates/match`, `/validate`, `/route`, `/analytics`, `/health` |
| `/api/models/registry` | `/models`, `/models/:modelId`, `/models/upload`, `/models/:modelId/deploy`, `/models/compare`, `/metrics`, `/recommendations`, `/services/:serviceName/models` |

These routes forward to the Python services and fail if those services are not running.

## Data Model

The Sequelize migrations in `src/migrations/` create these tables:

| Table | Main columns |
|---|---|
| `users` | email, hashed password, first and last name, active flag, last login, password reset fields |
| `roles` | name, description, `permissions` (JSON list) |
| `user_roles` | user, role, active flag, assigned date |
| `documents` | filename, original name, MIME type, size, uploader, storage key, bucket, checksum, `ocrStatus`, `ocrText`, `ocrConfidence`, `metadata` (JSONB), `tags`, public flag, download count |
| `document_versions` | document, version number, storage key, size, checksum, changes, creator |
| `metadata_extractions` | document, extraction type, field name and value, confidence, position, verified flag |
| `audit_logs` | user, action, resource, details, IP address, user agent, status, level |

The default roles seeder adds `admin`, `user`, `moderator` and `viewer`. A second, different schema is in `scripts/init-db.sql` (tables such as `DOCUMENT`, `DOCUMENT_VERSION`, `OCR_ICR_PROCESSING`, `PROCESSING_PIPELINE`). Docker Compose runs it when the PostgreSQL volume is first created. `docs/DATABASE.md` describes that schema.

## Testing

There are no automated unit or API tests in the repository. `jest.config.json` expects a `tests/` folder and `tests/setup.js`, which do not exist, so `npm test` does not run any tests.

Two manual scripts exist and need a running server:

```bash
npm run test:integration
npm run test:quick
```

## Security

- Passwords are hashed with bcrypt. Access and refresh tokens are signed JWTs.
- Helmet sets security headers with a Content Security Policy.
- Most routes require authentication. Users only see their own documents unless they are admins.
- Actions are recorded in `audit_logs`.

Before any shared or public deployment:

- Set strong, unique values for `JWT_SECRET`, `SESSION_SECRET`, the database, MinIO and Redis. The code has a built-in fallback for `JWT_SECRET`. `docker-compose.yml` reads the PostgreSQL, MinIO and JWT credentials from your `.env` file (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `JWT_SECRET`).
- Change or remove the sample accounts created by the seed script.
- Restrict CORS. `app.use(cors())` currently allows all origins.
- Protect `/api/services/start-all` and `/api/services/stop-all`. They have no authentication.

## Known Issues

- `src/worker.js` is missing. `npm run worker` and the `worker` service in `docker-compose.yml` cannot start.
- `npm run all` and `START-SERVICES.md` refer to `start-all.js`, `start-all.bat` and `start-all.ps1`, which are not in the repository. `START-SERVICES.md` also lists Python ports 8001 to 8005, which differ from the ports in the code (8000 to 8004).
- OCR job results are not saved to the `documents` table, so `ocrText` and `ocrStatus` are not updated by the queue.
- `SearchService` reads an `ocr_icr_processing` table. That table only exists if `scripts/init-db.sql` was run; the Sequelize migrations do not create it.
- The admin routes call `authorize(['admin'])`, but `authorize` checks a single permission string against the role's permission list. Admin requests may get `403`.
- The NLP client reads `NLP_SERVICE_URL`, while `docker-compose.yml` sets `PYTHON_NLP_URL`.
- `/api` lists a `/api/users` group, but no such route is mounted.
- The repository contains Python `__pycache__` files and a pasted chat log in `PostmanCodes`; neither is needed to run the project.

## License

MIT (as declared in `package.json`). There is no separate `LICENSE` file.

Author: Ahmad Kobah
