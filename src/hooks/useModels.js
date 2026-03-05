import { useCallback, useEffect, useState } from 'react';
import {
    MODELS_UPDATED_EVENT,
    deleteModel as storageDelete,
    getModels as storageGet,
} from '../lib/modelStorage';

export function useModels(projectId, engineRef, onLoad) {
  const [models, setModels] = useState([]);

  const refreshModels = useCallback(() => {
    if (!projectId) {
      setModels([]);
      return;
    }
    setModels(storageGet(projectId));
  }, [projectId]);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  useEffect(() => {
    const handleModelsUpdated = () => refreshModels();
    window.addEventListener(MODELS_UPDATED_EVENT, handleModelsUpdated);
    return () => window.removeEventListener(MODELS_UPDATED_EVENT, handleModelsUpdated);
  }, [refreshModels]);

  const loadModel = useCallback((modelId) => {
    if (!projectId) return;
    const model = storageGet(projectId).find((m) => m.id === modelId);
    if (!model) return;
    const engine = engineRef?.current;
    if (engine) {
      engine.policyTable = new Map(model.policyTable || []);
      engine.epsilon = model.engineState?.epsilon ?? engine.epsilon;
      engine.episode = model.engineState?.episode ?? engine.episode;
      engine.totalSteps = model.engineState?.totalSteps ?? engine.totalSteps;
    }
    if (typeof onLoad === 'function') onLoad(model);
  }, [engineRef, onLoad, projectId]);

  const deleteModel = useCallback((modelId) => {
    storageDelete(modelId);
    refreshModels();
  }, [refreshModels]);

  return {
    models,
    refreshModels,
    loadModel,
    deleteModel,
  };
}
