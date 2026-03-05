import { useCallback, useEffect, useState } from 'react';
import {
    createProject,
    deleteProject,
    getProjects,
    importProject,
    openProject,
    updateProject,
} from '../lib/projectStorage';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => {
    const list = getProjects();
    setProjects(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = useCallback((name) => {
    const project = createProject(name);
    refresh();
    return project;
  }, [refresh]);

  const handleDelete = useCallback((id) => {
    deleteProject(id);
    refresh();
  }, [refresh]);

  const handleUpdate = useCallback((project) => {
    updateProject(project);
    refresh();
  }, [refresh]);

  const handleOpen = useCallback((id) => {
    const project = openProject(id);
    refresh();
    return project;
  }, [refresh]);

  const handleImport = useCallback((data) => {
    const project = importProject(data);
    refresh();
    return project;
  }, [refresh]);

  const filtered = projects.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  return {
    projects: filtered,
    rawProjects: projects,
    search,
    setSearch,
    refresh,
    handleCreate,
    handleDelete,
    handleUpdate,
    handleOpen,
    handleImport,
  };
}
