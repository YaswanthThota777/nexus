
export default function ModelCard({ model, onLoad, onDelete, onRename }) {
  const reward = model?.metrics?.reward ?? 0;
  const success = model?.metrics?.successRate ?? 0;
  const episodes = model?.engineState?.episode ?? 0;
  const created = model?.createdAt ? new Date(model.createdAt).toLocaleString() : '';
  const name = model?.name || model?.id;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(name || model.id || 'model').replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border border-gray-800 bg-[#111] rounded-lg p-3 shadow hover:shadow-lg transition space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-white truncate" title={name}>{name}</div>
        <div className="text-[11px] text-gray-500 truncate" title={model.id}>{model.id}</div>
      </div>
      <div className="text-[11px] text-gray-400">{created}</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-300">
        <div>Reward: <span className="text-white font-semibold">{reward}</span></div>
        <div>Success: <span className="text-white font-semibold">{success}%</span></div>
        <div>Episodes: <span className="text-white font-semibold">{episodes}</span></div>
        <div>Total Steps: <span className="text-white font-semibold">{model?.engineState?.totalSteps ?? 0}</span></div>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={onLoad}
          className="px-3 py-1 rounded-md bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400"
        >
          Load
        </button>
        <button
          onClick={onRename}
          className="px-3 py-1 rounded-md bg-sky-600 text-white text-sm font-semibold hover:bg-sky-500"
        >
          Rename
        </button>
        <button
          onClick={handleExport}
          className="px-3 py-1 rounded-md bg-gray-800 text-gray-100 text-sm border border-gray-700 hover:bg-gray-700"
        >
          Export
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1 rounded-md bg-red-700 text-white text-sm font-semibold hover:bg-red-600"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
