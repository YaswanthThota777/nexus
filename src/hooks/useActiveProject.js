import { useCallback, useEffect, useState } from 'react';
import { getActiveProjectId, getProjects, setActiveProject } from '../lib/projectStorage';

export function useActiveProject() {
  const [activeId, setActiveId] = useState(() => getActiveProjectId());
  const [project, setProject] = useState(null);

  const load = useCallback(() => {
    const id = getActiveProjectId();
    setActiveId(id);
    if (!id) {
      setProject(null);
      return;
    }
    const found = getProjects().find((p) => p.id === id) || null;
    setProject(found);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setActive = useCallback((id) => {
    setActiveProject(id);
    load();
  }, [load]);

  return { activeId, project, setActive, refreshActive: load };
}
