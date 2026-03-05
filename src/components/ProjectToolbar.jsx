
export default function ProjectToolbar({ onCreateClick, onImportClick, search, setSearch }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
      <div className="flex gap-2">
        <button
          onClick={onCreateClick}
          className="px-4 py-2 rounded-md bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
        >
          Create Project
        </button>
        <button
          onClick={onImportClick}
          className="px-4 py-2 rounded-md bg-gray-800 text-gray-100 border border-gray-700 hover:bg-gray-700"
        >
          Import Project
        </button>
      </div>
      <div className="flex-1 md:max-w-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md bg-[#0b0b0b] border border-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Search projects"
        />
      </div>
    </div>
  );
}
