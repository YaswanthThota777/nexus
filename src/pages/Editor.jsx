import { useEffect, useRef, useState } from 'react';
import ModelViewBar from '../components/ModelViewBar';
import { useActiveProject } from '../hooks/useActiveProject';
import { clearEngine, loadEngine, saveEngine } from '../lib/enginePersistence';
import { saveModel } from '../lib/modelStorage';
import { updateProject } from '../lib/projectStorage';
import { createTrainingEngine, runTrainingStep } from '../lib/realTrainingEngine';

// Simplified editor shell to demonstrate integration
export default function Editor() {
  const { project, refreshActive } = useActiveProject();
  const [objects, setObjects] = useState([]);
  const [engine, setEngine] = useState(null);
  const loopRef = useRef(null);

  useEffect(() => {
    if (!project) return;
    setObjects(project.objects || []);
    const restored = loadEngine(project.id, () => createTrainingEngine('ppo'));
    setEngine(restored || createTrainingEngine('ppo'));
  }, [project]);

  useEffect(() => {
    if (!project || !engine) return;
    loopRef.current = setInterval(() => {
      const result = runTrainingStep(objects, engine, { is2D: project.is2D });
      if (result.objects) setObjects(result.objects);
      if (result.stepMetrics?.totalSteps) engine.totalSteps = result.stepMetrics.totalSteps;
      saveEngine(project.id, engine);
      if (result.episodePoint?.solved) {
        saveModel(project.id, engine, {
          reward: result.episodePoint.reward,
          successRate: result.stepMetrics?.successRate || 0,
        });
      }
    }, 200);
    return () => clearInterval(loopRef.current);
  }, [project, engine, objects]);

  // Save objects and engine when leaving
  useEffect(() => {
    return () => {
      if (project && engine) {
        const updated = { ...project, objects };
        updateProject(updated);
        saveEngine(project.id, engine);
      }
    };
  }, [project, engine, objects]);

  if (!project) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <p>No active project.</p>
          <button
            onClick={() => { window.location.href = '/'; refreshActive(); }}
            className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold"
          >
            Back to Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Editor: {project.name}</h1>
          <p className="text-gray-400 text-sm">Objects: {objects.length} | Engine epsilon: {engine?.epsilon?.toFixed?.(3)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { if (project && engine) saveEngine(project.id, engine); }}
            className="px-3 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700"
          >
            Save State
          </button>
          <button
            onClick={() => { if (project) { clearEngine(project.id); refreshActive(); }}}
            className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-500"
          >
            Reset Engine
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="border border-dashed border-gray-700 rounded-xl p-6 text-gray-300 min-h-[400px]">
          <p className="text-sm">Simulation canvas placeholder. Integrate your scene renderer and controls here.</p>
        </div>
        <ModelViewBar
          project={project}
          engineRef={engine ? { current: engine } : { current: null }}
          onLoaded={(m) => {
            console.info('Model loaded successfully.', m.id);
          }}
        />
      </div>
    </div>
  );
}
