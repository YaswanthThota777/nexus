import express from 'express';
import { db } from '../store.js';

export const mlRouter = express.Router();

const DEFAULT_MAX_EPISODE_STEPS = 60;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function axisIndex(is2D) {
  return is2D ? 1 : 2;
}

function findAgentGoal(objects = []) {
  const agentIndex = objects.findIndex((item) => item?.agent && Array.isArray(item?.pos));
  const goalIndex = objects.findIndex((item) => {
    if (!Array.isArray(item?.pos)) return false;
    if (typeof item?.name === 'string' && item.name.toLowerCase().includes('goal')) return true;
    return item?.type === 'sphere' && typeof item?.color === 'string' && item.color.toLowerCase().includes('ff3333');
  });

  return { agentIndex, goalIndex };
}

function distanceToGoal(agentPos, goalPos, is2D) {
  const secondAxis = axisIndex(is2D);
  const dx = Number(goalPos?.[0] ?? 0) - Number(agentPos?.[0] ?? 0);
  const dy = Number(goalPos?.[secondAxis] ?? 0) - Number(agentPos?.[secondAxis] ?? 0);
  return Math.sqrt(dx * dx + dy * dy);
}

function stateKey(agentPos, goalPos, is2D) {
  const secondAxis = axisIndex(is2D);
  const dx = Math.round(clamp(Number(goalPos?.[0] ?? 0) - Number(agentPos?.[0] ?? 0), -20, 20));
  const dy = Math.round(clamp(Number(goalPos?.[secondAxis] ?? 0) - Number(agentPos?.[secondAxis] ?? 0), -20, 20));
  return `${dx}|${dy}`;
}

function ensurePolicyRow(policyTable, key) {
  if (!policyTable.has(key)) {
    policyTable.set(key, { steer: 0, throttle: 0.5, value: 0, visits: 0 });
  }
  return policyTable.get(key);
}

function initializeSessionState(sessionId, modelId, is2D) {
  return {
    sessionId,
    modelId,
    is2D: Boolean(is2D),
    policyTable: new Map(),
    episode: 0,
    episodeStep: 0,
    totalSteps: 0,
    episodeReward: 0,
    epsilon: 0.35,
    epsilonMin: 0.05,
    epsilonDecay: 0.9965,
    alpha: 0.24,
    gamma: 0.93,
    maxEpisodeSteps: DEFAULT_MAX_EPISODE_STEPS,
    lastDistance: null,
    startAgentPos: null,
    updatedAt: new Date().toISOString(),
  };
}

function buildMissingTargetsResponse(objects = [], is2D = false, session = null) {
  return {
    objects,
    missingTargets: true,
    episodePoint: null,
    stepMetrics: {
      episode: Number(session?.episode ?? 0),
      episodeStep: Number(session?.episodeStep ?? 0),
      totalSteps: Number(session?.totalSteps ?? 0),
      reward: Number(session?.episodeReward ?? 0),
      epsilon: Number(session?.epsilon ?? 0),
      distance: Number(session?.lastDistance ?? 0),
      clearance: null,
      collided: false,
      solved: false,
      backend: 'ml-service',
      is2D,
    },
  };
}

