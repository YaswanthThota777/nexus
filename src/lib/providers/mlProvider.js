import { TrainingProvider } from '../trainingProvider';

export class MLProvider extends TrainingProvider {
  constructor(apiClient) {
    super();
    this.apiClient = apiClient;
    this.sessionId = null;
    this.modelId = null;
  }

  async init(config = {}) {
    await super.init(config);
    this.sessionId = config.sessionId || config.projectId || `ml-session-${Date.now()}`;
    this.modelId = config.modelId || config.model || 'ml-model';
    return this;
  }

  async step(state = {}) {
    if (!this.apiClient?.mlTrainStep) {
      throw new Error('MLProvider requires apiClient.mlTrainStep.');
    }

    const payload = {
      sessionId: this.sessionId,
      modelId: this.modelId,
      state: {
        objects: Array.isArray(state?.objects) ? state.objects : [],
        is2D: Boolean(state?.is2D),
        options: state?.options || {},
      },
    };

    return this.apiClient.mlTrainStep(payload);
  }

  async saveModel(model = {}) {
    if (!this.apiClient?.mlSaveModel) {
      throw new Error('MLProvider requires apiClient.mlSaveModel.');
    }

    return this.apiClient.mlSaveModel({
      modelId: model.id || this.modelId,
      sessionId: this.sessionId,
      payload: model,
    });
  }

  async loadModel(modelId) {
    if (!this.apiClient?.mlGetModel) {
      throw new Error('MLProvider requires apiClient.mlGetModel.');
    }

    const targetId = modelId || this.modelId;
    const loaded = await this.apiClient.mlGetModel(targetId);
    if (loaded?.id) {
      this.modelId = loaded.id;
    }
    return loaded;
  }
}
