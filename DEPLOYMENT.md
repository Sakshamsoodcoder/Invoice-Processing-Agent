# Production Deployment Guide: InvoiceAI Assistant

This guide provides end-to-end instructions for deploying the **InvoiceAI Intelligent Invoice Processing Assistant** to production using:
- **Backend**: [Render](https://render.com) (FastAPI + Uvicorn Web Service)
- **Database**: [Render](https://render.com) (Managed PostgreSQL)
- **Frontend**: [Vercel](https://vercel.com) (React + Vite SPA)
- **AI & Cloud Services**: [Microsoft Azure](https://azure.microsoft.com) (Document Intelligence, Azure OpenAI, Azure Blob Storage)

---

## Architecture Overview

```
 ┌─────────────────────────┐
 │   Vercel (Frontend)     │  React + Vite SPA
 │  *.vercel.app           │  VITE_API_URL → Render Backend
 └────────────┬────────────┘
              │ HTTPS Requests (CORS enabled)
              ▼
 ┌─────────────────────────┐
 │   Render (Backend)      │  FastAPI + Uvicorn
 │  *.onrender.com         │  Listens on 0.0.0.0:$PORT
 └─────┬──────────────┬────┘
       │              │
       │ DATABASE_URL │ Azure SDKs
       ▼              ▼
┌──────────────┐ ┌────────────────────────────────────────────────────────┐
│    Render    │ │ Microsoft Azure Services                               │
│  PostgreSQL  │ │  • Azure Document Intelligence (Prebuilt-invoice model)│
│   Database   │ │  • Azure OpenAI / Microsoft Foundry (GPT-4o)           │
│              │ │  • Azure Blob Storage (Encrypted invoice file storage) │
└──────────────┘ └────────────────────────────────────────────────────────┘
```

---

## Part 1: Deploy PostgreSQL Database on Render

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **PostgreSQL**.
3. Configure the database settings:
   - **Name**: `invoice-ai-db` (or your preferred name)
   - **Database**: `invoice_ai`
   - **User**: `invoice_user` (or leave default)
   - **Region**: Choose the region closest to your Azure resources (e.g., `Oregon (US West)` or `Frankfurt (EU Central)`).
   - **PostgreSQL Version**: `16` (default)
   - **Instance Type**: `Free` (or higher tier)
4. Click **Create Database**.
5. Once the database status changes to **Available**:
   - Locate the **Connections** section on the database details page.
   - For Render-to-Render communication (backend Web Service on Render): copy the **Internal Database URL**.
   - For connecting from outside Render (e.g., running migrations from local terminal): copy the **External Database URL**.

> [!NOTE]
> Render provides database URLs with the prefix `postgres://`. SQLAlchemy 2.0+ requires `postgresql://`. The backend automatically normalizes `postgres://` to `postgresql://` at startup, so no manual URL transformation is required.

---

## Part 2: Deploy FastAPI Backend on Render

### Step 1: Create the Web Service
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository: `Sakshamsoodcoder/Invoice-Processing-Agent`.
3. Configure the service settings:
   - **Name**: `invoice-processing-backend` (or your preferred name)
   - **Language**: `Python 3`
   - **Branch**: `main`
   - **Region**: Same region as your Render PostgreSQL database
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free` (or Starter / Standard)

### Step 2: Configure Environment Variables
Under the **Environment Variables** section on Render, add the following variables:

| Variable Name | Required | Description / Example Value |
|---|:---:|---|
| `ENVIRONMENT` | **Yes** | `production` |
| `DATABASE_URL` | **Yes** | Paste the **Internal Database URL** from your Render PostgreSQL instance (e.g. `postgres://invoice_user:...@dpg-...-a/invoice_ai`) |
| `CORS_ORIGINS` | **Yes** | `https://invoice-processing-agent-inky.vercel.app,http://localhost:5173` *(comma-separated list of allowed frontend domains without trailing slashes)* |
| `JWT_SECRET` | **Yes** | A secure random 32+ character string (e.g., generate via `python -c "import secrets; print(secrets.token_hex(32))"`) |
| `JWT_ALGORITHM` | No | `HS256` (default) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` (24 hours) |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | **Yes** | `https://<your-resource-name>.cognitiveservices.azure.com/` |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | **Yes** | Your Azure Document Intelligence API Key |
| `AZURE_OPENAI_ENDPOINT` | **Yes** | `https://<your-openai-resource>.openai.azure.com/` |
| `AZURE_OPENAI_API_KEY` | **Yes** | Your Azure OpenAI / Foundry API Key |
| `AZURE_OPENAI_DEPLOYMENT` | No | `gpt-4o` (or your Azure model deployment name) |
| `AZURE_OPENAI_API_VERSION` | No | `2024-02-15-preview` |
| `AZURE_STORAGE_CONNECTION_STRING` | **Yes** | `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net` |
| `AZURE_STORAGE_CONTAINER` | No | `invoices` (default) |
| `LOCAL_STORAGE_DIR` | No | `./uploads` (fallback storage) |

> [!IMPORTANT]
> - Do not include trailing slashes in `CORS_ORIGINS`.
> - Render automatically provides the `$PORT` environment variable to the process. The start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT` will dynamically bind to Render's assigned port.
> - The backend CORS middleware includes regex support for `https://*.vercel.app`, allowing preview deployments on Vercel to work seamlessly.

### Step 3: Deploy and Initialize Database
1. Click **Create Web Service**.
2. Render will trigger the build pipeline:
   - Clones repo into `backend/`
   - Installs dependencies from `requirements.txt`
   - Starts Uvicorn on `0.0.0.0:$PORT`
   - During FastAPI lifespan startup, `Base.metadata.create_all(bind=engine)` automatically creates all necessary database tables (`users`, `invoices`, `invoice_items`, `invoice_issues`).
3. Note your backend URL (e.g., `https://invoice-processing-backend.onrender.com`).

### Step 4 (Optional): Seed Sample Data to Remote Database
To populate the production database with the demo user (`demo@invoiceai.com` / `Password123!`) and sample invoices:
From your local terminal, run:
```bash
# Set DATABASE_URL to your Render External Database URL
$env:DATABASE_URL="postgres://invoice_user:...@dpg-...-a.oregon-postgres.render.com/invoice_ai"
python backend/seed_data.py
```

---

## Part 3: Deploy Frontend on Vercel

### Step 1: Import Project to Vercel
1. Log in to [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository: `Sakshamsoodcoder/Invoice-Processing-Agent`.

### Step 2: Configure Build & Framework Settings
Vercel supports two deployment configurations for monorepos. Choose **Option A (Recommended)**:

#### Option A: Set Root Directory to `frontend` (Recommended)
- **Framework Preset**: `Vite`
- **Root Directory**: Click *Edit* and select `frontend`
- **Build Command**: `npm run build` (default)
- **Output Directory**: `dist` (default)
- **Install Command**: `npm install` (default)

#### Option B: Deploy from Repository Root
- **Framework Preset**: `Other` or `Vite`
- **Root Directory**: `./` (root)
- Vercel will automatically read the root `vercel.json` which specifies:
  - `buildCommand`: `npm run build --prefix frontend`
  - `outputDirectory`: `frontend/dist`
  - `installCommand`: `npm install --prefix frontend`

### Step 3: Configure Environment Variables
Under **Environment Variables**, add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://<your-render-backend>.onrender.com` | Deployed Render backend URL **without** trailing slash |

> [!CAUTION]
> Ensure there is **no trailing slash** at the end of `VITE_API_URL` (e.g. use `https://invoice-processing-backend.onrender.com`, NOT `https://invoice-processing-backend.onrender.com/`). The frontend client will sanitize trailing slashes as well, but using the clean format prevents any ambiguity.

### Step 4: Deploy
1. Click **Deploy**.
2. Once the build finishes, Vercel will assign a production domain (e.g., `https://invoice-processing-agent-inky.vercel.app`).
3. If this domain differs from what you configured in Render's `CORS_ORIGINS`, update `CORS_ORIGINS` in Render and trigger a redeploy (or rely on the built-in `*.vercel.app` regex matching).

---

## Part 4: End-to-End Verification & Health Checks

Once both services are running, perform these verification steps:

### 1. Verify Backend Health Endpoint
Open in browser or run curl:
```bash
curl https://<your-render-backend>.onrender.com/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "app": "InvoiceAI – Intelligent Invoice Processing Assistant",
  "version": "1.0.0",
  "environment": "production",
  "database": {
    "status": "healthy",
    "type": "postgresql"
  },
  "services": {
    "azure_document_intelligence": {
      "configured": true,
      "mode": "Live Production",
      "endpoint_host": "..."
    },
    "azure_openai": {
      "configured": true,
      "mode": "Live Production",
      "deployment": "gpt-4o",
      "endpoint_host": "..."
    },
    "azure_blob_storage": {
      "configured": true,
      "mode": "Azure Blob Storage",
      "container": "invoices"
    }
  }
}
```

### 2. Verify Frontend Application
1. Navigate to your Vercel URL (e.g., `https://invoice-processing-agent-inky.vercel.app`).
2. Log in with the demo account:
   - **Email**: `demo@invoiceai.com`
   - **Password**: `Password123!`
   *(Or click "Sign Up" to register a new user).*

### 3. Verify Invoice Upload & Azure Pipeline
1. In the dashboard, click **Upload Invoice**.
2. Upload a sample PDF or image invoice.
3. Observe the live processing states:
   - **Step 1**: Storing invoice securely in Azure Blob Storage.
   - **Step 2**: Extracting fields using Azure Document Intelligence (vendor, date, line items, subtotal, tax rate, tax, total).
   - **Step 3**: Mathematical reconciliation & validation engine checks calculations.
   - **Step 4**: Azure OpenAI analyzes anomaly detection and suggests business actions.
4. Verify that the document viewer displays the uploaded invoice and the detail page shows all line items and reconciliation badges.

---

## Troubleshooting & FAQ

### 1. Render Free Tier Spin-Down (Cold Start)
- Render Free Tier web services spin down after 15 minutes of inactivity.
- The first request after a period of inactivity may take 30–50 seconds while the container initializes. Subsequent requests respond instantly.
- The frontend includes request timeouts and retry awareness to accommodate cold starts.

### 2. Database Connection Errors (`NoSuchModuleError: postgres`)
- **Cause**: SQLAlchemy requires `postgresql://` instead of `postgres://`.
- **Solution**: The backend `Settings.normalized_database_url` in `app/core/config.py` automatically converts `postgres://` to `postgresql://`. Ensure your database session uses `settings.normalized_database_url`.

### 3. CORS Issues (Network Error / Preflight 405 or 403)
- Ensure the Render `CORS_ORIGINS` environment variable includes your exact Vercel domain without trailing slashes.
- Note: The backend in `app/main.py` is configured with `allow_origin_regex=r"^https:\/\/.*\.vercel\.app$"` so all Vercel production and preview URLs are permitted by default.

### 4. Vercel 404 on Direct Page Refresh (e.g., `/invoices/1`)
- Both `vercel.json` (at root) and `frontend/vercel.json` include SPA rewrite rules:
  ```json
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
  ```
- This ensures any direct URL visit or browser refresh is routed back to `index.html` for client-side routing.
