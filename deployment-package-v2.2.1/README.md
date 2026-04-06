# MEDsync EMS Suite v2.2.1
## Resgrid → ESO Bridge — Deployment Guide

---

## Overview

MEDsync EMS Suite is a production-grade Node.js middleware service that:

- Listens to **Resgrid** emergency call events via SignalR (real-time) and polling (backup)
- Transforms call data into **ESO-compliant XML files**
- Uploads XML files to the **ESO SFTP server** automatically
- Logs every action to a **Google Sheets** audit trail
- **Auto-closes calls** when all responding units go Out of Service (30 min)
- **Force-closes stale calls** open longer than 24 hours (safety net)

---

## What's Included

```
deployment-package-v2.2.1/
├── src/
│   ├── index.js                  # Main entry point
│   ├── auto-closure-manager.js   # Auto-closure: units inactive + 24hr stale
│   ├── xml-generator.js          # ESO-compliant XML generation
│   ├── fly-io-sftp-client.js     # Cloud-optimized SFTP client
│   ├── sheets-logger.js          # Google Sheets audit logging
│   ├── config.js                 # Centralized configuration
│   ├── environment-validator.js  # Startup environment checks
│   ├── logger.js                 # Winston logger setup
│   ├── resgrid-api.js            # Resgrid REST API helpers
│   ├── retry-util.js             # Exponential backoff utility
│   ├── sftp-client.js            # Base SFTP client
│   ├── token-manager.js          # OAuth2 token lifecycle
│   ├── signalr-client.js         # SignalR connection wrapper
│   ├── xml-integrity-monitor.js  # XML validation monitoring
│   └── test-endpoint.js          # /api test endpoints
├── Dockerfile                    # Production Docker image (Node 20 Alpine)
├── docker-compose.yml            # Docker Compose deployment
├── fly.toml                      # Fly.io deployment config (app: resgrid2eso)
├── package.json                  # Node.js dependencies (0 vulnerabilities)
├── package-lock.json             # Locked dependency versions
├── .env.example                  # Required environment variables template
├── .gitignore
└── README.md                     # This file
```

---

## Security Status

**0 known vulnerabilities** as of April 2026.

Resolved in this release:
- Removed unused `xlsx` package (high severity, no upstream fix)
- Upgraded `xmlbuilder2` to v4.0.3 (fixed `js-yaml` prototype pollution)
- Updated `axios`, `body-parser`, `glob`, `jws`, `lodash`, `minimatch`,
  `path-to-regexp`, `qs`, `brace-expansion`, `form-data`, `fast-xml-parser`

---

## Requirements

| Requirement | Minimum Version |
|---|---|
| Node.js | 20.x LTS |
| npm | 10.x |
| Docker (optional) | 24.x |
| Docker Compose (optional) | 2.x |
| Fly CLI (optional) | latest |

---

## Configuration

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `RESGRID_USER` | Resgrid account username |
| `RESGRID_PASS` | Resgrid account password |
| `SFTP_HOST` | ESO SFTP server (`sftp.esosuite.net`) |
| `SFTP_USER` | ESO SFTP username |
| `SFTP_PASS` | ESO SFTP password |
| `SFTP_DIR` | ESO SFTP target directory path |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google service account credentials (full JSON) |
| `LOG_SHEET_ID` | Google Sheets spreadsheet ID |

### Optional Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `5000` | HTTP health check port |
| `POLLING_INTERVAL` | `60000` | Backup polling interval (ms) |
| `MAX_RETRIES` | `3` | Max retry attempts |
| `SFTP_TIMEOUT` | `30000` | SFTP connection timeout (ms) |

---

## Deployment Options

### Option 1 — Direct Node.js

```bash
npm ci --only=production
npm start
```

### Option 2 — Docker

```bash
docker build -t medsync-ems-suite:2.2.1 .
docker run -d \
  --name resgrid-eso-bridge \
  --restart unless-stopped \
  --env-file .env \
  -p 5000:5000 \
  medsync-ems-suite:2.2.1
```

### Option 3 — Docker Compose

```bash
docker compose up -d
docker compose logs -f
```

### Option 4 — Fly.io (Current Production)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Authenticate
fly auth login

# Set secrets (one time)
fly secrets set RESGRID_USER="..." RESGRID_PASS="..." \
  SFTP_HOST="sftp.esosuite.net" SFTP_USER="..." \
  SFTP_PASS="..." SFTP_DIR="..." \
  GOOGLE_SERVICE_ACCOUNT_JSON='...' LOG_SHEET_ID="..."

# Deploy
fly deploy --app resgrid2eso
```

---

## Fly.io Configuration (fly.toml)

```toml
app = "resgrid2eso"
primary_region = "lax"        # Los Angeles

[vm]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512

[http_service]
  internal_port = 5000
  force_https = true
  auto_stop_machines = false
  min_machines_running = 1    # Always on

[[http_service.checks]]
  path = "/status"
  interval = "30s"
  timeout = "10s"
```

---

## Health Monitoring

| Endpoint | Description |
|---|---|
| `GET /` | Quick health check |
| `GET /health` | Full component status |
| `GET /status` | Detailed system metrics |
| `GET /auto-closure` | Auto-closure manager status |
| `POST /api/test-call` | Trigger a test call |

---

## Auto-Closure Behaviour

Calls are automatically closed under **two independent conditions**:

| Condition | Trigger | Log Reason |
|---|---|---|
| All units inactive | All 19+ units Out of Service for 30+ min | `units_inactive` |
| Stale call (new) | Call open for 24+ hours regardless of units | `stale_call` |

Out of Service detection: status code `4`, status code `10`, or "Out of Service" text (handles undefined status IDs).

---

## Version History

| Version | Date | Notes |
|---|---|---|
| 2.2.1 | April 2026 | 0 vulnerabilities, 24hr stale call closure, security hardening |
| 2.2.0 | July 2025 | Auto-closure system-wide monitoring, "Out of Service" text detection |
| 1.7.x | June 2025 | SFTP cloud optimization, duplicate prevention |
| 1.6.x | June 2025 | Google Sheets dynamic header support |
| 1.5.x | May 2025 | Multi-unit XML structure |

---

*MEDsync EMS Suite v2.2.1 — Built for emergency services reliability*