function runMlTrainingStep(session, objects, is2D) {
  const { agentIndex, goalIndex } = findAgentGoal(objects);
  if (agentIndex === -1 || goalIndex === -1) {
    session.episodeReward += -0.2;
    session.episodeStep += 1;
    session.totalSteps += 1;
    if (session.episodeStep >= session.maxEpisodeSteps) {
      session.episode += 1;
      session.episodeStep = 0;
      session.episodeReward = 0;
    }
    session.epsilon = Math.max(session.epsilonMin, session.epsilon * session.epsilonDecay);
    session.updatedAt = new Date().toISOString();
    return buildMissingTargetsResponse(objects, is2D, session);
  }

  const agent = objects[agentIndex];
  const goal = objects[goalIndex];
  const secondAxis = axisIndex(is2D);

  if (!Array.isArray(session.startAgentPos)) {
    session.startAgentPos = [...agent.pos];
  }

  const key = stateKey(agent.pos, goal.pos, is2D);
  const row = ensurePolicyRow(session.policyTable, key);
  const explore = Math.random() < session.epsilon;

  const steer = explore
    ? (Math.random() * 2 - 1)
    : clamp(Number(row.steer ?? 0), -1, 1);
  const throttle = explore
    ? (0.2 + Math.random() * 0.8)
    : clamp(Number(row.throttle ?? 0.5), 0.2, 1);

  const angle = Math.atan2(
    Number(goal.pos[secondAxis] ?? 0) - Number(agent.pos[secondAxis] ?? 0),
    Number(goal.pos[0] ?? 0) - Number(agent.pos[0] ?? 0),
  );
  const heading = angle + clamp(steer, -0.6, 0.6);
  const stepMagnitude = clamp(throttle, 0.2, 1) * 0.35;

  const nextPos = [...agent.pos];
  nextPos[0] = Number((nextPos[0] + Math.cos(heading) * stepMagnitude).toFixed(4));
  nextPos[secondAxis] = Number((nextPos[secondAxis] + Math.sin(heading) * stepMagnitude).toFixed(4));
  if (is2D) {
    nextPos[2] = Number(agent.pos?.[2] ?? 0);
  } else {
    nextPos[1] = Number(agent.pos?.[1] ?? 0.5);
  }

  const previousDistance = Number.isFinite(session.lastDistance)
    ? Number(session.lastDistance)
    : distanceToGoal(agent.pos, goal.pos, is2D);
  const nextDistance = distanceToGoal(nextPos, goal.pos, is2D);

  const reachedGoal = nextDistance <= 1;
  let reward = (previousDistance - nextDistance) * 6 - 0.04;
  if (reachedGoal) reward += 25;

  const nextStateKey = stateKey(nextPos, goal.pos, is2D);
  const nextRow = ensurePolicyRow(session.policyTable, nextStateKey);
  const bestFutureValue = Math.max(
    Number(nextRow.value ?? 0),
    Number(nextRow.steer ?? 0),
    Number(nextRow.throttle ?? 0),
  );
  const tdTarget = reward + session.gamma * bestFutureValue;

  row.value = Number((row.value + session.alpha * (tdTarget - row.value)).toFixed(6));
  row.steer = Number((row.steer + session.alpha * (steer - row.steer)).toFixed(6));
  row.throttle = Number((row.throttle + session.alpha * (throttle - row.throttle)).toFixed(6));
  row.visits = Number(row.visits || 0) + 1;

  session.episodeReward += reward;
  session.episodeStep += 1;
  session.totalSteps += 1;
  session.lastDistance = nextDistance;

  const updatedObjects = objects.map((item, index) => {
    if (index !== agentIndex) return item;
    return {
      ...item,
      pos: nextPos,
      trainingControl: {
        action: explore ? 1 : 0,
        steering: Number(steer.toFixed(3)),
        throttle: Number(throttle.toFixed(3)),
        speed: Number(stepMagnitude.toFixed(3)),
      },
    };
  });

  let episodePoint = null;
  if (reachedGoal || session.episodeStep >= session.maxEpisodeSteps) {
    session.episode += 1;
    episodePoint = {
      episode: session.episode,
      episodeStep: session.episodeStep,
      reward: Number(session.episodeReward.toFixed(2)),
      epsilon: Number(session.epsilon.toFixed(3)),
      distance: Number(nextDistance.toFixed(2)),
      clearance: null,
      solved: reachedGoal,
    };

    session.episodeReward = 0;
    session.episodeStep = 0;
    session.lastDistance = distanceToGoal(session.startAgentPos, goal.pos, is2D);

    updatedObjects[agentIndex] = {
      ...updatedObjects[agentIndex],
      pos: [...session.startAgentPos],
    };
  }

  session.epsilon = Math.max(session.epsilonMin, session.epsilon * session.epsilonDecay);
  session.updatedAt = new Date().toISOString();

  return {
    objects: updatedObjects,
    episodePoint,
    stepMetrics: {
      episode: session.episode,
      episodeStep: session.episodeStep,
      totalSteps: session.totalSteps,
      reward: Number(session.episodeReward.toFixed(2)),
      epsilon: Number(session.epsilon.toFixed(3)),
      distance: Number(nextDistance.toFixed(2)),
      clearance: null,
      collided: false,
      solved: reachedGoal,
      backend: 'ml-service',
      is2D,
    },
  };
}

mlRouter.get('/health', (req, res) => {
  return res.status(200).json({
    ok: true,
    service: 'ml-provider-stub',
    checkedAt: new Date().toISOString(),
  });
});

mlRouter.post('/train-step', (req, res) => {
  const sessionId = String(req.body?.sessionId || '').trim();
  const modelId = String(req.body?.modelId || '').trim();
  const state = req.body?.state || {};
  const objects = Array.isArray(state.objects) ? state.objects : [];
  const is2D = Boolean(state.is2D);

  if (!sessionId) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'sessionId is required.',
      },
    });
  }

  if (!modelId) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'modelId is required.',
      },
    });
  }

  const existing = db.mlSessions.get(sessionId);
  const session = existing || initializeSessionState(sessionId, modelId, is2D);
  session.modelId = modelId;
  session.is2D = is2D;

  const result = runMlTrainingStep(session, objects, is2D);
  db.mlSessions.set(sessionId, session);

  return res.status(200).json({
    ...result,
    provider: 'ml',
    sessionId,
    modelId,
  });
});

mlRouter.post('/save-model', (req, res) => {
  const modelId = String(req.body?.modelId || '').trim() || `ml-${Date.now()}`;
  const sessionId = String(req.body?.sessionId || '').trim();

  const session = sessionId ? db.mlSessions.get(sessionId) : null;
  const payload = req.body?.payload || {
    engineState: {
      episode: Number(session?.episode ?? 0),
      episodeStep: Number(session?.episodeStep ?? 0),
      totalSteps: Number(session?.totalSteps ?? 0),
      epsilon: Number(session?.epsilon ?? 0),
    },
    policyTable: Array.from(session?.policyTable?.entries?.() || []),
  };

  const record = {
    id: modelId,
    sessionId,
    payload,
    savedAt: new Date().toISOString(),
  };

  db.mlModels.set(modelId, record);
  return res.status(200).json(record);
});

mlRouter.get('/models/:id', (req, res) => {
  const model = db.mlModels.get(req.params.id);
  if (!model) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'ML model not found.',
      },
    });
  }

  return res.status(200).json(model);
});
