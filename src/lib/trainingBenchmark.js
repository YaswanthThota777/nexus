export function createBenchmarkTracker({ model, environment, is2D, seed }) {
  return {
    startedAt: Date.now(),
    model,
    environment,
    is2D,
    seed,
    episodes: 0,
    solvedEpisodes: 0,
    rewards: [],
    lastDistance: null,
    lastClearance: null,
  };
}

export function updateBenchmarkTracker(tracker, episodePoint) {
  if (!tracker || !episodePoint) return tracker;

  const rewards = [...tracker.rewards, Number(episodePoint.reward)];
  if (rewards.length > 200) rewards.shift();

  return {
    ...tracker,
    episodes: tracker.episodes + 1,
    solvedEpisodes: tracker.solvedEpisodes + (episodePoint.solved ? 1 : 0),
    rewards,
    lastDistance: episodePoint.distance ?? tracker.lastDistance,
    lastClearance: episodePoint.clearance ?? tracker.lastClearance,
  };
}

export function summarizeBenchmark(tracker) {
  if (!tracker || tracker.episodes === 0) {
    return {
      episodes: 0,
      successRate: 0,
      avgReward: 0,
      score: 0,
      durationSeconds: 0,
    };
  }

  const sumRewards = tracker.rewards.reduce((acc, value) => acc + value, 0);
  const avgReward = sumRewards / tracker.rewards.length;
  const successRate = tracker.solvedEpisodes / tracker.episodes;

  const rewardComponent = Math.max(0, Math.min(100, (avgReward + 50) * 1.0));
  const successComponent = successRate * 100;
  const clearanceComponent = typeof tracker.lastClearance === 'number'
    ? Math.max(0, Math.min(100, (tracker.lastClearance + 1) * 20))
    : 50;

  const score = Number((rewardComponent * 0.45 + successComponent * 0.45 + clearanceComponent * 0.1).toFixed(2));

  return {
    episodes: tracker.episodes,
    successRate: Number((successRate * 100).toFixed(1)),
    avgReward: Number(avgReward.toFixed(2)),
    score,
    durationSeconds: Number(((Date.now() - tracker.startedAt) / 1000).toFixed(1)),
  };
}
