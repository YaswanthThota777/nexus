import { useRef, useState } from 'react';
import NewProjectModal from '../components/NewProjectModal';
import ProjectCard from '../components/ProjectCard';
import ProjectToolbar from '../components/ProjectToolbar';
import { useProjects } from '../hooks/useProjects';

export default function ProjectHub() {
  const {
    projects,
    handleCreate,
    handleDelete,
    handleOpen,
    handleImport,
    search,
    setSearch,
  } = useProjects();
  const [showNew, setShowNew] = useState(false);
  const importRef = useRef(null);

  const openProject = (id) => {
    const proj = handleOpen(id);
    if (proj) {
      window.location.href = '/editor';
    }
  };

  const onImportFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        handleImport(parsed);
      } catch (e) {
        console.error('Import failed', e);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Nexus AI Sim</h1>
            <p className="text-gray-400 text-sm">Unity Hub–style project manager for simulation workspaces.</p>
          </div>
          <span className="text-xs text-gray-500">Projects: {projects.length}</span>
        </div>

        <ProjectToolbar
          onCreateClick={() => setShowNew(true)}
          onImportClick={() => importRef.current?.click()}
          search={search}
          setSearch={setSearch}
        />

        <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={onImportFile} />

        {projects.length === 0 && (
          <div className="border border-dashed border-gray-700 rounded-xl p-10 text-center text-gray-400">
            No projects yet. Create or import to get started.
          </div>
        )}

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={openProject}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      <NewProjectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
