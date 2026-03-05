// Store trained models keyed by projectId
const MODELS_KEY = 'nexus-models';
export const MAX_MODELS = 20;
export const MODELS_UPDATED_EVENT = 'nexus-models-updated';

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('modelStorage parse error', e);
    return [];
  }
};

const persist = (models) => {
  localStorage.setItem(MODELS_KEY, JSON.stringify(models));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(MODELS_UPDATED_EVENT));
  }
};

export function getModels(projectId) {
  const all = safeParse(localStorage.getItem(MODELS_KEY));
  if (!projectId) return all;
  return all.filter((m) => m.projectId === projectId);
}

export function saveModel(projectId, engine, metrics = {}) {
  if (!projectId || !engine) return null;
  const now = new Date().toISOString();
  const model = {
    id: crypto.randomUUID(),
    projectId,
    createdAt: now,
    metrics: {
      reward: metrics.reward ?? 0,
      successRate: metrics.successRate ?? 0,
    },
    name: metrics.name || `Model ${now}`,
    policyTable: Array.from(engine.policyTable?.entries?.() || []),
    engineState: {
      epsilon: engine.epsilon,
      episode: engine.episode,
      totalSteps: engine.totalSteps,
    },
  };

  const all = getModels();
  all.unshift(model);
  // Enforce per-project retention
  const projectModels = all.filter((m) => m.projectId === projectId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const overLimit = projectModels.length - MAX_MODELS;
  if (overLimit > 0) {
    const removeIds = new Set(projectModels.slice(0, overLimit).map((m) => m.id));
    persist(all.filter((m) => !removeIds.has(m.id)));
  } else {
    persist(all);
  }
  return model;
}

export function deleteModel(modelId) {
  const all = getModels();
  const next = all.filter((m) => m.id !== modelId);
  persist(next);
}

export function renameModel(modelId, name) {
  const trimmed = (name || '').trim();
  if (!modelId || !trimmed) return null;
  const all = getModels();
  const next = all.map((m) => (m.id === modelId ? { ...m, name: trimmed } : m));
  persist(next);
  return next.find((m) => m.id === modelId) || null;
}
