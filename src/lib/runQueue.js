const defaultDurations = {
  ppo: 4,
  sac: 5,
  ddpg: 5,
  bc: 3,
  hybrid: 6,
};

export function createRunQueueItem({ model, environment, robot, objectCount }) {
  const id = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const etaMinutes = defaultDurations[model] || 4;

  return {
    id,
    status: 'queued',
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    progress: 0,
    etaMinutes,
    config: {
      model,
      environment,
      robot,
      objectCount,
    },
  };
}

export function getQueueSummary(queue) {
  return {
    total: queue.length,
    queued: queue.filter((item) => item.status === 'queued').length,
    running: queue.filter((item) => item.status === 'running').length,
    completed: queue.filter((item) => item.status === 'completed').length,
    failed: queue.filter((item) => item.status === 'failed').length,
  };
}
