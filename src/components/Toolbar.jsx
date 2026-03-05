import { Activity, BrainCircuit, Play, Square } from 'lucide-react';

export default function Toolbar({
  isPlaying,
  isTraining,
  onTogglePlay,
  onToggleTraining,
  onTestModels,
  trainingEpoch,
  latestEpisodeMetrics,
  providerStatusLabel,
  providerStatusClass,
  providerStatusTitle,
  trainingMode,
  setTrainingMode,
}) {
  return (
    <div className="h-12 bg-[#383838] border-b border-[#252526] flex items-center px-3 justify-between z-10 flex-shrink-0 select-none gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`px-4 py-1.5 rounded-sm flex items-center justify-center transition-all duration-200 shadow-lg border ${isPlaying ? 'bg-[#c94b4b] text-white border-[#a23a3a] hover:bg-[#a23a3a]' : 'bg-[#2b2b2c] text-gray-200 border-[#4f4f52] hover:bg-[#3a72b8] hover:text-white hover:border-[#3a72b8]'}`}
          title="Start / stop simulation"
        >
          {isPlaying ? <Square size={15} className="mr-2 fill-current" /> : <Play size={15} className="mr-2 fill-current" />}
          <span className="font-extrabold tracking-wide text-[11px]">{isPlaying ? 'STOP' : 'PLAY'}</span>
        </button>

        <button
          onClick={onToggleTraining}
          className={`px-4 py-1.5 rounded-sm font-extrabold text-[11px] flex items-center space-x-2 transition-all duration-300 shadow-inner border uppercase tracking-wide ${
            isTraining ? 'bg-[#3a72b8] text-white border-[#2b5f9f] shadow-[0_0_16px_rgba(58,114,184,0.45)]' : 'bg-[#2b3442] text-[#9fc3f0] border-[#3a72b8] hover:bg-[#344a64]'
          }`}
        >
          <BrainCircuit size={16} className={isTraining ? 'animate-pulse' : ''} />
          <span>{isTraining ? 'HALT TRAINING' : 'PLAY & TRAIN'}</span>
        </button>

        <button
          onClick={onTestModels}
          className="px-3 py-1.5 rounded-sm border border-[#4f4f52] bg-[#2b2b2c] text-gray-200 hover:bg-[#3a72b8] hover:border-[#3a72b8] text-[11px] font-extrabold uppercase tracking-wide"
        >
          Test Models
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={trainingMode}
          onChange={(event) => setTrainingMode(event.target.value)}
          className="px-2 py-1 rounded-sm bg-[#2b2b2c] text-gray-200 border border-[#4f4f52] text-[11px] font-bold"
          disabled={isTraining}
        >
          <option value="lightweight">Lightweight RL</option>
          <option value="ml">ML Backend</option>
        </select>

        <span
          className={`px-2 py-1 rounded-sm bg-[#2b2b2c] border border-[#4f4f52] text-[10px] font-black tracking-wide ${providerStatusClass}`}
          title={providerStatusTitle}
        >
          {providerStatusLabel}
        </span>

        <div className="text-[11px] font-mono text-gray-300 bg-[#2b2b2c] border border-[#4b4b4e] rounded-sm px-3 py-1.5 flex items-center gap-2">
          <Activity size={13} className={isTraining ? 'text-[#9fc3f0] animate-pulse' : 'text-gray-500'} />
          <span>Ep {Number(trainingEpoch || 0)}</span>
          <span className="text-gray-500">|</span>
          <span>Reward {Number(latestEpisodeMetrics?.reward || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
