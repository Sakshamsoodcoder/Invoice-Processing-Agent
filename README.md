# InvoiceAI – Intelligent Invoice Processing Assistant

**InvoiceAI** is an enterprise-grade, full-stack AI invoice processing system. It extracts invoice fields with **Azure Document Intelligence**, performs zero-hallucination deterministic mathematical validation, detects procurement anomalies, provides executive financial auditing with **Microsoft Foundry / Azure OpenAI**, stores invoice originals in **Azure Blob Storage**, and visualizes analytics in a modern dashboard.

---

## Architecture

```
                                  ┌────────────────────────┐
                                  │      React + Vite      │
                                  │    Tailwind CSS UI     │
                                  └───────────┬────────────┘
                                              │ HTTP / JWT
                                              ▼
                                  ┌────────────────────────┐
                                  │    FastAPI Backend     │
                                  └─┬─────────┬──────────┬─┘
                                    │         │          │
                     ┌──────────────▼───┐  ┌──▼───────┐  └──► ┌─────────────────────┐
                     │ Azure Blob       │  │ Document │       │ Microsoft Foundry / │
                     │ Storage          │  │ Intel    │       │ Azure OpenAI        │
                     │ (Local fallback) │  │ (OCR)    │       │ (Financial Audit)   │
                     └──────────────────┘  └──┬───────┘       └─────────────────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │ Deterministic Math  │
                                   │ & Anomaly Detector  │
                                   └──────────┬──────────┘
                                              │
                                   ┌──────────▼──────────┐
                                   │ PostgreSQL / SQLite │
                                   │ SQLAlchemy Database │
                                   └─────────────────────┘
```

---

## Key Features

- **Document Ingestion**: Drag-and-drop support for PDF, JPG, JPEG, and PNG invoices (up to 10MB).
- **Azure Document Intelligence**: Uses the `prebuilt-invoice` model to extract invoice ID, vendor, customer, dates, payment terms, subtotal, tax, total, and nested line item tables.
- **Deterministic Math Validation**:
  - `subtotal + tax == total` (evaluated with a 0.05 configurable tolerance).
  - `quantity * unit_price == amount` for each line item.
  - `sum(line_items) == subtotal`.
  - Non-negative tax and non-negative quantities.
  - Mandatory presence of invoice number, vendor, date, and positive total.
- **Anomaly Detection**: Flags duplicate invoice numbers, abnormal spending spikes (>3.5x user historical average), missing tax, and irregular delivery dates.
- **Azure OpenAI / Microsoft Foundry**: Synthesizes audit summaries, explains flagged discrepancies, and generates actionable accounts payable disbursement recommendations.
- **Interactive Document Viewer**: Side-by-side split screen showing the original document (embedded PDF or zoomable image) alongside extracted fields.
- **Analytics & Recharts**: Monthly spending trends, pass/fail status pie charts, top vendor spending horizontal bar charts, and effective tax distribution.
- **Audit Reports**: Downloadable structured JSON/print audit trails for compliance.
- **Zero-Config Development Mode**: Operates seamlessly in local mock mode without requiring Azure credentials or external database setups. Adding credentials to `.env` immediately switches the system to live Azure cloud services.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, JavaScript, Tailwind CSS, React Router v6, Axios, Recharts, Lucide Icons |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, PyJWT, bcrypt, uvicorn |
| **Cloud / AI** | Azure Document Intelligence SDK, Azure OpenAI (`openai` v1+), Azure Blob Storage SDK |
| **Database** | PostgreSQL (Production) / SQLite (Zero-config local fallback) |
| **DevOps** | Docker, Docker Compose, Nginx |

---

## Project Structure

```
InvoiceProcessingAssistant/
├── backend/
│   ├── app/
│   │   ├── api/             # API routes (auth, invoices, analytics, health)
│   │   ├── core/            # Configuration & security (JWT, bcrypt)
│   │   ├── db/              # SQLAlchemy session & Base
│   │   ├── models/          # Database models (User, Invoice, InvoiceItem, InvoiceIssue)
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   ├── services/        # Service abstractions (Blob, OCR, AI, Validator, Anomaly)
│   │   └── main.py          # FastAPI application & middleware
│   ├── alembic/             # Database migrations
│   ├── tests/               # Automated test suite (pytest)
│   ├── seed_data.py         # Seed script for realistic demo records
│   ├── generate_samples.py  # Sample invoice PDF/image generator
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Environment template
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # Common UI, DocumentViewer, LineItemsTable, etc.
│   │   ├── layouts/         # DashboardLayout, AuthLayout
│   │   ├── pages/           # Dashboard, Upload, Detail, History, Analytics, Settings
│   │   ├── services/        # Axios API clients
│   │   ├── context/         # AuthContext
│   │   ├── utils/           # Formatters (currency, date, confidence)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── Dockerfile
├── sample_invoices/         # Realistic sample invoices for testing
├── docker-compose.yml       # Production container orchestration
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Generate sample invoices and seed initial data
python generate_samples.py
python seed_data.py

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000`.  
Swagger interactive docs: `http://localhost:8000/docs`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend UI will be running at `http://localhost:5173`.

### 3. Demo Credentials
- **Email**: `demo@invoiceai.com`
- **Password**: `Password123!`
*(Or click the "Fill Demo Credentials" button directly on the login page).*

---

## Azure Services Configuration

To connect live Microsoft Azure services, update `backend/.env`:

```ini
# Azure Document Intelligence
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<your-resource-name>.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<your-key>

# Microsoft Foundry / Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://<your-openai-resource>.openai.azure.com/
AZURE_OPENAI_API_KEY=<your-api-key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Azure Blob Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER=invoices
```

Restart the FastAPI server. The top status banner will dynamically update to **"Azure Production Mode"**.

---

## Automated Tests

Run the complete backend test suite:

```bash
cd backend
.\venv\Scripts\pytest.exe -v
```

Test coverage includes:
- JWT token lifecycle and password hashing
- Deterministic math validation (tolerances, line items, missing fields)
- Anomaly detection logic
- Full invoice upload, extraction, and database persistence pipeline
- Aggregation analytics endpoints

---

## Docker Deployment

To launch the full stack (PostgreSQL, Backend API, and Nginx Frontend) with a single command:

```bash
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## API Reference

### Authentication
- `POST /api/auth/register`: Register new user
- `POST /api/auth/login`: Issue JWT access token
- `GET /api/auth/me`: Current user profile

### Invoices
- `POST /api/invoices/process`: Multipart invoice upload, OCR extraction, validation, and AI audit
- `GET /api/invoices`: Paginated invoice list with search and filters
- `GET /api/invoices/{id}`: Detailed invoice record with itemized lines and issue breakdown
- `DELETE /api/invoices/{id}`: Delete invoice and purge storage assets
- `GET /api/invoices/{id}/report`: Download audit report as structured JSON

### Analytics
- `GET /api/analytics/summary`: KPI cards, status distribution, monthly trends, top vendors
- `GET /api/analytics/vendors`: Vendor spending breakdown
- `GET /api/analytics/monthly`: Monthly disbursement history

### Diagnostics
- `GET /health`: System health and Azure service availability status

---

## License
MIT License. Built as an Intelligent Invoice Processing Assistant.
