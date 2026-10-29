# RegulaTrack — Compliance Intelligence & Operations Platform

> **Legal Disclaimer:** RegulaTrack is an operational compliance management system, not a law firm. It does not provide legal advice, guarantee legal compliance, or replace certified legal counsel and regulatory specialists. All regulatory data bundled for demonstration purposes is labeled `[DEMO SAMPLE]`.

---

## 1. Executive Summary

**RegulaTrack** is an enterprise-grade full-stack compliance intelligence and operations platform designed for small businesses, mid-market organizations, and compliance consultants. It eliminates manual spreadsheet tracking by maintaining structured operational baselines, deterministically matching applicable statutory regulations, tracking regulatory revisions with unified text diffing, securing compliance evidence with cryptographic SHA-256 checksums, and orchestrating deadline-driven workflows with strict role-based access control.

---

## 2. System Architecture

RegulaTrack is engineered as a clean, decoupled monorepo:

```
regulatrack/
├── backend/                  # Django REST Framework enterprise backend
│   ├── apps/
│   │   ├── accounts/         # Custom UUID User, profiles, JWT auth
│   │   ├── organizations/    # Multi-tenant organization entities
│   │   ├── businesses/       # Business profile, completeness, RBAC helpers
│   │   ├── regulations/      # Requirements library, deterministic applicability engine
│   │   ├── monitoring/       # Official source polling, text diff engine, simulation adapter
│   │   ├── tasks/            # Compliance tasks, checklists, team comments
│   │   ├── compliance/       # Statutory deadlines, renewals, calendar, metrics scoring
│   │   ├── documents/        # Secure vault, SHA-256 verification, private streaming
│   │   ├── notifications/    # In-app notifications & user preferences
│   │   ├── audit/            # Immutable audit trail & event logger
│   │   └── reports/          # CSV & JSON auditor-ready export center
│   ├── config/               # Django settings, URLs, Celery configuration
│   ├── tests/                # Pytest integration & isolation test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # React 18 + TypeScript + Vite modern SPA
│   ├── src/
│   │   ├── api/              # Typed REST client with auto JWT refresh interceptors
│   │   ├── components/       # Layouts (Navbar, Sidebar), UI kit (Badge, Card, Modal, EmptyState)
│   │   ├── contexts/         # AuthContext & WorkspaceContext state providers
│   │   ├── pages/            # 16 complete views covering all user workflows
│   │   ├── types/            # TypeScript domain interfaces matching DRF serializers
│   │   └── test/             # Vitest & React Testing Library test suite
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml        # PostgreSQL 16, Redis 7, Backend, Celery, Frontend
├── .env.example              # Sample environment configuration
└── PROJECT_STATUS.md         # Full project implementation & verification log
```

---

## 3. Core Modules & Capabilities

### Deterministic Applicability Engine
- Evaluates four enterprise criteria:
  1. **Jurisdiction Matching** (Country, state/province, operating locations)
  2. **Industry Sector Classification** (NAICS categories)
  3. **Employee Count Thresholds** (e.g. OSHA $\ge 10$, FMLA $\ge 50$, EEO-1 $\ge 100$)
  4. **Operational Triggers** (Hazardous chemicals, remote workforce, CCPA data processing, food handling)
- Generates transparent, human-readable match explanations (e.g. *"Matched based on chemical_storage activity"*) without opaque black-box scoring.

### Official Source Monitoring & Text Diff Engine
- Periodically scans official regulatory source feeds (OSHA, EPA, FTC, FDA, State Agencies).
- Utilizes Python `difflib` unified comparison to detect regulatory modifications.
- Frontend diff viewer visually highlights added (`+`) and removed (`-`) statutory clauses.
- Formal review workflow: compliance managers can accept or dismiss changes with logged notes.

### Secure Document & Evidence Vault
- Enforces strict file validation (allowed extensions: PDF, PNG, JPG, DOCX, XLSX, TXT; max size 25MB).
- Computes SHA-256 cryptographic hashes upon upload for data integrity.
- Files are stored in private local media and served via authenticated streaming endpoints.
- Tracks expiration windows with visual warning badges (e.g. expiring within 30 days, expired).

