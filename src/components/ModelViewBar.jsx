import { useMemo, useState } from 'react';
import { useModels } from '../hooks/useModels';
import { renameModel } from '../lib/modelStorage';
import ModelCard from './ModelCard';

export default function ModelViewBar({ project, engineRef, onLoaded }) {
  const projectId = project?.projectId || project?.id;
  const { models, loadModel, deleteModel, refreshModels } = useModels(projectId, engineRef, onLoaded);
  const [sortMode, setSortMode] = useState('reward');

  const sortedModels = useMemo(() => {
    const copy = [...models];
    if (sortMode === 'recent') {
      return copy.sort((a, b) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());
    }

    if (sortMode === 'name') {
      return copy.sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
    }

    return copy.sort((a, b) => (b?.metrics?.reward || 0) - (a?.metrics?.reward || 0));
  }, [models, sortMode]);

  const handleRename = (modelId, currentName) => {
    const nextName = window.prompt('Enter model name', currentName || '');
    if (nextName === null) return;
    renameModel(modelId, nextName);
    refreshModels();
  };

  return (
    <aside className="w-full lg:w-[300px] bg-[#0f0f0f] border border-gray-800 rounded-xl p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Models</h3>
        <div className="flex items-center gap-2">
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="text-xs px-2 py-1 rounded-md bg-gray-900 text-gray-200 border border-gray-700"
            title="Sort models"
          >
            <option value="reward">Sort: Reward</option>
            <option value="recent">Sort: Recent</option>
            <option value="name">Sort: Name</option>
          </select>
          <button
            onClick={refreshModels}
            className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>
      {models.length === 0 ? (
        <div className="text-sm text-gray-400">No trained models yet.</div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {sortedModels.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              onLoad={() => loadModel(m.id)}
              onDelete={() => deleteModel(m.id)}
              onRename={() => handleRename(m.id, m.name || m.id)}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
