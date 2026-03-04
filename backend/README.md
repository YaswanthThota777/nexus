# Nexus AI Sim API

Enterprise backend service for project management, training run queue, model registry, and realtime run updates.

## Run locally

```bash
npm install
npm run dev
```

Server default: `http://localhost:8080`

## Environment

Copy `.env.example` to `.env` and configure:

- `PORT`
- `CORS_ORIGIN`
- `API_KEY`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `HF_BRIDGE_URL` (optional; enables `high-fidelity-bridge` provider)
- `HF_BRIDGE_API_KEY` (optional; sent as `x-api-key` to bridge)
- `HF_BRIDGE_TIMEOUT_MS` (optional; request timeout, default `10000`)

## Endpoints

- `GET /health`
- `POST /api/v1/projects`
- `PUT /api/v1/projects/:projectId/scene`
- `GET /api/v1/projects/:projectId/export`
- `POST /api/v1/runs`
- `GET /api/v1/runs/:runId`
- `GET /api/v1/runs/project/:projectId/list`
- `GET /api/v1/sim/providers`
- `GET /api/v1/sim/bridge/health`
- `GET /api/v1/sim/runs/:runId/snapshot`
- `POST /api/v1/sim/runs/:runId/step`
- `POST /api/v1/models`
- `GET /api/v1/models/project/:projectId/list`
- `POST /api/v1/models/:modelId/deploy`
- WebSocket: `ws://localhost:8080/ws`

## Simulation bridge architecture

The API now uses a provider adapter layer (`src/services/simBridge.js`) instead of random ticker updates.

- `local-deterministic` (available): deterministic, scene-aware run stepping with reproducible metrics.
- `high-fidelity-bridge` (conditional): HTTP adapter for native external simulators (Isaac/Gazebo/MuJoCo bridge), enabled when `HF_BRIDGE_URL` is set.

Runs can choose provider via `POST /api/v1/runs` payload:

```json
{
	"projectId": "proj_xxx",
	"model": "ppo",
	"environment": "warehouse",
	"robot": "quadruped",
	"provider": "local-deterministic",
	"deterministic": true,
	"seed": 42
}
```

If a requested provider is unknown or unavailable, `POST /api/v1/runs` returns `400` with an explicit error.

## External bridge contract (`high-fidelity-bridge`)

When enabled, each step is sent to `POST ${HF_BRIDGE_URL}/runs/step` as JSON:

```json
{
	"runId": "run_abc123",
	"projectId": "proj_xxx",
	"provider": "high-fidelity-bridge",
	"status": "running",
	"progress": 18.2,
	"config": {
		"model": "ppo",
		"environment": "warehouse",
		"robot": "quadruped",
		"maxSteps": 200000,
		"seed": 42,
		"deterministic": true
	},
	"metrics": {
		"episode": 128,
		"meanReward": 22.5,
		"successRate": 54.1,
		"benchmarkScore": 61.3
	},
	"providerState": {},
	"scene": {
		"schemaVersion": "1.0.0",
		"objects": []
	}
}
```

Expected response JSON:

```json
{
	"status": "running",
	"progress": 20.7,
	"metrics": {
		"episode": 136,
		"meanReward": 24.1,
		"successRate": 55.6,
		"benchmarkScore": 63.2
	},
	"providerState": {
		"simTick": 483,
		"sessionId": "bridge_session_42"
	},
	"failureReason": null
}
```

Notes:

- `status` should be one of `queued | running | completed | failed`.
- API retries one time on timeout/5xx/429 and then marks run as failed with mapped bridge error.
- `progress`, `successRate`, and `benchmarkScore` are clamped server-side to `0..100`.

## Bridge health probe

Use `GET /api/v1/sim/bridge/health` for deployment preflight and CI checks.

Response states:

- `disabled`: `HF_BRIDGE_URL` is not configured.
- `ok`: bridge is configured and upstream `/health` responded successfully.
- `unreachable`: bridge is configured but unreachable, timed out, or returned a non-2xx status.
