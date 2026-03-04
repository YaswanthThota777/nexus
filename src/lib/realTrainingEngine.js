const MODEL_PRESETS = {
  ppo: { alpha: 0.24, gamma: 0.93, epsilon: 0.35, epsilonMin: 0.05, epsilonDecay: 0.9965, stepSize: 0.8 },
  sac: { alpha: 0.28, gamma: 0.95, epsilon: 0.22, epsilonMin: 0.03, epsilonDecay: 0.997, stepSize: 0.9 },
  ddpg: { alpha: 0.2, gamma: 0.94, epsilon: 0.3, epsilonMin: 0.04, epsilonDecay: 0.9968, stepSize: 0.85 },
  bc: { alpha: 0.16, gamma: 0.9, epsilon: 0.15, epsilonMin: 0.02, epsilonDecay: 0.998, stepSize: 0.75 },
  hybrid: { alpha: 0.25, gamma: 0.95, epsilon: 0.26, epsilonMin: 0.03, epsilonDecay: 0.9962, stepSize: 0.9 },
};

function getAgentAndGoalIndices(objects) {
  const agentIndex = objects.findIndex((item) => item.agent && Array.isArray(item.pos));
  const goalIndex = objects.findIndex((item) => {
    if (!Array.isArray(item.pos)) return false;
    if (typeof item.name === 'string' && item.name.toLowerCase().includes('goal')) return true;
    return item.type === 'sphere' && typeof item.color === 'string' && item.color.toLowerCase().includes('ff3333');
  });

  return { agentIndex, goalIndex };
}

function stateKey(agentPos, goalPos, is2D) {
  const deltaX = Math.max(-20, Math.min(20, Math.round(goalPos[0] - agentPos[0])));
  const deltaSecondAxis = is2D
    ? Math.max(-20, Math.min(20, Math.round(goalPos[1] - agentPos[1])))
    : Math.max(-20, Math.min(20, Math.round(goalPos[2] - agentPos[2])));
  return `${deltaX}|${deltaSecondAxis}`;
}

function clamp(value, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function directionSignal(agentPos, goalPos, is2D) {
  const deltaX = goalPos[0] - agentPos[0];
  const deltaSecondAxis = is2D ? (goalPos[1] - agentPos[1]) : (goalPos[2] - agentPos[2]);
  const magnitude = Math.max(0.0001, Math.hypot(deltaX, deltaSecondAxis));
  return {
    steering: clamp(deltaX / magnitude),
    throttle: clamp(deltaSecondAxis / magnitude),
  };
}

function getPolicyState(policyTable, key, randomFn, guidance = { steering: 0, throttle: 0 }) {
  if (!policyTable.has(key)) {
    const random = typeof randomFn === 'function' ? randomFn : Math.random;
    policyTable.set(key, {
      steer: clamp(guidance.steering * 0.45 + (random() * 2 - 1) * 0.12),
      throttle: clamp(guidance.throttle * 0.45 + (random() * 2 - 1) * 0.12),
      value: 0,
      visits: 0,
    });
  }
  return policyTable.get(key);
}

function chooseControl(policyState, epsilon, randomFn) {
  const random = typeof randomFn === 'function' ? randomFn : Math.random;
  const explore = random() < epsilon;

  if (explore) {
    return {
      steering: clamp(random() * 2 - 1),
      throttle: clamp(random() * 2 - 1),
      explore,
    };
  }

  return {
    steering: clamp(policyState.steer + (random() * 2 - 1) * 0.06),
    throttle: clamp(policyState.throttle + (random() * 2 - 1) * 0.06),
    explore,
  };
}

function distance2D(a, b, is2D) {
  const dx = a[0] - b[0];
  if (is2D) {
    const dy = a[1] - b[1];
    return Math.sqrt(dx * dx + dy * dy);
  }
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dz * dz);
}

function bounded(position, limit = 40) {
  return Math.max(-limit, Math.min(limit, position));
}

function randomGoal(is2D, referenceAxis = 0.5, randomFn) {
  const random = typeof randomFn === 'function' ? randomFn : Math.random;
  const x = Number((random() * 28 - 14).toFixed(2));
  const secondAxis = Number((random() * 28 - 14).toFixed(2));
  if (is2D) {
    return [x, secondAxis, referenceAxis];
  }
  return [x, 0.5, secondAxis];
}

