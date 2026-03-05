import { createTrainingEngine, runTrainingStep } from '../realTrainingEngine';
import { TrainingProvider } from '../trainingProvider';

function normalizePolicyRow(values = {}) {
  return {
    steer: Number(values.steer) || 0,
    throttle: Number(values.throttle) || 0,
    value: Number(values.value) || 0,
    visits: Number(values.visits) || 0,
  };
}

export class LightweightProvider extends TrainingProvider {
  constructor(model = 'ppo') {
    super();
    this.model = model;
    this.engine = null;
    this.is2D = false;
  }

  async init(config = {}) {
    await super.init(config);
    this.model = config.model || this.model;
    this.is2D = Boolean(config.is2D);
    this.engine = createTrainingEngine(this.model, {
      deterministic: Boolean(config.deterministic),
      seed: config.seed,
    });
    return this;
  }

  getEngine() {
    return this.engine;
  }

  async step(state = {}) {
    const objects = Array.isArray(state?.objects) ? state.objects : [];
    return runTrainingStep(objects, this.engine, {
      is2D: Boolean(state?.is2D ?? this.is2D),
    });
  }

  async saveModel() {
    if (!this.engine) return null;
    return {
      policyTable: Array.from(this.engine.policyTable?.entries?.() || []),
      engineState: {
        epsilon: this.engine.epsilon,
        episode: this.engine.episode,
        totalSteps: this.engine.totalSteps,
      },
    };
  }

  async loadModel(model) {
    if (!this.engine || !model) return null;

    const rows = Array.isArray(model.policyTable) ? model.policyTable : [];
    this.engine.policyTable = new Map(
      rows
        .filter((entry) => Array.isArray(entry) && typeof entry[0] === 'string')
        .map(([stateKey, values]) => [stateKey, normalizePolicyRow(values)]),
    );

    this.engine.epsilon = Number(model.engineState?.epsilon ?? this.engine.epsilon);
    this.engine.episode = Number(model.engineState?.episode ?? this.engine.episode);
    this.engine.totalSteps = Number(model.engineState?.totalSteps ?? this.engine.totalSteps);
    return this.engine;
  }
}
