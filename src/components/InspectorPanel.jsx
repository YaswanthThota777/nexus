import { Box, BrainCircuit, Crosshair, Move } from 'lucide-react';

function VectorField({ label, value = [0, 0, 0], onChange }) {
  const updateAxis = (index, axisValue) => {
    const next = [...value];
    next[index] = Number(axisValue) || 0;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-black">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {['X', 'Y', 'Z'].map((axis, index) => (
          <input
            key={axis}
            type="number"
            value={Number(value[index] || 0).toFixed(2)}
            onChange={(event) => updateAxis(index, event.target.value)}
            className="bg-[#111] border border-[#333] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-[#3a72b8]"
          />
        ))}
      </div>
    </div>
  );
}

export default function InspectorPanel({ selectedObject, isPlaying, updateObject, onAddSensorPod }) {
  return (
    <section className="h-full flex flex-col bg-[#2b2b2c] border-l border-[#1e1e1e]">
      <div className="h-9 bg-[#303031] flex items-center px-3 border-b border-[#1f1f1f] font-semibold text-[11px] text-gray-300 tracking-wide uppercase">
        Inspector
      </div>

      {!selectedObject ? (
        <div className="p-10 text-xs text-gray-500">Select an object to edit properties.</div>
      ) : (
        <div className={`p-3 space-y-4 overflow-y-auto ${isPlaying ? 'opacity-70 pointer-events-none' : ''}`}>
          <div className="space-y-2 border border-[#333] rounded-md bg-[#1f1f20] p-3">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-black">Name</div>
            <input
              value={selectedObject.name || ''}
              onChange={(event) => updateObject(selectedObject.id, 'name', event.target.value)}
              className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-sm text-white outline-none focus:border-[#3a72b8]"
            />
          </div>

          <div className="border border-[#333] rounded-md bg-[#1f1f20] p-3 space-y-3">
            <div className="text-[11px] text-gray-200 font-bold flex items-center gap-2"><Move size={14} /> Transform</div>
            <VectorField label="Position" value={selectedObject.pos} onChange={(value) => updateObject(selectedObject.id, 'pos', value)} />
            <VectorField label="Rotation" value={selectedObject.rot} onChange={(value) => updateObject(selectedObject.id, 'rot', value)} />
            <VectorField label="Scale" value={selectedObject.scale} onChange={(value) => updateObject(selectedObject.id, 'scale', value)} />
          </div>

          {selectedObject.agent && (
            <div className="border border-[#3a72b844] rounded-md bg-[#1f1f20] p-3 space-y-3">
              <div className="text-[11px] text-[#9fc3f0] font-bold flex items-center gap-2"><BrainCircuit size={14} /> Agent Parameters</div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">Agent Enabled</span>
                <input
                  type="checkbox"
                  checked={Boolean(selectedObject.agent)}
                  onChange={(event) => updateObject(selectedObject.id, 'agent', event.target.checked)}
                  className="accent-[#3a72b8]"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">Sensors</span>
                <input
                  type="checkbox"
                  checked={Boolean(selectedObject.sensors)}
                  onChange={(event) => updateObject(selectedObject.id, 'sensors', event.target.checked)}
                  className="accent-[#3a72b8]"
                />
              </div>
              <button
                onClick={() => onAddSensorPod(selectedObject.id)}
                className="w-full text-[10px] font-black uppercase tracking-wide px-3 py-2 border border-[#3a72b8] text-[#9fc3f0] rounded-sm hover:bg-[#233041]"
              >
                Add Sensor Pod
              </button>
            </div>
          )}

          {!selectedObject.agent && (
            <div className="border border-[#333] rounded-md bg-[#1f1f20] p-3 space-y-2">
              <div className="text-[11px] text-gray-200 font-bold flex items-center gap-2"><Box size={14} /> Object Properties</div>
              <div className="text-xs text-gray-400">Mass and material settings remain available via existing simulation object fields.</div>
            </div>
          )}

          <div className="border border-[#333] rounded-md bg-[#1f1f20] p-3 space-y-2">
            <div className="text-[11px] text-gray-200 font-bold flex items-center gap-2"><Crosshair size={14} /> Sensor Settings</div>
            <div className="text-xs text-gray-400">Real-time updates are applied immediately to scene state.</div>
          </div>
        </div>
      )}
    </section>
  );
}
