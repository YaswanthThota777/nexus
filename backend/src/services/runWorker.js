import { broadcast } from '../realtime.js';
import { db } from '../store.js';
import { stepRunWithProvider } from './simBridge.js';

let ticker;
let tickInFlight = false;

export function startRunWorker() {
  if (ticker) return;

  ticker = setInterval(async () => {
    if (tickInFlight) return;
    tickInFlight = true;

    const runs = [...db.runs.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    try {
      for (const run of runs) {
        if (run.status === 'completed' || run.status === 'failed') {
          continue;
        }

        const updatedRun = await stepRunWithProvider(run.id);
        if (!updatedRun) return;
        broadcast({
          type: 'run.metrics.updated',
          runId: updatedRun.id,
          status: updatedRun.status,
          progress: updatedRun.progress,
          metrics: updatedRun.metrics,
          provider: updatedRun.provider,
          failureReason: updatedRun.failureReason || null,
        });
        break;
      }

      return;
    } finally {
      tickInFlight = false;
    }
  }, 1200);
}

export function stopRunWorker() {
  if (ticker) clearInterval(ticker);
  ticker = undefined;
}
