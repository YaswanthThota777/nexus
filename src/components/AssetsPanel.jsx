import { Bot, Box, Folder, Layers, TerminalSquare } from 'lucide-react';
import ModelViewBar from './ModelViewBar';

function AssetChip({ label, type, onAdd }) {
  return (
    <button
      draggable
      onDragStart={(event) => event.dataTransfer.setData('application/x-nexus-asset-type', type)}
      onDoubleClick={() => onAdd(type)}
      className="px-3 py-2 rounded-md border border-[#3d3d3f] bg-[#181818] text-gray-300 text-xs font-bold hover:bg-[#233041] hover:border-[#3a72b8] transition-colors"
      title="Double-click to add, or drag into Scene View"
    >
      {label}
    </button>
  );
}

export default function AssetsPanel({
  workspace,
  engineRef,
  onModelLoaded,
  onAddAsset,
  trainingData,
  isTraining,
}) {
  return (
    <section className="h-full flex bg-[#252526] border-t border-[#222] min-h-0">
      <div className="w-[320px] min-w-[280px] border-r border-[#333] p-3 overflow-y-auto">
        <div className="text-[11px] font-black uppercase tracking-wider text-gray-300 mb-3 flex items-center gap-2"><Folder size={14} /> Saved Models</div>
        <ModelViewBar project={workspace} engineRef={engineRef} onLoaded={onModelLoaded} />
      </div>

      <div className="flex-1 p-3 overflow-y-auto space-y-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-gray-300 mb-2 flex items-center gap-2"><Layers size={14} /> Environment Templates</div>
          <div className="flex flex-wrap gap-2">
            <AssetChip label="Obstacle Field" type="cube" onAdd={onAddAsset} />
            <AssetChip label="Goal Marker" type="sphere" onAdd={onAddAsset} />
            <AssetChip label="Ground Plane" type="plane" onAdd={onAddAsset} />
            <AssetChip label="Light Source" type="light" onAdd={onAddAsset} />
          </div>
        </div>

        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-gray-300 mb-2 flex items-center gap-2"><Bot size={14} /> Robot Presets</div>
          <div className="flex flex-wrap gap-2">
            <AssetChip label="Rover" type="rover" onAdd={onAddAsset} />
            <AssetChip label="Drone" type="drone" onAdd={onAddAsset} />
            <AssetChip label="Humanoid" type="humanoid" onAdd={onAddAsset} />
            <AssetChip label="Robotic Arm" type="robotic_arm" onAdd={onAddAsset} />
          </div>
        </div>

        <div className="border border-[#333] rounded-md p-3 bg-[#1a1a1b]">
          <div className="text-[11px] font-black uppercase tracking-wider text-gray-300 mb-2 flex items-center gap-2"><TerminalSquare size={14} /> Training Snapshot</div>
          <div className="text-xs text-gray-400">Samples: {trainingData.length}</div>
          <div className="text-xs text-gray-400">Status: <span className={isTraining ? 'text-[#9fc3f0]' : 'text-gray-300'}>{isTraining ? 'Running' : 'Idle'}</span></div>
        </div>

        <div className="text-[10px] text-gray-500 flex items-center gap-2">
          <Box size={12} /> Drag assets into Scene View to spawn or double-click chips to add directly.
        </div>
      </div>
    </section>
  );
}
