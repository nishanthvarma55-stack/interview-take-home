# HTTP Monitor

A full-stack real-time dashboard that pings `httpbin.org/anything` every 5 minutes, stores responses in SQLite, and detects anomalies using z-score statistics.

## Architecture

```
backend/        Node.js + Express + SQLite
  scheduler  →  pings httpbin every 5 min, stores result + anomaly score
  WebSocket  →  pushes new_response events to connected browsers
  REST API   →  GET /api/responses, GET /api/stats

frontend/       React + Vite + Tailwind + Recharts
  useWebSocket  real-time updates
  AnomalyChart  response times with red dots for anomalies
  ResponseTable paginated log with expandable payloads
  StatsBar      aggregate stats + predicted next response time
```

## Tech Choices

| Choice | Reasoning |
|--------|-----------|
| **SQLite** (better-sqlite3) | Zero-config, file-based, perfect for a single-process monitor with low write volume |
| **ws** (not socket.io) | Lighter, no protocol overhead; one-way server→client push is all we need |
| **Recharts** | Composable React charts; custom dot rendering for anomaly markers is straightforward |
| **Option A — Anomaly Detection** | No API keys or LLM costs; z-score over a rolling window is statistically sound and computes in microseconds |

## Anomaly Detection

Each ping's response time is compared against the rolling mean and standard deviation of the last 20 readings:

```
z = (currentResponseTime - rollingMean) / rollingStdDev
isAnomaly = |z| > 2.0
```

A minimum of 5 samples is required before detection begins. The `predicted_next_response_time` in `/api/stats` is a 5-point moving average.

**Threshold:** z > 2 catches ~5% of values in a normal distribution. For production with a well-populated rolling window, z > 2.5 would reduce false positives.

## Core Component & Testing Strategy

**Core components chosen for testing:**

1. **Anomaly detection** (`backend/src/anomaly.js`) — pure mathematical functions with deterministic outputs; 19 unit tests covering all statistical edge cases
2. **REST API routes** (`backend/src/routes/responses.js`) — integration point between DB, anomaly detection, and frontend; 10 supertest integration tests

**Why these:** Bugs in anomaly detection silently produce wrong z-scores; bugs in the API silently corrupt what users see.

**Test coverage:**
- `anomaly.test.js` — 19 unit tests (computeStats, computeZScore, detectAnomaly, predictNextResponseTime)
- `scheduler.test.js` — 7 unit tests with axios mock
- `payloadGen.test.js` — 7 unit tests
- `db.test.js` — 8 unit tests with in-memory SQLite
- `routes.test.js` — 10 integration tests with supertest
- `ResponseTable.test.jsx` — 8 RTL component tests

## Setup

### Prerequisites
- Node.js 20+

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
# Server: http://localhost:3001
# WebSocket: ws://localhost:3001
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# App: http://localhost:5173
```

### Running Tests

```bash
# Backend (with coverage)
cd backend && npm run test:coverage

# Frontend
cd frontend && npm test
```

## Database Schema

```sql
CREATE TABLE responses (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp        TEXT    NOT NULL,
  status_code      INTEGER NOT NULL,
  response_time_ms REAL    NOT NULL,
  payload_sent     TEXT    NOT NULL,   -- JSON string
  response_body    TEXT    NOT NULL,   -- JSON string
  is_anomaly       INTEGER NOT NULL DEFAULT 0,
  z_score          REAL
);
```

## Environment Variables

### Backend
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP/WS server port |
| `DB_PATH` | `./data/responses.db` | SQLite file path |
| `HTTPBIN_URL` | `https://httpbin.org/anything` | Endpoint to ping |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | Backend base URL |
| `VITE_WS_URL` | `ws://localhost:3001` | WebSocket URL |

## Deployment

**Backend → Railway:**
1. Create new Railway project, connect repo, set root to `backend/`
2. Set env vars: `PORT=3001`, `DB_PATH=/data/responses.db`
3. Add a volume mount at `/data` for SQLite persistence

**Frontend → Vercel:**
1. Connect repo, set root to `frontend/`, framework: Vite
2. Set env vars: `VITE_API_URL=<railway-url>`, `VITE_WS_URL=<railway-ws-url>`

## Assumptions

- Single-instance deployment (SQLite is not suitable for multi-process write concurrency)
- httpbin.org is accessible from the deployment environment
- 5-minute ping interval is fixed (not configurable at runtime)
- Rolling window for anomaly detection is the last 20 responses (not time-based)

## Future Improvements

- Configurable ping interval
- Multiple endpoint monitoring (not just httpbin)
- Persistent anomaly alerts with email/Slack notifications
- Holt-Winters exponential smoothing for better forecasting
- Response time percentile tracking (p50, p95, p99)
- Docker Compose setup for easier local development
