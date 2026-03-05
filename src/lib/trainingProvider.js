export class TrainingProvider {
  async init(config = {}) {
    this.config = config;
    return this;
  }

  async step(_state) {
    throw new Error('TrainingProvider.step must be implemented by provider.');
  }

  async saveModel() {
    throw new Error('TrainingProvider.saveModel must be implemented by provider.');
  }

  async loadModel(_model) {
    throw new Error('TrainingProvider.loadModel must be implemented by provider.');
  }
}

export function isTrainingProvider(value) {
  return Boolean(value)
    && typeof value.init === 'function'
    && typeof value.step === 'function'
    && typeof value.saveModel === 'function'
    && typeof value.loadModel === 'function';
}