function obstacleClearance(objects, agentIndex, goalIndex, point, is2D) {
  let minClearance = Infinity;

  objects.forEach((item, idx) => {
    if (idx === agentIndex || idx === goalIndex) return;
    if (!Array.isArray(item?.pos)) return;
    if (item.type === 'light' || item.type === 'empty' || item.type === 'plane') return;

    const radiusGuess = Array.isArray(item.scale)
      ? Math.max(item.scale[0] || 1, item.scale[1] || 1, item.scale[2] || 1) * 0.5
      : 0.75;

    const centerDist = distance2D(point, item.pos, is2D);
    const clearance = centerDist - radiusGuess;
    if (clearance < minClearance) minClearance = clearance;
  });

  return minClearance;
}

function radiusGuess(item, fallback = 0.75) {
  if (Array.isArray(item?.scale)) {
    return Math.max(item.scale[0] || 1, item.scale[1] || 1, item.scale[2] || 1) * 0.5;
  }
  return fallback;
}

function detectObstacleCollision(objects, agentIndex, goalIndex, point, is2D, agentRadius = 0.6) {
  let collided = false;
  let nearestClearance = Infinity;

  objects.forEach((item, idx) => {
    if (idx === agentIndex || idx === goalIndex) return;
    if (!Array.isArray(item?.pos)) return;
    if (item.type === 'light' || item.sensorMount) return;
    if (item.agent) return;

    const obstacleRadius = radiusGuess(item, 0.85);
    const centerDist = distance2D(point, item.pos, is2D);
    const clearance = centerDist - (obstacleRadius + agentRadius);
    if (clearance < nearestClearance) nearestClearance = clearance;
    if (clearance < -0.05) collided = true;
  });

  return {
    collided,
    clearance: Number.isFinite(nearestClearance) ? nearestClearance : null,
  };
}

