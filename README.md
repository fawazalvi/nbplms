# NBP Performance Management System (PMS 2.0)

## Overview

Enterprise-grade Performance Appraisal System for National Bank of Pakistan, initiated by the HR Digital Transformation Wing, Strategy & Rewards Division, HR Management Group.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, Lucide Icons |
| Backend | ASP.NET Core 8 Web API (C#), Modular Monolith |
| Database | Microsoft SQL Server + Entity Framework Core 8 |
| Auth | ASP.NET Core Identity, HttpOnly secure cookies |
| Background Jobs | Hangfire (SQL Server storage) |
| Email | MailKit SMTP via IEmailSender interface |
| Deployment | Docker + Coolify VPS |
| Encryption | AES-256-GCM application-layer field encryption |

## Quick Start (Local Development)

### Prerequisites
- .NET 8 SDK
- Node.js 20+ / npm 10+
- Docker Desktop
- SQL Server (or use the dev compose profile)

### Full Stack with Docker (Dev Profile)
```bash
# Start local environment (SQL Server on host 14333, API on host 8090)
docker compose -f deploy/docker-compose.dev.yml up -d
```

### Direct Local Host Connection Info
- **Host SQL Server:** `localhost,14333` (User: `sa`, Password: `Dev_Password_123!`)
- **Backend API & Swagger:** `http://localhost:8090/swagger`
- **Web App / SPA:** `http://localhost:5173`
- **MailHog (Dev Email Trap):** `http://localhost:8025`

## Solution Structure

```
nbp-pms/
├── apps/
│   └── web/                    # React + TypeScript SPA
├── src/
│   ├── Nbp.Pms.Domain/         # Entities, value objects, domain events
│   ├── Nbp.Pms.Contracts/      # Shared request/response DTOs, enums
│   ├── Nbp.Pms.Application/    # Use cases, validators, MediatR handlers
│   ├── Nbp.Pms.Infrastructure/ # EF Core, repositories, external services
│   ├── Nbp.Pms.BackgroundJobs/ # Hangfire job definitions + processors
│   └── Nbp.Pms.Api/            # ASP.NET Core Web API entry point
├── tests/
│   ├── Nbp.Pms.UnitTests/
│   └── Nbp.Pms.IntegrationTests/
├── deploy/
│   ├── docker-compose.yml      # Production
│   ├── docker-compose.dev.yml  # Local development
│   └── env.template            # Environment variable template (no secrets)
└── docs/
    ├── architecture/
    ├── operations/
    └── security/
```

## License

Proprietary — National Bank of Pakistan. All rights reserved.
