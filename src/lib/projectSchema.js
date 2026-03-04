const PROJECT_SCHEMA_VERSION = '1.0.0';

export function createProjectExportPayload({ workspace, objects, runQueue, trainingData }) {
  return {
    schemaVersion: PROJECT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    workspace: {
      name: workspace?.name || 'Untitled Project',
      template: workspace?.template || 'custom',
      projectId: workspace?.projectId || `export-${Date.now()}`,
      is2D: Boolean(workspace?.is2D),
      config: workspace?.config || null,
    },
    scene: {
      objectCount: Array.isArray(objects) ? objects.length : 0,
      objects: Array.isArray(objects) ? objects : [],
    },
    training: {
      model: workspace?.config?.model || 'ppo',
      history: Array.isArray(trainingData) ? trainingData : [],
      queuedRuns: Array.isArray(runQueue) ? runQueue : [],
    },
  };
}

export function validateProjectImportPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, reason: 'Invalid file format.' };
  }

  if (!payload.schemaVersion || !payload.workspace || !payload.scene) {
    return { valid: false, reason: 'Missing required project schema fields.' };
  }

  if (!Array.isArray(payload.scene.objects)) {
    return { valid: false, reason: 'Scene objects must be an array.' };
  }

  const malformedObject = payload.scene.objects.find(
    (item) => !item || typeof item !== 'object' || typeof item.id !== 'string' || typeof item.type !== 'string',
  );

  if (malformedObject) {
    return { valid: false, reason: 'One or more scene entities are malformed.' };
  }

  return { valid: true };
}
