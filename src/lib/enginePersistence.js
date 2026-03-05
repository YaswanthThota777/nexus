// Persistence helpers for training engine state
const ENGINE_KEY_PREFIX = 'nexus-engine-';

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('enginePersistence parse error', e);
    return null;
  }
};

export function saveEngine(projectId, engine) {
  if (!projectId || !engine) return;
  const payload = {
    epsilon: engine.epsilon,
    episode: engine.episode,
    totalSteps: engine.totalSteps,
    policyTable: Array.from(engine.policyTable?.entries?.() || []),
  };
  localStorage.setItem(`${ENGINE_KEY_PREFIX}${projectId}`, JSON.stringify(payload));
}

export function loadEngine(projectId, createEngine) {
  if (!projectId) return null;
  const raw = localStorage.getItem(`${ENGINE_KEY_PREFIX}${projectId}`);
  const data = safeParse(raw);
  if (!data || !createEngine) return null;

  const engine = createEngine();
  engine.epsilon = data.epsilon ?? engine.epsilon;
  engine.episode = data.episode ?? engine.episode;
  engine.totalSteps = data.totalSteps ?? engine.totalSteps;
  (data.policyTable || []).forEach(([state, values]) => {
    engine.policyTable.set(state, values);
  });
  return engine;
}

export function clearEngine(projectId) {
  if (!projectId) return;
  localStorage.removeItem(`${ENGINE_KEY_PREFIX}${projectId}`);
}
