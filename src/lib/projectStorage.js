// Utility functions for managing Nexus projects in localStorage
const PROJECTS_KEY = 'nexus-projects';
const ACTIVE_PROJECT_KEY = 'nexus-active-project';

const safeParse = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) || typeof parsed === 'object' ? parsed : fallback;
  } catch (e) {
    console.warn('projectStorage parse error', e);
    return fallback;
  }
};

const persistProjects = (projects) => {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export function getProjects() {
  const raw = localStorage.getItem(PROJECTS_KEY);
  const list = safeParse(raw, []);
  return Array.isArray(list) ? list : [];
}

export function createProject(name) {
  const now = new Date().toISOString();
  const project = {
    id: crypto.randomUUID(),
    name: name || 'Untitled Project',
    createdAt: now,
    lastOpened: now,
    objects: [],
    runs: [],
    models: [],
    engineState: {
      epsilon: 1,
      episode: 0,
      totalSteps: 0,
      policyTable: [],
    },
  };
  const projects = getProjects();
  projects.unshift(project);
  persistProjects(projects);
  setActiveProject(project.id);
  return project;
}

export function deleteProject(projectId) {
  const filtered = getProjects().filter((p) => p.id !== projectId);
  persistProjects(filtered);
  const active = localStorage.getItem(ACTIVE_PROJECT_KEY);
  if (active === projectId) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export function updateProject(project) {
  if (!project?.id) return;
  const projects = getProjects();
  const next = projects.map((p) => (p.id === project.id ? { ...p, ...project } : p));
  persistProjects(next);
}

export function openProject(projectId) {
  const projects = getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return null;
  const updated = { ...project, lastOpened: new Date().toISOString() };
  const next = projects.map((p) => (p.id === projectId ? updated : p));
  persistProjects(next);
  setActiveProject(projectId);
  return updated;
}

export function setActiveProject(projectId) {
  if (projectId) {
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  } else {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}

export function getActiveProjectId() {
  return localStorage.getItem(ACTIVE_PROJECT_KEY) || null;
}

export function importProject(projectData) {
  if (!projectData?.id) {
    projectData.id = crypto.randomUUID();
  }
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === projectData.id);
  if (idx >= 0) projects[idx] = projectData;
  else projects.unshift(projectData);
  persistProjects(projects);
  setActiveProject(projectData.id);
  return projectData;
}
