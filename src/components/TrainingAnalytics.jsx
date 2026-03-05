import { useMemo } from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

function toSuccessRate(history, index, windowSize = 12) {
  const start = Math.max(0, index - windowSize + 1);
  const window = history.slice(start, index + 1);
  if (window.length === 0) return 0;
  const solved = window.filter((item) => Boolean(item?.solved)).length;
  return Number(((solved / window.length) * 100).toFixed(2));
}

export default function TrainingAnalytics({ trainingData = [], isTraining }) {
  const chartData = useMemo(() => (
    trainingData.map((item, index) => ({
      episode: item.episode ?? index + 1,
      reward: Number(item.reward ?? 0),
      epsilon: Number(item.epsilon ?? 0),
      successRate: toSuccessRate(trainingData, index),
    }))
  ), [trainingData]);

  return (
    <div className="flex-1 border-2 border-[#333] bg-[#0a0a0a] rounded-xl relative overflow-hidden min-h-[220px] shadow-inner p-2">
      {chartData.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm font-black tracking-widest uppercase select-none">
          {isTraining ? 'Collecting Metrics' : 'Awaiting Training Session'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 12, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="#262626" strokeDasharray="4 4" />
            <XAxis dataKey="episode" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#3f3f46" />
            <YAxis yAxisId="reward" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#3f3f46" />
            <YAxis yAxisId="ratio" orientation="right" tick={{ fill: '#9ca3af', fontSize: 11 }} stroke="#3f3f46" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111827',
                borderColor: '#334155',
                color: '#e5e7eb',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
            <Line yAxisId="reward" type="monotone" dataKey="reward" stroke="#3a72b8" dot={false} strokeWidth={2} name="Reward" />
            <Line yAxisId="ratio" type="monotone" dataKey="epsilon" stroke="#facc15" dot={false} strokeWidth={2} name="Epsilon" />
            <Line yAxisId="ratio" type="monotone" dataKey="successRate" stroke="#22c55e" dot={false} strokeWidth={2} name="Success Rate (%)" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