function createSeededRandom(seedValue) {
  let state = Number(seedValue);
  if (!Number.isFinite(state) || state <= 0) state = Date.now();
  state = Math.floor(state) % 2147483647;
  if (state <= 0) state += 2147483646;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

export function createTrainingEngine(model = 'ppo', options = {}) {
  const preset = MODEL_PRESETS[model] || MODEL_PRESETS.ppo;
  const deterministic = Boolean(options.deterministic);
  const seededRandom = deterministic ? createSeededRandom(options.seed) : null;

  return {
    policyTable: new Map(),
    epsilon: preset.epsilon,
    epsilonMin: preset.epsilonMin,
    epsilonDecay: preset.epsilonDecay,
    alpha: preset.alpha,
    actorRate: Number((preset.alpha * 0.32).toFixed(4)),
    gamma: preset.gamma,
    stepSize: preset.stepSize,
    episode: 0,
    episodeReward: 0,
    episodeStep: 0,
    totalSteps: 0,
    deterministic,
    seed: deterministic ? Number(options.seed) || null : null,
    random: deterministic ? seededRandom : Math.random,
  };
}

export function runTrainingStep(objects, engine, options = {}) {
  if (!engine || !Array.isArray(objects) || objects.length === 0) {
    return { objects, episodePoint: null };
  }

  const { agentIndex, goalIndex } = getAgentAndGoalIndices(objects);
  if (agentIndex < 0 || goalIndex < 0) {
    return { objects, episodePoint: null, missingTargets: true };
  }

  const agent = objects[agentIndex];
  const goal = objects[goalIndex];
  const is2D = Boolean(options.is2D || agent?.is2D || goal?.is2D);
  const currentState = stateKey(agent.pos, goal.pos, is2D);
  const guidance = directionSignal(agent.pos, goal.pos, is2D);
  const currentPolicy = getPolicyState(engine.policyTable, currentState, engine.random, guidance);
  currentPolicy.visits += 1;

  const control = chooseControl(currentPolicy, engine.epsilon, engine.random);
  const steering = Number(control.steering.toFixed(3));
  const throttle = Number(control.throttle.toFixed(3));
  const controlMagnitude = Math.max(0.1, Math.hypot(steering, throttle));
  const stepMagnitude = engine.stepSize * (0.45 + Math.min(1, controlMagnitude) * 0.55);

  const prevDist = distance2D(agent.pos, goal.pos, is2D);
  const nextPos = is2D
    ? [
        Number(bounded(agent.pos[0] + steering * stepMagnitude).toFixed(2)),
        Number(bounded(agent.pos[1] + throttle * stepMagnitude).toFixed(2)),
        Number(agent.pos[2]),
      ]
    : [
        Number(bounded(agent.pos[0] + steering * stepMagnitude).toFixed(2)),
        agent.pos[1],
        Number(bounded(agent.pos[2] + throttle * stepMagnitude).toFixed(2)),
      ];

  const agentRadius = radiusGuess(agent, 0.6);
  const collisionProbe = detectObstacleCollision(objects, agentIndex, goalIndex, nextPos, is2D, agentRadius);

  let effectiveNextPos = nextPos;
  let collided = collisionProbe.collided;
  if (collided) {
    const reboundScale = Math.max(0.12, stepMagnitude * 0.18);
    effectiveNextPos = is2D
      ? [
          Number(bounded(agent.pos[0] - steering * reboundScale).toFixed(2)),
          Number(bounded(agent.pos[1] - throttle * reboundScale).toFixed(2)),
          Number(agent.pos[2]),
        ]
      : [
          Number(bounded(agent.pos[0] - steering * reboundScale).toFixed(2)),
          agent.pos[1],
          Number(bounded(agent.pos[2] - throttle * reboundScale).toFixed(2)),
        ];
  }

  const nextDist = distance2D(effectiveNextPos, goal.pos, is2D);
  let reward = (prevDist - nextDist) * 1.8 - 0.03;
  let reachedGoal = false;
  let nextGoalPos = goal.pos;

  const nearestClearance = collisionProbe.clearance ?? obstacleClearance(objects, agentIndex, goalIndex, effectiveNextPos, is2D);
  if (Number.isFinite(nearestClearance)) {
    if (nearestClearance < 0.35) reward -= 2.8;
    else if (nearestClearance < 1.0) reward -= 0.8;
    else if (nearestClearance > 2.0) reward += 0.08;
  }

  if (collided) reward -= 6.5;

  if (nextDist < 1.2) {
    reward += 9;
    reachedGoal = true;
    nextGoalPos = randomGoal(is2D, goal.pos[2] ?? agent.pos[2] ?? 0.5, engine.random);
  }

  const nextState = stateKey(effectiveNextPos, nextGoalPos, is2D);
  const nextGuidance = directionSignal(effectiveNextPos, nextGoalPos, is2D);
  const nextPolicy = getPolicyState(engine.policyTable, nextState, engine.random, nextGuidance);

  const tdTarget = reward + engine.gamma * nextPolicy.value;
  const tdError = tdTarget - currentPolicy.value;
  currentPolicy.value += engine.alpha * tdError;

  const steeringError = guidance.steering - steering;
  const throttleError = guidance.throttle - throttle;
  currentPolicy.steer = clamp(currentPolicy.steer + engine.actorRate * tdError * steeringError);
  currentPolicy.throttle = clamp(currentPolicy.throttle + engine.actorRate * tdError * throttleError);

  engine.epsilon = Math.max(engine.epsilonMin, engine.epsilon * engine.epsilonDecay);
  engine.episodeReward += reward;
  engine.episodeStep += 1;
  engine.totalSteps += 1;

  let episodePoint = null;
  if (reachedGoal || engine.episodeStep >= 180) {
    engine.episode += 1;
    episodePoint = {
      episode: engine.episode,
      reward: Number(engine.episodeReward.toFixed(2)),
      epsilon: Number(engine.epsilon.toFixed(3)),
      distance: Number(nextDist.toFixed(2)),
      clearance: Number.isFinite(nearestClearance) ? Number(nearestClearance.toFixed(2)) : null,
      solved: reachedGoal,
    };
    engine.episodeReward = 0;
    engine.episodeStep = 0;
  }

  const updatedObjects = objects.map((item, idx) => {
    if (idx === agentIndex) {
      return {
        ...item,
        pos: effectiveNextPos,
        trainingControl: {
          action: control.explore ? 1 : 0,
          steering,
          throttle,
          speed: Number(stepMagnitude.toFixed(3)),
          confidence: Number((1 - engine.epsilon).toFixed(3)),
          collided,
          solved: reachedGoal,
        },
      };
    }
    if (idx === goalIndex && reachedGoal) {
      return { ...item, pos: nextGoalPos };
    }
    return item;
  });

  return {
    objects: updatedObjects,
    episodePoint,
    stepMetrics: {
      episode: engine.episode,
      episodeStep: engine.episodeStep,
      totalSteps: engine.totalSteps,
      reward: Number(reward.toFixed(2)),
      epsilon: Number(engine.epsilon.toFixed(3)),
      distance: Number(nextDist.toFixed(2)),
      clearance: Number.isFinite(nearestClearance) ? Number(nearestClearance.toFixed(2)) : null,
      collided,
      solved: reachedGoal,
    },
  };
}
