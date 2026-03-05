const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const apiKey = import.meta.env.VITE_API_KEY || '';

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let payload;
    const contentType = response.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        const rawText = await response.text();
        payload = { error: { message: rawText || `HTTP ${response.status}` } };
      }
    } catch {
      payload = { error: { message: `HTTP ${response.status} ${response.statusText}` } };
    }
    throw new Error(payload.error?.message || `API request failed (${response.status})`);
  }

  return response.json();
}

export const apiClient = {
  health: () => fetch('/health').then((res) => res.json()),
  createProject: (payload) => request('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  saveScene: (projectId, payload) => request(`/projects/${projectId}/scene`, { method: 'PUT', body: JSON.stringify(payload) }),
  exportProject: (projectId) => request(`/projects/${projectId}/export`),
  queueRun: (payload) => request('/runs', { method: 'POST', body: JSON.stringify(payload) }),
  getRun: (runId) => request(`/runs/${runId}`),
  listRuns: (projectId) => request(`/runs/project/${projectId}/list`),
  registerModel: (payload) => request('/models', { method: 'POST', body: JSON.stringify(payload) }),
  listModels: (projectId) => request(`/models/project/${projectId}/list`),
  deployModel: (modelId) => request(`/models/${modelId}/deploy`, { method: 'POST' }),
  publishTemplate: (payload) => request('/templates', { method: 'POST', body: JSON.stringify(payload) }),
  listTemplates: (query = '') => request(`/templates${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  getTemplate: (templateId) => request(`/templates/${templateId}`),
  listSimProviders: () => request('/sim/providers'),
  getSimBridgeHealth: () => request('/sim/bridge/health'),
  getSimRunSnapshot: (runId) => request(`/sim/runs/${runId}/snapshot`),
  stepSimRun: (runId) => request(`/sim/runs/${runId}/step`, { method: 'POST' }),
  mlHealth: () => request('/ml/health'),
  mlTrainStep: (payload) => request('/ml/train-step', { method: 'POST', body: JSON.stringify(payload) }),
  mlSaveModel: (payload) => request('/ml/save-model', { method: 'POST', body: JSON.stringify(payload) }),
  mlGetModel: (id) => request(`/ml/models/${id}`),
};
