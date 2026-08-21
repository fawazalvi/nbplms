# Coolify VPS Deployment Runbook — NBP Performance Management System

## Overview

This guide details the deployment of the NBP PMS application using Coolify on a Linux VPS host.

---

## 1. Prerequisites

- Coolify Instance installed and operational.
- Production SQL Server 2022 Instance accessible via internal network.
- SSL/TLS Certificates configured for application domain (`pms.nbp.com.pk`).
- Environment variable values prepared (see `deploy/env.template`).

---

## 2. Service Architecture

The system is deployed as three co-located containers connected via an internal bridge network (`pms-internal`):

```
                       ┌─────────────────────────┐
                       │   Reverse Proxy (HTTPS) │
                       └────────────┬────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │   web Container (Nginx) │
                       └────────────┬────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      │                           │
          ┌───────────▼───────────┐   ┌───────────▼───────────┐
          │     api Container     │   │   worker Container    │
          │   (ASP.NET Core 8)    │   │  (Hangfire Worker)    │
          └───────────┬───────────┘   └───────────┬───────────┘
                      │                           │
                      └─────────────┬─────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │   External SQL Server   │
                       └─────────────────────────┘
```

---

## 3. Deployment Steps in Coolify

### Step 1: Create a New Docker Compose Application
1. In Coolify Dashboard, click **New Resource** ➔ **Docker Compose**.
2. Select repository and point to `deploy/docker-compose.yml`.

### Step 2: Configure Protected Environment Variables
In the Coolify **Environment Variables** tab, add the following protected variables:

```env
DB_CONNECTION_STRING=Server=10.10.2.15;Database=NbpPmsDb;User Id=pms_app_user;Password=PROTECTED_PASSWORD;TrustServerCertificate=False;Encrypt=True;
ENCRYPTION_MASTER_KEY=YOUR_BASE64_32_BYTE_MASTER_KEY
SMTP_HOST=smtp.nbp.com.pk
SMTP_PORT=587
SMTP_USERNAME=pms-service-account
SMTP_PASSWORD=PROTECTED_SMTP_PASSWORD
SMTP_SENDER_EMAIL=pms@nbp.com.pk
APP_BASE_URL=https://pms.nbp.com.pk
APP_FRONTEND_URL=https://pms.nbp.com.pk
```

### Step 3: Deploy & Run Health Verification
1. Click **Deploy**.
2. Verify container startup logs.
3. Perform health check verification:
   ```bash
   curl -I https://pms.nbp.com.pk/health/live
   # Expected: HTTP/1.1 200 OK
   ```

---

## 4. Rollback Procedure

If a build fails or an issue is identified post-deployment:
1. In Coolify, navigate to **Deployments** tab.
2. Select the previous successful deployment hash.
3. Click **Redeploy Selected Build**.

---

## 5. Security & Isolation Verification

- Ensure SQL Server port (`1433`) is **NOT** exposed publicly.
- Ensure Redis port (`6379`) is **NOT** exposed publicly.
- Only Web container (`80` / `443`) is exposed via Coolify reverse proxy.
