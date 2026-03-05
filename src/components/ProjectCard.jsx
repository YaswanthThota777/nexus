
export default function ProjectCard({ project, onOpen, onDelete }) {
  const modelCount = project?.models?.length ?? 0;
  const objectCount = project?.objects?.length ?? 0;
  const lastOpened = project?.lastOpened
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(project.lastOpened))
    : 'never';

  return (
    <div className="border border-gray-800 bg-[#111] rounded-xl p-4 shadow-lg hover:shadow-2xl transition transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white truncate" title={project.name}>{project.name}</h3>
        <span className="text-[10px] uppercase tracking-wide text-gray-400">Project</span>
      </div>
      <p className="text-xs text-gray-400">last opened: {lastOpened}</p>
      <div className="flex gap-4 text-sm text-gray-300 mt-3">
        <span>objects: <span className="text-white font-semibold">{objectCount}</span></span>
        <span>models: <span className="text-white font-semibold">{modelCount}</span></span>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => onOpen(project.id)}
          className="px-3 py-2 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition"
        >
          Open
        </button>
        <button
          onClick={() => onDelete(project.id)}
          className="px-3 py-2 rounded-md bg-gray-800 text-gray-200 border border-gray-700 hover:bg-gray-700 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
