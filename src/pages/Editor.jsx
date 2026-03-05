import { useEffect, useRef, useState } from 'react';
import ModelViewBar from '../components/ModelViewBar';
import { useActiveProject } from '../hooks/useActiveProject';
import { clearEngine, loadEngine, saveEngine } from '../lib/enginePersistence';
import { saveModel } from '../lib/modelStorage';
import { updateProject } from '../lib/projectStorage';
import { LightweightProvider } from '../lib/providers/lightweightProvider';
import { createTrainingEngine } from '../lib/realTrainingEngine';
// the provider abstraction allows swapping in a remote ML backend later


// Simplified editor shell to demonstrate integration
export default function Editor() {
  const { project, refreshActive } = useActiveProject();
  const [objects, setObjects] = useState([]);
  const [engine, setEngine] = useState(null); // kept for display/persistence
  const providerRef = useRef(null);
  const loopRef = useRef(null);

  // when project changes initialize provider/engine and restore any persisted state
  useEffect(() => {
    if (!project) return;
    setObjects(project.objects || []);

    // restore raw engine state (policy table etc) via legacy persistence helper
    const restoredEngine = loadEngine(project.id, () => createTrainingEngine('ppo'));

    // create lightweight provider – current default for the simplified editor
    const provider = new LightweightProvider('ppo');
    provider.init({ is2D: project.is2D });

    if (restoredEngine) {
      // copy over restored state into provider engine
      provider.engine = restoredEngine;
    }

    providerRef.current = provider;
    const eng = provider.getEngine();
    setEngine(eng);
  }, [project]);

  // training loop powered by provider.step – backwards compatible with lightweight engine
  useEffect(() => {
    if (!project || !providerRef.current) return;

    loopRef.current = setInterval(() => {
      const provider = providerRef.current;
      provider.step({ objects, is2D: project.is2D }).then((result) => {
        if (result.objects) setObjects(result.objects);

        // keep engine state in sync for persistence / UI
        const eng = provider.getEngine();
        if (result.stepMetrics?.totalSteps) eng.totalSteps = result.stepMetrics.totalSteps;
        setEngine(eng);

        saveEngine(project.id, eng);

        if (result.episodePoint?.solved) {
          saveModel(project.id, eng, {
            reward: result.episodePoint.reward,
            successRate: result.stepMetrics?.successRate || 0,
          });
        }
      }).catch((err) => {
        console.error('training step failed', err);
      });
    }, 200);
    return () => clearInterval(loopRef.current);
  }, [project, objects]);

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
