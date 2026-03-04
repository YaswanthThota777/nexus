# Nexus AI Sim API Contracts (v1)

This document defines production-ready API contracts for turning the current frontend into a backend-powered platform.

## 1) Project API

### `POST /api/v1/projects`
Create a project.

Request:
```json
{
  "name": "Custom Robotics Lab",
  "template": "custom",
  "is2D": false,
  "config": {
    "environment": "warehouse",
    "robot": "quadruped",
    "model": "ppo"
  }
}
```

Response `201`:
```json
{
  "id": "proj_01JY...",
  "name": "Custom Robotics Lab",
  "status": "ready",
  "createdAt": "2026-03-02T12:00:00.000Z"
}
```

### `PUT /api/v1/projects/:projectId/scene`
Replace scene graph.

Request:
```json
{
  "schemaVersion": "1.0.0",
  "objects": []
}
```

Response `200`:
```json
{
  "saved": true,
  "objectCount": 38
}
```

### `GET /api/v1/projects/:projectId/export`
Returns full project export payload using frontend schema.

## 2) Training Run Queue API

### `POST /api/v1/runs`
Queue a model run.

Request:
```json
{
  "projectId": "proj_01JY...",
  "model": "ppo",
  "environment": "warehouse",
  "robot": "quadruped",
  "maxSteps": 200000,
  "seed": 42
}
```

Response `202`:
```json
{
  "runId": "run_01JY...",
  "status": "queued",
  "etaMinutes": 4
}
```

### `GET /api/v1/runs/:runId`
Get run status.

Response `200`:
```json
{
  "runId": "run_01JY...",
  "status": "running",
  "progress": 67.2,
  "startedAt": "2026-03-02T12:05:10.000Z",
  "metrics": {
    "episode": 481,
    "meanReward": 58.3
  }
}
```

### `GET /api/v1/projects/:projectId/runs`
List project runs by newest first.

## 3) Model Registry API

### `POST /api/v1/models`
Register trained artifact.

Request:
```json
{
  "projectId": "proj_01JY...",
  "runId": "run_01JY...",
  "name": "policy_v4",
  "framework": "onnx",
  "metrics": {
    "meanReward": 61.5,
    "successRate": 0.93
  }
}
```

### `GET /api/v1/projects/:projectId/models`
List model versions.

### `POST /api/v1/models/:modelId/deploy`
Mark model as active for runtime inference.

## 4) Realtime updates

Use WebSocket channel:
- `run.status.changed`
- `run.metrics.updated`
- `project.scene.saved`

Event payload example:
```json
{
  "type": "run.status.changed",
  "runId": "run_01JY...",
  "status": "completed",
  "progress": 100
}
```

## 5) Error contract

All errors:
```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "model is required",
    "requestId": "req_01JY..."
  }
}
```

## 6) Security minimum

- JWT/OAuth2 bearer auth
- Project-level authorization checks
- Signed artifact upload URLs
- Audit logs for save/deploy/delete actions