### Role-Based Access Control (RBAC) & Consultant Isolation
- Custom Django User model (`apps.accounts.User`) with UUID primary keys.
- Granular permission matrix:
  - **Platform Administrator:** Global source library management & system ingestion triggers.
  - **Business Owner:** Full workspace management, member invitations, profile editing.
  - **Compliance Manager:** Task assignments, requirement reviews, document uploads, reports.
  - **Employee:** View assigned obligations, complete checklists, submit evidence.
  - **Consultant:** Explicitly scoped client workspace access; strict isolation from other organizations.

### Auditor-Ready Report Export Center
- Supports instant streaming exports in both CSV and structured JSON formats:
  - **Applicable Regulatory Register**
  - **Statutory Deadlines & Filing Schedule**
  - **Internal Task Completion Audit**
  - **Document Expiration & Vault Status**

---

## 4. Pre-Seeded Demonstration Accounts

All demo accounts share the password: `Password123!`

| Role | Email Address | Access Scope |
| :--- | :--- | :--- |
| **Business Owner** | `owner@example.com` | Apex Industrial Technologies (Owner) |
| **Compliance Manager** | `manager@example.com` | Apex Industrial Technologies (Manager) |
| **Employee** | `employee@example.com` | Apex Industrial Technologies (Employee) |
| **Consultant** | `consultant@example.com` | Apex Industrial Technologies (Scoped Consultant) |
| **Platform Admin** | `admin@regulatrack.local` | Platform-wide source monitoring & library |

> **Quick Login:** The login screen (`/login`) includes one-click demo credentials buttons for instant evaluation.

---

## 5. Local Setup & Installation

### Option A: Native Development Environment

#### 1. Backend Setup
```bash
# Clone or navigate to the project root
cd "python django project"

# Activate the virtual environment
.\venv\Scripts\activate   # Windows
# or: source venv/bin/activate # Linux/macOS

# Install dependencies
pip install -r backend/requirements.txt

# Run migrations
python backend/manage.py migrate

# Seed demonstration data
python backend/manage.py seed_demo_data

# Start Django development server
python backend/manage.py runserver 127.0.0.1:8000
```

#### 2. Frontend Setup
```bash
# In a new terminal, navigate to frontend
cd frontend

# Install dependencies (already installed)
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` in your browser. The Vite server proxies `/api` and `/media` requests directly to `http://127.0.0.1:8000`.

---

### Option B: Docker Compose

```bash
# Start all services (PostgreSQL 16, Redis 7, Django, Celery, Vite)
docker-compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000/api/v1/`
- Swagger UI Documentation: `http://localhost:8000/api/v1/schema/swagger-ui/`

---

## 6. Automated Test Suites

### Backend Test Suite (Pytest)
```bash
.\venv\Scripts\pytest backend/tests/ -v
```
**Results:** 9 passed in 13.07s
- `test_user_registration_and_login` (PASSED)
- `test_workspace_creation_assigns_owner` (PASSED)
- `test_cross_workspace_isolation` (PASSED)
- `test_applicability_evaluation_logic` (PASSED)
- `test_task_creation_and_completion_workflow` (PASSED)
- `test_document_upload_validation_rejects_disallowed_type` (PASSED)
- `test_document_upload_success_valid_pdf` (PASSED)
- `test_dashboard_metrics_dynamic_calculation` (PASSED)
- `test_report_export_csv_download` (PASSED)

### Frontend Test Suite (Vitest)
```bash
cd frontend
npm test
```
**Results:** 5 passed in 0.3s
- Renders Badge with default and status variants
- Renders Button with variants and responds to click events
- Renders disabled Button and does not trigger clicks
- Renders Card with header and content sections
- Renders EmptyState with action node

### Production Bundle Verification
```bash
cd frontend
npm run build
```
**Results:** Compiled cleanly with zero errors (`tsc && vite build` exited with code 0).

---

## 7. Interactive API Documentation

Interactive OpenAPI / Swagger documentation is built in via `drf-spectacular`:
- **Swagger UI:** `http://localhost:8000/api/v1/schema/swagger-ui/`
- **Redoc UI:** `http://localhost:8000/api/v1/schema/redoc/`
- **OpenAPI Schema YAML:** Available at `schema.yml` in root directory.

---

## 8. License

Proprietary enterprise software built for professional compliance operations.
