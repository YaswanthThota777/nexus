import {
  Activity,
  BookOpen,
  Box,
  Car,
  CheckCircle,
  ChevronRight,
  ChevronsDown,
  ChevronsRight,
  Circle,
  Copy,
  Cpu,
  Crosshair,
  Download,
  Folder,
  FolderPlus,
  Grid,
  HardDrive,
  Home,
  Info,
  Keyboard,
  Layers,
  LayoutTemplate,
  Link,
  Mountain,
  Plane,
  Play,
  PlusCircle,
  Rocket,
  ShieldCheck,
  Bug as SpiderIcon,
  Square,
  TerminalSquare,
  Trash,
  Trash2,
  Upload,
  Users,
  Waves,
  X,
  Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import AssetsPanel from './components/AssetsPanel';
import HierarchyPanel from './components/HierarchyPanel';
import InspectorPanel from './components/InspectorPanel';
import SceneView from './components/SceneView';
import TemplateMarketplaceModal from './components/TemplateMarketplaceModal';
import Toolbar from './components/Toolbar';
import UniversalTemplateBuilder from './components/UniversalTemplateBuilder';
import { apiClient } from './lib/apiClient';
import { buildLaunchEvidencePack } from './lib/launchEvidencePack';
import { saveModel } from './lib/modelStorage';
import { createProjectExportPayload, validateProjectImportPayload } from './lib/projectSchema';
import { createTrainingEngine, runTrainingStep } from './lib/realTrainingEngine';
import { createRunQueueItem, getQueueSummary } from './lib/runQueue';
import { evaluateSimReadiness, runReadinessScenarioSuite } from './lib/simReadiness';
import {
  HERO_TEMPLATE_PRESETS,
  compileTemplateToScene,
  createDefaultTemplateSpec,
  getModelCompatibility,
  getModelProfile,
  normalizeSceneForEditor,
} from './lib/templateEngine';
import { createBenchmarkTracker, summarizeBenchmark, updateBenchmarkTracker } from './lib/trainingBenchmark';

const TRAINING_STEP_INTERVAL_MS = 50;

// --- GLOBAL STYLES ---
const globalStyles = `
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #151515; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }
  input[type="number"]::-webkit-inner-spin-button, 
  input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
  .no-select { user-select: none; -webkit-user-select: none; }
`;


function UnityAIStudio({ initialAppState = 'hub', onEnterEditor, onExitHub }) {
  const [appState, setAppState] = useState(initialAppState);
  const [project, setProject] = useState(null);

  useEffect(() => {
    setAppState(initialAppState);
  }, [initialAppState]);

  useEffect(() => {
    if (initialAppState === 'editor' && !project) {
      setProject({
        name: 'Untitled Project',
        template: 'custom',
        projectId: `route-editor-${Date.now()}`,
        templateSpec: createDefaultTemplateSpec(),
        config: {},
      });
    }
  }, [initialAppState, project]);

  if (appState === 'hub') {
    return (
      <>
        <style>{globalStyles}</style>
        <ProjectHub onLaunch={(proj) => {
          setProject(proj);
          setAppState('editor');
          if (typeof onEnterEditor === 'function') onEnterEditor();
        }} />
      </>
    );
  }
  return (
    <>
      <style>{globalStyles}</style>
      <Editor workspace={project} onExit={() => {
        setAppState('hub');
        if (typeof onExitHub === 'function') onExitHub();
      }} />
    </>
  );
}

function RootRouteWrapper() {
  const navigate = useNavigate();
  return (
    <UnityAIStudio
      initialAppState="hub"
      onEnterEditor={() => navigate('/editor')}
      onExitHub={() => navigate('/')}
    />
  );
}

function EditorRouteWrapper() {
  const navigate = useNavigate();
  return (
    <UnityAIStudio
      initialAppState="editor"
      onEnterEditor={() => navigate('/editor')}
      onExitHub={() => navigate('/')}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRouteWrapper />} />
        <Route path="/editor" element={<EditorRouteWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

export { UnityAIStudio };
export default App;

// --- PROJECT HUB ---
function ProjectHub({ onLaunch }) {
  const [activeTab, setActiveTab] = useState('projects');
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const [showQuickWizard, setShowQuickWizard] = useState(false);

  const difficultyRank = { easy: 1, intermediate: 2, expert: 3 };

  const heroPresetIconByRobot = {
    quadruped: <Mountain size={24} />,
    arm6dof: <Activity size={24} />,
    rover: <Rocket size={24} />,
    drone: <Plane size={24} />,
    humanoid: <Users size={24} />,
  };

  const templates = [
    { id: 'warehouse', name: 'Logistics Factory', type: '3D Sim2Real', icon: <Layers size={32} />, desc: 'Nvidia Isaac-style warehouse with robotic arms and conveyors.', isPremium: true },
    { id: 'city-car', name: 'Autonomous City', type: '3D Autonomous', icon: <Car size={32} />, desc: 'Urban environment for self-driving cars with Raycast LiDAR.' },
    { id: 'mountain-dog', name: 'Mountain Quadruped', type: '3D Articulated', icon: <Mountain size={32} />, desc: 'Uneven terrain for 4-legged robot balancing and locomotion.', isPremium: true },
    { id: 'house-cleaner', name: 'Smart Home', type: '3D Nav', icon: <Home size={32} />, desc: 'Indoor environment for vacuum robots mapping and obstacle avoidance.' },
    { id: 'desert-spider', name: 'Desert Hexapod', type: '3D Kinematics', icon: <SpiderIcon size={32} />, desc: 'Complex multi-limb spider robot on sandy dune terrain.' },
    { id: 'sea-drone', name: 'Underwater ROV', type: '3D Fluid Dynamics', icon: <Waves size={32} />, desc: 'Submarine drone in volumetric water with buoyancy physics.' },
    { id: 'mars-rover', name: 'Mars Rover Nav', type: '3D Space', icon: <Rocket size={32} />, desc: 'Train a 6-wheeled rover to navigate uneven alien terrain.' },
    { id: '2d-grid', name: '2D Deep RL', type: '2D Orthographic', icon: <Grid size={32} />, desc: 'Lightweight 2D grid engine for fast Q-Learning and Pathfinding.' },
  ];

  const sortedHeroPresets = [...HERO_TEMPLATE_PRESETS].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) {
      return a.featured ? -1 : 1;
    }
    const rankA = difficultyRank[a.difficulty] || 99;
    const rankB = difficultyRank[b.difficulty] || 99;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });

  const launchHeroPreset = (preset) => {
    onLaunch({
      name: `${preset.name} Project`,
      template: 'custom',
      projectId: `hero-${preset.id}-${preset.spec.environment}-${preset.spec.model}`,
      is2D: preset.spec.environment === 'grid2d',
      templateSpec: preset.spec,
      config: {
        environment: preset.spec.environment,
        robot: preset.spec.robot,
        model: preset.spec.model,
      },
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#d2d2d2] font-sans flex flex-col">
      <div className="p-6 bg-[#050505] border-b border-[#222] flex items-center justify-between shadow-2xl z-10">
        <div className="flex items-center space-x-3">
          <Cpu size={28} className="text-[#00ffcc]" />
          <h1 className="text-2xl font-semibold text-white tracking-wide">Nexus AI <span className="text-sm font-normal text-gray-500">Enterprise Sim2Real Engine</span></h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-xs text-[#00ffcc] flex items-center bg-[#00ffcc11] px-3 py-1 rounded-full border border-[#00ffcc44]"><ShieldCheck size={14} className="mr-1"/> Licensed to Yaswanth</div>
          <div className="text-sm bg-[#222] px-3 py-1 rounded-full border border-[#444]">v2026.9 Ultimate</div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 bg-[#111] border-r border-[#222] p-4 flex flex-col space-y-2">
          <SidebarButton icon={<Folder size={18}/>} label="Projects" active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
          <SidebarButton icon={<HardDrive size={18}/>} label="Core Installs" active={activeTab === 'installs'} onClick={() => setActiveTab('installs')} />
          <SidebarButton icon={<BookOpen size={18}/>} label="Sim2Real Academy" active={activeTab === 'learn'} onClick={() => setActiveTab('learn')} />
          <SidebarButton icon={<Link size={18}/>} label="ROS2 / Hardware Bridge" active={activeTab === 'ros'} onClick={() => setActiveTab('ros')} />
        </div>
        
        <div className="flex-1 p-10 overflow-y-auto bg-[#151515]">
          {activeTab === 'projects' && (
            <>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl text-white font-light tracking-tight">Select Simulation Template</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowQuickWizard(true)}
                    className="bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white border border-[#333] font-bold px-5 py-2.5 rounded-md transition"
                  >
                    Quick Build Wizard
                  </button>
                  <button
                    onClick={() => setShowMarketplace(true)}
                    className="bg-[#1e1e1e] hover:bg-[#2a2a2a] text-white border border-[#333] font-bold px-5 py-2.5 rounded-md transition"
                  >
                    Template Marketplace
                  </button>
                  <button
                    onClick={() => setShowCustomBuilder(true)}
                    className="bg-[#00ffcc] hover:bg-[#00ccaa] text-black font-bold px-6 py-2.5 rounded-md shadow-[0_0_15px_rgba(0,255,204,0.3)] transition"
                  >
                    Create Advanced Project
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {templates.map(tmpl => (
                  <div 
                    key={tmpl.id} 
                    onClick={() => onLaunch({
                      name: `${tmpl.name} Environment`,
                      template: tmpl.id,
                      is2D: tmpl.type.includes('2D'),
                      projectId: `${tmpl.id}-${Date.now()}`,
                    })}
                    className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6 cursor-pointer hover:border-[#00ffcc] hover:bg-[#2a2a2a] shadow-lg hover:shadow-[0_0_20px_rgba(0,255,204,0.1)] transition-all duration-300 group relative overflow-hidden flex flex-col"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#00ffcc11] to-transparent rounded-bl-full"></div>
                    <div className="mb-5 text-[#555] group-hover:text-[#00ffcc] transition-colors scale-110 origin-left">{tmpl.icon}</div>
                    <h3 className="text-lg text-white font-bold mb-1 flex items-center">
                      {tmpl.name}
                      {tmpl.isPremium && <span className="ml-2 px-1.5 py-0.5 bg-gradient-to-r from-yellow-600 to-yellow-400 text-black text-[9px] rounded uppercase font-black tracking-widest shadow-sm">Pro</span>}
                    </h3>
                    <div className="text-[10px] font-bold text-[#aaa] mb-3 bg-[#111] border border-[#333] inline-block px-2 py-1 rounded w-max uppercase tracking-wider">{tmpl.type}</div>
                    <p className="text-sm text-[#777] flex-1">{tmpl.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 mb-5 flex items-center justify-between">
                <h3 className="text-2xl text-white font-light tracking-tight">Hero Robot Presets</h3>
                <span className="text-xs text-[#9fc3f0] border border-[#2a4a64] bg-[#1a2633] px-3 py-1 rounded-full font-bold tracking-wide uppercase">One-Click Advanced Launch</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedHeroPresets.map((preset, index) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => launchHeroPreset(preset)}
                    className="text-left bg-[#1a1a1a] border border-[#333] rounded-xl p-6 hover:border-[#3a72b8] hover:bg-[#222] shadow-lg hover:shadow-[0_0_20px_rgba(58,114,184,0.18)] transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#3a72b81c] to-transparent rounded-bl-full" />
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      {preset.featured && (
                        <span className="px-2 py-0.5 rounded bg-[#f59e0b] text-black text-[9px] font-black uppercase tracking-wider border border-[#fbbf24]">
                          Featured
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                        preset.difficulty === 'easy'
                          ? 'bg-green-900/40 text-green-300 border-green-700/60'
                          : preset.difficulty === 'intermediate'
                            ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700/60'
                            : 'bg-red-900/40 text-red-300 border-red-700/60'
                      }`}>
                        {preset.difficulty || 'expert'}
                      </span>
                    </div>
                    <div className="mb-4 text-[#6b7280] group-hover:text-[#9fc3f0] transition-colors">
                      {heroPresetIconByRobot[preset.spec.robot] || <Cpu size={24} />}
                    </div>
                    <div className="text-base text-white font-bold mb-1">{preset.name}</div>
                    <div className="text-[10px] text-gray-500 mb-2 font-bold tracking-widest uppercase">Rank #{index + 1}</div>
                    <div className="text-[10px] font-bold text-[#9fc3f0] mb-3 bg-[#111] border border-[#2f3f51] inline-block px-2 py-1 rounded uppercase tracking-wider">
                      {preset.spec.robotProfile} · {preset.spec.model}
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      Env: {preset.spec.environment} · Task: {preset.spec.task} · Sensors: {preset.spec.sensorProfile}
                    </div>
                    <p className="text-sm text-[#8b8b8b]">{preset.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showCustomBuilder && (
        <UniversalTemplateBuilder
          onClose={() => setShowCustomBuilder(false)}
          onCreate={(projectConfig) => {
            onLaunch(projectConfig);
            setShowCustomBuilder(false);
          }}
        />
      )}

      {showQuickWizard && (
        <QuickBuildWizardModal
          onClose={() => setShowQuickWizard(false)}
          onCreate={(projectConfig) => {
            onLaunch(projectConfig);
            setShowQuickWizard(false);
          }}
        />
      )}

      {showMarketplace && (
        <TemplateMarketplaceModal
          onClose={() => setShowMarketplace(false)}
          onUseTemplate={(projectConfig) => {
            onLaunch(projectConfig);
            setShowMarketplace(false);
          }}
        />
      )}
    </div>
  );
}

function buildWizardSpec({ mission, domain, fidelity }) {
  const base = createDefaultTemplateSpec();

  if (mission === 'navigation') {
    base.task = 'navigation';
    base.robot = 'rover';
    base.robotProfile = 'perseus-rover';
    base.model = 'ppo';
    base.sensorProfile = 'fusion';
    base.environment = 'city';
  }

  if (mission === 'inspection') {
    base.task = 'inspection';
    base.robot = 'drone';
    base.robotProfile = 'aerial-ranger';
    base.model = 'hybrid';
    base.sensorProfile = 'fusion';
    base.environment = 'warehouse';
  }

  if (mission === 'manipulation') {
    base.task = 'pick_place';
    base.robot = 'arm6dof';
    base.robotProfile = 'ur10-pro';
    base.model = 'ddpg';
    base.sensorProfile = 'vision';
    base.environment = 'warehouse';
  }

  if (mission === 'balance') {
    base.task = 'balance';
    base.robot = 'humanoid';
    base.robotProfile = 'atlas-nx';
    base.model = 'ppo';
    base.sensorProfile = 'vision';
    base.environment = 'terrain';
  }

  if (domain === 'industrial') {
    base.environment = 'warehouse';
    base.lightIntensity = 1.35;
  }
  if (domain === 'outdoor') {
    base.environment = 'terrain';
    base.lightIntensity = 1.25;
  }
  if (domain === 'aerial') {
    base.environment = 'city';
    if (base.robot !== 'drone') {
      base.robot = 'drone';
      base.robotProfile = 'aerial-ranger';
      base.model = 'sac';
      base.sensorProfile = 'fusion';
    }
  }
  if (domain === 'extreme') {
    base.environment = 'space';
    if (base.robot === 'rover') {
      base.robotProfile = 'perseus-rover';
    }
    base.lightIntensity = 1.45;
  }

  if (fidelity === 'starter') {
    base.obstacleDensity = 25;
    base.arenaScale = 140;
    base.elevationVariance = 0.3;
    base.domainRandomization = false;
  }
  if (fidelity === 'pro') {
    base.obstacleDensity = 45;
    base.arenaScale = 185;
    base.elevationVariance = 0.8;
    base.domainRandomization = true;
  }
  if (fidelity === 'enterprise') {
    base.obstacleDensity = 65;
    base.arenaScale = 240;
    base.elevationVariance = 1.2;
    base.domainRandomization = true;
    base.sensorProfile = 'fusion';
  }

  return base;
}

function QuickBuildWizardModal({ onClose, onCreate }) {
  const [projectName, setProjectName] = useState('Company Grade Simulation');
  const [mission, setMission] = useState('navigation');
  const [domain, setDomain] = useState('industrial');
  const [fidelity, setFidelity] = useState('pro');

  const missionHelp = {
    navigation: 'Goal-reaching with obstacle avoidance and route efficiency.',
    inspection: 'Coverage and waypoint patrol with rich sensor sweeps.',
    manipulation: 'Pick/place precision workflows for robotic arm operations.',
    balance: 'Posture stability and perturbation recovery tasks.',
  };

  const domainHelp = {
    industrial: 'Warehouse and factory style environments with structured geometry.',
    outdoor: 'Rugged uneven terrain with natural obstacle layouts.',
    aerial: 'Open urban airspace for drone-heavy mission profiles.',
    extreme: 'Harsh low-feature environments for stress and robustness testing.',
  };

  const fidelityHelp = {
    starter: 'Fast setup, lower complexity, great for quick iterations.',
    pro: 'Balanced realism and speed for daily development loops.',
    enterprise: 'Maximum scene richness and randomization for production-grade validation.',
  };

  const wizardSpec = useMemo(() => buildWizardSpec({ mission, domain, fidelity }), [mission, domain, fidelity]);
  const compatibility = useMemo(() => getModelCompatibility(wizardSpec), [wizardSpec]);

  const handleCreate = () => {
    if (!compatibility.compatible) return;
    onCreate({
      name: projectName.trim() || 'Company Grade Simulation',
      template: 'custom',
      projectId: `wizard-${mission}-${domain}-${fidelity}-${wizardSpec.robot}-${wizardSpec.model}`,
      is2D: wizardSpec.environment === 'grid2d',
      templateSpec: wizardSpec,
      config: {
        environment: wizardSpec.environment,
        robot: wizardSpec.robot,
        model: wizardSpec.model,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#111] border border-[#333] rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Quick Build Wizard</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <label>
            <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Project Name</div>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-white outline-none focus:border-[#00ffcc]"
              placeholder="Enter project name"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label>
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Mission</div>
              <select value={mission} onChange={(e) => setMission(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-white outline-none focus:border-[#00ffcc]">
                <option value="navigation">Navigation</option>
                <option value="inspection">Inspection</option>
                <option value="manipulation">Manipulation</option>
                <option value="balance">Balance</option>
              </select>
              <div className="mt-2 text-[10px] text-gray-500 leading-relaxed">{missionHelp[mission]}</div>
            </label>

            <label>
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Domain</div>
              <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-white outline-none focus:border-[#00ffcc]">
                <option value="industrial">Industrial</option>
                <option value="outdoor">Outdoor</option>
                <option value="aerial">Aerial</option>
                <option value="extreme">Extreme</option>
              </select>
              <div className="mt-2 text-[10px] text-gray-500 leading-relaxed">{domainHelp[domain]}</div>
            </label>

            <label>
              <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Fidelity</div>
              <select value={fidelity} onChange={(e) => setFidelity(e.target.value)} className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-white outline-none focus:border-[#00ffcc]">
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <div className="mt-2 text-[10px] text-gray-500 leading-relaxed">{fidelityHelp[fidelity]}</div>
            </label>
          </div>

          <div className="text-xs border rounded-md px-3 py-3 bg-[#0f0f0f] border-[#2a2a2a] text-gray-300">
            <div className="font-black uppercase tracking-wider text-[#9fc3f0] mb-2">Auto Configuration Preview</div>
            <div>Environment: <span className="text-white font-semibold">{wizardSpec.environment}</span></div>
            <div>Robot/Profile: <span className="text-white font-semibold">{wizardSpec.robot} · {wizardSpec.robotProfile}</span></div>
            <div>Model/Task: <span className="text-white font-semibold">{wizardSpec.model} · {wizardSpec.task}</span></div>
            <div>Sensors/Fidelity: <span className="text-white font-semibold">{wizardSpec.sensorProfile} · {fidelity}</span></div>
            <div className="mt-2 text-[10px] text-gray-500 leading-relaxed">
              Tip: Choose <span className="text-gray-300">Starter</span> for fast prototyping and switch to <span className="text-gray-300">Enterprise</span> before benchmark/export to simulate production complexity.
            </div>
          </div>

          <div className="text-xs border rounded-md px-3 py-2 bg-[#0f0f0f] border-[#2a2a2a]">
            <span className={`font-black uppercase tracking-wider ${compatibility.compatible ? 'text-green-400' : 'text-red-400'}`}>
              {compatibility.compatible ? 'Compatible' : 'Incompatible'}
            </span>
            <span className="text-gray-300 ml-2">{compatibility.reason}</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#2a2a2a] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-[#222] hover:bg-[#2c2c2c] text-gray-300 font-semibold">Cancel</button>
          <button onClick={handleCreate} disabled={!compatibility.compatible} className="px-4 py-2 rounded-md bg-[#00ffcc] hover:bg-[#00d6ad] text-black font-bold disabled:opacity-50">Create Project</button>
        </div>
      </div>
    </div>
  );
}

function SidebarButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full text-left px-5 py-3.5 flex items-center rounded-lg font-bold tracking-wide transition-all ${active ? 'bg-[#00ffcc] text-black shadow-md' : 'text-gray-400 hover:bg-[#222] hover:text-white'}`}
    >
      <span className="mr-4">{icon}</span>
      {label}
    </button>
  );
}

// --- EDITOR COMPONENT ---
function Editor({ workspace, onExit }) {
  if (!workspace) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <div className="text-lg font-semibold">No project loaded for editor.</div>
        <button
          className="px-4 py-2 rounded-md bg-[#00ffcc] text-black font-bold hover:bg-[#00d6ad]"
          onClick={onExit}
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set()); 
  
  const [isTraining, setIsTraining] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trainingMode, setTrainingMode] = useState('lightweight');
  const [viewMode, setViewMode] = useState('scene');
  const [savedEditState, setSavedEditState] = useState(null); 
  
  const [activeTabBottom, setActiveTabBottom] = useState('ml-agents');
  const [activeMenu, setActiveMenu] = useState(null); 
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, type: null, targetId: null });
  const [showAddComponent, setShowAddComponent] = useState(false);
  
  const [transformMode, setTransformMode] = useState('translate'); 
  const [focusTrigger, setFocusTrigger] = useState(0); // Trigger to frame selected object
  const [trainingEpoch, setTrainingEpoch] = useState(0);
  const [trainingData, setTrainingData] = useState([]);
  
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showGltfModal, setShowGltfModal] = useState(false);
  const [gltfUrlInput, setGltfUrlInput] = useState('');
  const [hierarchyQuery, setHierarchyQuery] = useState('');
  const [toasts, setToasts] = useState([]);
  const [runQueue, setRunQueue] = useState([]);
  const importInputRef = useRef(null);
  const trainerRef = useRef(null);
  const objectsRef = useRef([]);
  const benchmarkSeedRef = useRef(424242);
  const wasTrainingRef = useRef(false);
  const [benchmarkMode, setBenchmarkMode] = useState(false);
  const [benchmarkTracker, setBenchmarkTracker] = useState(null);
  const [latestEpisodeMetrics, setLatestEpisodeMetrics] = useState(null);
  const [currentEpsilon, setCurrentEpsilon] = useState(0);
  const benchmarkSummary = useMemo(() => summarizeBenchmark(benchmarkTracker), [benchmarkTracker]);
  const providerStatus = useMemo(() => {
    if (trainingMode === 'ml') {
      return {
        label: 'Provider: ML Backend',
        className: 'text-emerald-300',
        title: 'Remote ML training provider selected',
      };
    }

    return {
      label: 'Provider: Lightweight RL',
      className: 'text-[#9fc3f0]',
      title: 'Local lightweight provider selected',
    };
  }, [trainingMode]);
  const [bridgeHealth, setBridgeHealth] = useState({
    status: 'checking',
    configured: false,
    available: false,
    checkedAt: null,
    error: null,
  });

  // Layout Engine States
  const [leftWidth, setLeftWidth] = useState(300);
  const [rightWidth, setRightWidth] = useState(360);
  const [bottomHeight, setBottomHeight] = useState(260);
  const [isDraggingPane, setIsDraggingPane] = useState(null);
  
  // Panel Collapse States
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);

  const [showGrid, setShowGrid] = useState(true);
  const [gridFollowCamera, setGridFollowCamera] = useState(true);
  const [skyboxType, setSkyboxType] = useState('unity');
  const [bridgeAutoPollPaused, setBridgeAutoPollPaused] = useState(false);
  const bridgeFailureCountRef = useRef(0);
  const workspaceStorageKey = workspace.projectId
    ? `nexus-ai-${workspace.template}-${workspace.projectId}`
    : `nexus-ai-${workspace.template}`;
  const environmentStorageKey = `${workspaceStorageKey}-environment`;
  const queueSummary = getQueueSummary(runQueue);
  const activeRun = useMemo(
    () => runQueue.find((run) => run.status === 'running') || runQueue.find((run) => run.status === 'queued') || null,
    [runQueue],
  );
  const templateSpec = useMemo(
    () => workspace.templateSpec || {
      environment: workspace.config?.environment || workspace.template,
      robot: workspace.config?.robot || 'generic-agent',
      model: workspace.config?.model || 'ppo',
    },
    [workspace],
  );
  const modelId = templateSpec.model || 'ppo';
  const modelProfile = useMemo(() => getModelProfile(modelId), [modelId]);
  const initialEnvironmentProfile = useMemo(() => ({
    temperatureC: Number(templateSpec.temperatureC ?? 22),
    pressureKPa: Number(templateSpec.pressureKPa ?? 101.3),
    humidityPct: Number(templateSpec.humidityPct ?? 45),
    windMps: Number(templateSpec.windMps ?? 1.2),
  }), [templateSpec]);
  const [environmentProfile, setEnvironmentProfile] = useState(initialEnvironmentProfile);
  const readinessSummary = useMemo(() => evaluateSimReadiness({
    objects,
    trainingData,
    benchmarkSummary,
    environmentProfile,
    is2D: workspace.is2D,
  }), [objects, trainingData, benchmarkSummary, environmentProfile, workspace.is2D]);
  const [scenarioSuiteReport, setScenarioSuiteReport] = useState(null);
  const trainingInsights = useMemo(() => {
    const recent = trainingData.slice(-25);
    if (recent.length === 0) {
      return {
        avgReward: 0,
        solvedRate: 0,
        avgClearance: null,
      };
    }

    const avgReward = recent.reduce((sum, item) => sum + (Number(item.reward) || 0), 0) / recent.length;
    const solvedCount = recent.filter((item) => item?.solved).length;
    const clearanceValues = recent
      .map((item) => item?.clearance)
      .filter((value) => Number.isFinite(value));
    const avgClearance = clearanceValues.length
      ? clearanceValues.reduce((sum, value) => sum + value, 0) / clearanceValues.length
      : null;

    return {
      avgReward,
      solvedRate: (solvedCount / recent.length) * 100,
      avgClearance,
    };
  }, [trainingData]);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  useEffect(() => {
    setEnvironmentProfile(initialEnvironmentProfile);
  }, [initialEnvironmentProfile]);

  const filteredHierarchyIds = useMemo(() => {
    const query = hierarchyQuery.trim().toLowerCase();
    if (!query) return null;

    const childrenByParent = new Map();
    objects.forEach((item) => {
      const key = item.parentId || '__root__';
      const children = childrenByParent.get(key) || [];
      children.push(item);
      childrenByParent.set(key, children);
    });

    const included = new Set();

    const walk = (node) => {
      const selfMatch = (node.name || '').toLowerCase().includes(query) || (node.type || '').toLowerCase().includes(query);
      const descendants = childrenByParent.get(node.id) || [];
      const childMatch = descendants.some((child) => walk(child));
      const keep = selfMatch || childMatch;
      if (keep) included.add(node.id);
      return keep;
    };

    (childrenByParent.get('__root__') || []).forEach((rootNode) => {
      walk(rootNode);
    });

    return included;
  }, [objects, hierarchyQuery]);

  const refreshBridgeHealth = useCallback(async () => {
    setBridgeHealth((prev) => ({
      ...prev,
      status: 'checking',
      error: null,
    }));

    try {
      const snapshot = await apiClient.getSimBridgeHealth();
      bridgeFailureCountRef.current = 0;
      setBridgeAutoPollPaused(false);
      setBridgeHealth({
        status: snapshot.status || 'unknown',
        configured: Boolean(snapshot.configured),
        available: Boolean(snapshot.available),
        checkedAt: snapshot.checkedAt || new Date().toISOString(),
        error: snapshot.error || null,
      });
    } catch (error) {
      bridgeFailureCountRef.current += 1;
      if (bridgeFailureCountRef.current >= 1) {
        setBridgeAutoPollPaused(true);
      }
      setBridgeHealth({
        status: 'unreachable',
        configured: false,
        available: false,
        checkedAt: new Date().toISOString(),
        error: { message: error?.message || 'Bridge health check failed.' },
      });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const refreshBridgeHealthSafe = async () => {
      await refreshBridgeHealth();
      if (!isMounted) return;
    };

    refreshBridgeHealthSafe();
    if (bridgeAutoPollPaused) return () => {
      isMounted = false;
    };

    const timer = setInterval(refreshBridgeHealthSafe, 30000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [refreshBridgeHealth, bridgeAutoPollPaused]);

  const bridgeStatusLabel =
    bridgeHealth.status === 'ok'
      ? 'Bridge: Online'
      : bridgeHealth.status === 'disabled'
        ? 'Bridge: Disabled'
        : bridgeHealth.status === 'checking'
          ? 'Bridge: Checking'
          : 'Bridge: Unreachable';

  const bridgeStatusClass =
    bridgeHealth.status === 'ok'
      ? 'text-green-400'
      : bridgeHealth.status === 'disabled'
        ? 'text-gray-400'
        : bridgeHealth.status === 'checking'
          ? 'text-[#9fc3f0]'
          : 'text-red-400';

  const bridgeStatusTitle = bridgeHealth.error?.message ||
    (bridgeHealth.checkedAt ? `Last check: ${new Date(bridgeHealth.checkedAt).toLocaleTimeString()}` : 'Bridge status pending');
  const bridgeStatusInteractiveTitle = `${bridgeStatusTitle}${bridgeAutoPollPaused ? ' Auto polling paused after repeated failures.' : ''}. Click to refresh now.`;

  const triggerToast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const persistModelSnapshot = useCallback(() => {
    const projectId = workspace?.projectId || workspace?.id;
    if (!projectId || !trainerRef.current) return null;
    try {
      const saved = saveModel(projectId, trainerRef.current, {
        reward: Number(latestEpisodeMetrics?.reward ?? trainingInsights.avgReward ?? 0),
        successRate: Number(latestEpisodeMetrics?.successRate ?? 0),
      });
      if (saved) triggerToast('Model saved before halting.', 'success');
      return saved;
    } catch (error) {
      console.error(error);
      triggerToast('Failed to save model snapshot.', 'info');
      return null;
    }
  }, [workspace, latestEpisodeMetrics, trainingInsights.avgReward, triggerToast]);

  useEffect(() => {
    if (wasTrainingRef.current && !isTraining && trainerRef.current) {
      const saved = persistModelSnapshot();
      if (saved) {
        trainerRef.current = null;
      }
    }
    wasTrainingRef.current = isTraining;
  }, [isTraining, persistModelSnapshot]);

  // --- TEMPLATE GENERATION LOGIC ---
  useEffect(() => {
    const savedData = localStorage.getItem(workspaceStorageKey);
    const savedEnvironment = localStorage.getItem(environmentStorageKey);
    if (savedEnvironment) {
      try {
        const parsedEnvironment = JSON.parse(savedEnvironment);
        setEnvironmentProfile((prev) => ({
          ...prev,
          temperatureC: Number(parsedEnvironment?.temperatureC ?? prev.temperatureC),
          pressureKPa: Number(parsedEnvironment?.pressureKPa ?? prev.pressureKPa),
          humidityPct: Number(parsedEnvironment?.humidityPct ?? prev.humidityPct),
          windMps: Number(parsedEnvironment?.windMps ?? prev.windMps),
        }));
      } catch (error) {
        console.error(error);
      }
    }

    if (savedData) {
      try { 
        setObjects(normalizeSceneForEditor(JSON.parse(savedData))); 
        triggerToast("Environment loaded successfully.", 'info');
      } catch (e) { console.error(e); }
    } else {
      let initObjects = [];
      const genId = () => Math.random().toString(36).substr(2, 9);
      
      if (workspace.template === 'custom') {
          initObjects = compileTemplateToScene(templateSpec, genId);
          triggerToast(`Custom project initialized with ${modelId.toUpperCase()}`, 'info');
      }
      else {
          const hubTemplateSpecOverrides = {
            warehouse: { environment: 'warehouse', robot: 'arm6dof', task: 'pick_place', model: 'ddpg', sensorProfile: 'vision' },
            'house-cleaner': { environment: 'warehouse', robot: 'amr', task: 'navigation', model: 'ppo', sensorProfile: 'fusion' },
            'sea-drone': { environment: 'underwater', robot: 'drone', task: 'inspection', model: 'sac', sensorProfile: 'fusion' },
            'mars-rover': { environment: 'space', robot: 'rover', task: 'navigation', model: 'ppo', sensorProfile: 'fusion' },
          };

          const mappedSpec = hubTemplateSpecOverrides[workspace.template];
          if (mappedSpec) {
            initObjects = compileTemplateToScene({
              ...createDefaultTemplateSpec(),
              ...mappedSpec,
            }, genId);
            triggerToast(`${workspace.name} template initialized with full trainable environment.`, 'info');
          }

          if (initObjects.length === 0) {
          initObjects.push({ id: genId(), parentId: null, name: 'Main Sun', type: 'light', pos: [20, 40, 20], rot: [-45, 30, 0], scale: [1,1,1] });

          if (workspace.template === '2d-grid') {
          initObjects.push({ id: genId(), parentId: null, name: '2D Grid Floor', type: 'plane', pos: [0, 0, 0], rot: [0, 0, 0], scale: [2000, 2000, 0.1], color: '#222222', mass: 0, roughness: 1.0, is2D: true });
          initObjects.push({ id: genId(), parentId: null, name: 'Agent', type: 'cube', pos: [0, 0, 0.5], rot: [0,0,0], scale: [1,1,1], color: '#00ffcc', agent: true, mass: 1, is2D: true });
          initObjects.push({ id: genId(), parentId: null, name: 'Goal', type: 'sphere', pos: [5, 5, 0.5], rot: [0,0,0], scale: [1,1,1], color: '#ff3333', mass: 0, is2D: true });
          }
          else if (workspace.template === 'desert-spider') {
          initObjects.push({ id: genId(), parentId: null, name: 'Desert Sand', type: 'plane', pos: [0, -0.05, 0], rot: [0,0,0], scale: [2000, 0.1, 2000], color: '#d2b48c', mass: 0, roughness: 1.0 });
          const spiderRoot = genId();
          initObjects.push({ id: spiderRoot, parentId: null, name: 'Hexapod Agent', type: 'empty', pos: [0, 2, 0], rot: [0,0,0], scale: [1,1,1], agent: true, mass: 5, sensors: true });
          initObjects.push({ id: genId(), parentId: spiderRoot, name: 'Chassis', type: 'cube', pos: [0, 0, 0], rot: [0,0,0], scale: [2, 0.5, 3], color: '#333333', mass: 2 });
          const legPositions = [[1.2,0,1], [1.2,0,0], [1.2,0,-1], [-1.2,0,1], [-1.2,0,0], [-1.2,0,-1]];
          legPositions.forEach((pos, i) => {
              const legRoot = genId();
              initObjects.push({ id: legRoot, parentId: spiderRoot, name: `Leg Assembly ${i+1}`, type: 'empty', pos: pos, rot: [0,0,0], scale: [1,1,1] });
              initObjects.push({ id: genId(), parentId: legRoot, name: `Coxa`, type: 'cube', pos: [Math.sign(pos[0])*0.5, 0, 0], rot: [0,0,0], scale: [1, 0.2, 0.2], color: '#555555', mass: 0.5, joint: 'hinge', axis: [0,1,0] });
              initObjects.push({ id: genId(), parentId: legRoot, name: `Femur`, type: 'cube', pos: [Math.sign(pos[0])*1.0, -0.5, 0], rot: [0,0,45], scale: [0.2, 1.5, 0.2], color: '#888888', mass: 0.5, joint: 'hinge', axis: [0,0,1] });
          });
          }
          else if (workspace.template === 'city-car') {
          initObjects.push({ id: genId(), parentId: null, name: 'Asphalt Road', type: 'plane', pos: [0, -0.05, 0], rot: [0,0,0], scale: [2000, 0.1, 2000], color: '#2a2a2a', mass: 0, roughness: 0.9 });
          for(let i=-15; i<=15; i++) {
              if(i===0) continue;
              initObjects.push({ id: genId(), parentId: null, name: `Building ${i}`, type: 'cube', pos: [i*25, 15, 25], rot: [0,0,0], scale: [15, 30 + Math.random()*40, 15], color: '#445566', mass: 0 });
              initObjects.push({ id: genId(), parentId: null, name: `Building ${i}_b`, type: 'cube', pos: [i*25, 15, -25], rot: [0,0,0], scale: [15, 30 + Math.random()*40, 15], color: '#445566', mass: 0 });
          }
          const carRoot = genId();
          initObjects.push({ id: carRoot, parentId: null, name: 'Autonomous Vehicle', type: 'empty', pos: [0, 1, 0], rot: [0,0,0], scale: [1,1,1], agent: true, mass: 1500, sensors: true });
          initObjects.push({ id: genId(), parentId: carRoot, name: 'Chassis', type: 'cube', pos: [0, 0.4, 0], rot: [0,0,0], scale: [2.2, 0.5, 4.5], color: '#222222', mass: 800 });
          initObjects.push({ id: genId(), parentId: carRoot, name: 'Cabin', type: 'cube', pos: [0, 1.0, -0.5], rot: [0,0,0], scale: [1.8, 0.7, 2.2], color: '#007acc', mass: 200, metalness: 0.9, roughness: 0.1 }); 
          initObjects.push({ id: genId(), parentId: carRoot, name: 'LiDAR Dome', type: 'sphere', pos: [0, 1.45, -0.5], rot: [0,0,0], scale: [0.4, 0.4, 0.4], color: '#111111', mass: 5 });
          initObjects.push({ id: genId(), parentId: carRoot, name: 'Headlight L', type: 'cube', pos: [-0.8, 0.5, 2.25], rot: [0,0,0], scale: [0.4, 0.2, 0.1], color: '#ffffee', mass: 1 });
          initObjects.push({ id: genId(), parentId: carRoot, name: 'Headlight R', type: 'cube', pos: [0.8, 0.5, 2.25], rot: [0,0,0], scale: [0.4, 0.2, 0.1], color: '#ffffee', mass: 1 });

          [[-1.2,0.4,1.6], [1.2,0.4,1.6], [-1.2,0.4,-1.6], [1.2,0.4,-1.6]].forEach((pos, i) => {
              initObjects.push({ id: genId(), parentId: carRoot, name: `Wheel ${i}`, type: 'sphere', pos: pos, rot: [90,0,0], scale: [0.4, 0.8, 0.8], color: '#111111', mass: 20, joint: 'hinge', axis: [1,0,0], motor: true });
          });
          }
          else if (workspace.template === 'mountain-dog') {
          initObjects.push({ id: genId(), parentId: null, name: 'Rocky Terrain', type: 'plane', pos: [0, -0.05, 0], rot: [0,0,0], scale: [2000, 0.1, 2000], color: '#5c544d', mass: 0, roughness: 1.0 });
          initObjects.push({ id: genId(), parentId: null, name: 'Boulder 1', type: 'sphere', pos: [5, 0, 5], rot: [0,0,0], scale: [4,3,4], color: '#444', mass: 0 });
          initObjects.push({ id: genId(), parentId: null, name: 'Boulder 2', type: 'sphere', pos: [-3, 0, 8], rot: [0,0,0], scale: [2,2,3], color: '#444', mass: 0 });
          
          const dogRoot = genId();
          initObjects.push({ id: dogRoot, parentId: null, name: 'Quadruped Robot', type: 'empty', pos: [0, 2, 0], rot: [0,0,0], scale: [1,1,1], agent: true, mass: 15, sensors: true });
          initObjects.push({ id: genId(), parentId: dogRoot, name: 'Torso', type: 'cube', pos: [0, 0, 0], rot: [0,0,0], scale: [1, 0.4, 2.5], color: '#f39c12', mass: 10 });
          
          [[-0.6, -0.2, 1], [0.6, -0.2, 1], [-0.6, -0.2, -1], [0.6, -0.2, -1]].forEach((pos, i) => {
              const leg = genId();
              initObjects.push({ id: leg, parentId: dogRoot, name: `Leg ${i+1}`, type: 'empty', pos: pos, rot: [0,0,0], scale: [1,1,1] });
              initObjects.push({ id: genId(), parentId: leg, name: 'Thigh', type: 'cube', pos: [0, -0.4, 0], rot: [0,0,0], scale: [0.2, 0.8, 0.2], color: '#333', mass: 1, joint: 'hinge' });
              initObjects.push({ id: genId(), parentId: leg, name: 'Calf', type: 'cube', pos: [0, -1.2, 0], rot: [0,0,0], scale: [0.15, 0.8, 0.15], color: '#222', mass: 0.5, joint: 'hinge' });
          });
          }
          else {
          // Default Fallback
          initObjects.push({ id: genId(), parentId: null, name: 'Floor', type: 'plane', pos: [0, -0.05, 0], rot: [0, 0, 0], scale: [2000, 0.1, 2000], color: '#444', mass: 0, roughness: 1.0 });
          initObjects.push({ id: genId(), parentId: null, name: 'Test Object', type: 'cube', pos: [0, 1, 0], rot: [0, 0, 0], scale: [1, 1, 1], color: '#8899a6', mass: 1 });
          }
            }
      }
      
      setObjects(initObjects);
    }
  }, [workspace, workspaceStorageKey, environmentStorageKey, triggerToast, templateSpec, modelId]);

  // Core Actions
  const handleSave = useCallback(() => {
    localStorage.setItem(workspaceStorageKey, JSON.stringify(objects));
    localStorage.setItem(environmentStorageKey, JSON.stringify(environmentProfile));
    triggerToast("Environment state saved.", "success");
    setActiveMenu(null);
  }, [objects, workspaceStorageKey, environmentStorageKey, environmentProfile, triggerToast]);

  const handleExportProject = useCallback(() => {
    const payload = createProjectExportPayload({
      workspace,
      objects,
      runQueue,
      trainingData,
    });
    payload.workspace.config = {
      ...(payload.workspace.config || {}),
      temperatureC: environmentProfile.temperatureC,
      pressureKPa: environmentProfile.pressureKPa,
      humidityPct: environmentProfile.humidityPct,
      windMps: environmentProfile.windMps,
    };

    if (trainerRef.current?.policyTable instanceof Map) {
      payload.training.learnedQTable = Array.from(trainerRef.current.policyTable.entries());
      payload.training.engine = {
        model: modelId,
        epsilon: trainerRef.current.epsilon,
        episode: trainerRef.current.episode,
      };
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(workspace.name || 'nexus-project').replace(/\s+/g, '-').toLowerCase()}-export.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setActiveMenu(null);
    triggerToast('Project exported successfully.', 'success');
  }, [workspace, objects, runQueue, trainingData, triggerToast, modelId, environmentProfile]);

  const handleImportProject = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const result = validateProjectImportPayload(parsed);
        if (!result.valid) {
          triggerToast(result.reason || 'Project import failed.', 'info');
          return;
        }

        setObjects(normalizeSceneForEditor(parsed.scene.objects || []));
        setRunQueue(parsed.training?.queuedRuns || []);
        setTrainingData(parsed.training?.history || []);
        if (parsed.workspace?.config) {
          setEnvironmentProfile((prev) => ({
            ...prev,
            temperatureC: Number(parsed.workspace.config.temperatureC ?? prev.temperatureC),
            pressureKPa: Number(parsed.workspace.config.pressureKPa ?? prev.pressureKPa),
            humidityPct: Number(parsed.workspace.config.humidityPct ?? prev.humidityPct),
            windMps: Number(parsed.workspace.config.windMps ?? prev.windMps),
          }));
        }
        if (Array.isArray(parsed.training?.learnedQTable)) {
          const engine = createTrainingEngine(parsed.training?.engine?.model || modelId);
          parsed.training.learnedQTable.forEach(([state, values]) => {
            if (typeof state === 'string' && values && typeof values === 'object') {
              engine.policyTable.set(state, {
                steer: Number(values.steer) || 0,
                throttle: Number(values.throttle) || 0,
                value: Number(values.value) || 0,
                visits: Number(values.visits) || 0,
              });
            }
          });
          engine.episode = Number(parsed.training?.engine?.episode) || engine.episode;
          engine.epsilon = Number(parsed.training?.engine?.epsilon) || engine.epsilon;
          trainerRef.current = engine;
        }
        setActiveTabBottom('project');
        triggerToast('Project imported into current workspace.', 'success');
      } catch (error) {
        console.error(error);
        triggerToast('Invalid JSON project file.', 'info');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
    setActiveMenu(null);
  }, [triggerToast, modelId]);

  const enqueueModelRun = useCallback((objectCountOverride) => {
    const sceneAgent = objects.find((item) => item?.agent);
    const robotByAgentType = {
      rover: 'rover',
      drone: 'drone',
      humanoid: 'humanoid',
      robotic_arm: 'arm6dof',
      quadruped: 'quadruped',
      cube: 'amr',
    };

    const inferredRobot = (() => {
      const fromTemplate = templateSpec.robot;
      if (fromTemplate && fromTemplate !== 'generic-agent') return fromTemplate;
      if (sceneAgent?.type && robotByAgentType[sceneAgent.type]) return robotByAgentType[sceneAgent.type];
      return workspace.is2D ? 'amr' : 'rover';
    })();

    const compatibility = getModelCompatibility({
      ...templateSpec,
      model: modelId,
      robot: inferredRobot,
    });
    if (!compatibility.compatible) {
      triggerToast(compatibility.reason, 'info');
      return false;
    }

    const item = createRunQueueItem({
      model: modelId,
      environment: templateSpec.environment || workspace.template,
      robot: inferredRobot,
      objectCount: objectCountOverride ?? objects.length,
    });
    setRunQueue((prev) => [item, ...prev]);
    setActiveTabBottom('runs');
    triggerToast(`Queued ${item.config.model.toUpperCase()} training run`, 'info');
    return true;
  }, [workspace, objects, triggerToast, templateSpec, modelId]);

  const togglePlayMode = useCallback((startObjects = objects) => {
    const safeStartObjects = Array.isArray(startObjects) ? startObjects : objects;
    if (!isPlaying) {
      setSavedEditState(JSON.parse(JSON.stringify(safeStartObjects)));
      setIsPlaying(true);
      setViewMode('game');
      triggerToast("Physics Engine Active", "info");
    } else {
      if (isTraining && trainerRef.current) {
        persistModelSnapshot();
      }
      setIsPlaying(false);
      setViewMode('scene');
      setIsTraining(false);
      trainerRef.current = null;
      if (savedEditState) setObjects(savedEditState);
      setBenchmarkTracker(null);
      triggerToast("Simulation Reset", "info");
    }
  }, [isPlaying, objects, savedEditState, triggerToast, isTraining, persistModelSnapshot]);

  const ensureTrainingSceneReady = useCallback(() => {
    const hasAgent = objects.some((item) => item?.agent && Array.isArray(item?.pos));
    const hasGoal = objects.some((item) => {
      if (!Array.isArray(item?.pos)) return false;
      if (typeof item?.name === 'string' && item.name.toLowerCase().includes('goal')) return true;
      return item?.type === 'sphere' && typeof item?.color === 'string' && item.color.toLowerCase().includes('ff3333');
    });

    if (hasAgent && hasGoal) {
      return { preparedObjects: objects, addedAgent: false, addedGoal: false };
    }

    const preparedObjects = [...objects];

    if (!hasAgent) {
      preparedObjects.push({
        id: Math.random().toString(36).substr(2, 9),
        parentId: null,
        name: 'Training Agent',
        type: workspace.is2D ? 'cube' : 'rover',
        url: null,
        pos: workspace.is2D ? [0, 0, 0.5] : [0, 0.5, 0],
        rot: [0, 0, 0],
        scale: [1, 1, 1],
        agent: true,
        color: '#3a72b8',
        mass: 1,
        sensors: true,
        roughness: 0.75,
        metalness: 0.1,
        friction: 0.3,
        restitution: 0.1,
        is2D: workspace.is2D,
      });
    }

    if (!hasGoal) {
      preparedObjects.push({
        id: Math.random().toString(36).substr(2, 9),
        parentId: null,
        name: 'Training Goal',
        type: 'sphere',
        url: null,
        pos: workspace.is2D ? [6, 6, 0.5] : [6, 0.5, 6],
        rot: [0, 0, 0],
        scale: [1, 1, 1],
        agent: false,
        color: '#ff3333',
        mass: 0,
        sensors: false,
        roughness: 0.35,
        metalness: 0.05,
        friction: 0.2,
        restitution: 0.2,
        is2D: workspace.is2D,
      });
    }

    setObjects(preparedObjects);
    return { preparedObjects, addedAgent: !hasAgent, addedGoal: !hasGoal };
  }, [objects, workspace.is2D]);

  const handleToggleTraining = useCallback(() => {
    if (isTraining) {
      persistModelSnapshot();
      trainerRef.current = null;
      setIsTraining(false);
      setActiveTabBottom('ml-agents');
      triggerToast('Training paused.', 'info');
      return;
    }

    const prep = ensureTrainingSceneReady();
    if (prep.addedAgent || prep.addedGoal) {
      triggerToast(`Prepared scene for training${prep.addedAgent ? ' (agent added)' : ''}${prep.addedGoal ? ' (goal added)' : ''}.`, 'info');
    }

    if (!isPlaying) {
      togglePlayMode(prep.preparedObjects);
    }

    const firstAgentId = prep.preparedObjects.find((item) => item?.agent)?.id;
    if (firstAgentId) setSelectedId(firstAgentId);

    triggerToast(`Initializing ${modelId.toUpperCase()} training engine...`, 'info');
    const queued = enqueueModelRun(prep.preparedObjects.length);
    if (!queued) return;

    trainerRef.current = createTrainingEngine(modelId, {
      deterministic: benchmarkMode,
      seed: benchmarkSeedRef.current,
    });

    if (benchmarkMode) {
      setBenchmarkTracker(createBenchmarkTracker({
        model: modelId,
        environment: workspace.template,
        is2D: workspace.is2D,
        seed: benchmarkSeedRef.current,
      }));
      triggerToast(`Benchmark mode ON (seed ${benchmarkSeedRef.current})`, 'info');
    } else {
      setBenchmarkTracker(null);
    }

    setRunQueue((prev) => {
      let promoted = false;
      return prev.map((run) => {
        if (!promoted && run.status === 'queued') {
          promoted = true;
          return {
            ...run,
            status: 'running',
            startedAt: run.startedAt || Date.now(),
            progress: Math.max(run.progress, 2),
          };
        }
        return run;
      });
    });

    setIsTraining(true);
    setActiveTabBottom('runs');
    triggerToast('Training started. Live run details opened in Run Queue.', 'success');
  }, [
    isTraining,
    persistModelSnapshot,
    ensureTrainingSceneReady,
    isPlaying,
    togglePlayMode,
    modelId,
    enqueueModelRun,
    benchmarkMode,
    workspace.template,
    workspace.is2D,
    triggerToast,
  ]);

  const handleTestModels = useCallback(() => {
    setActiveTabBottom('project');
    triggerToast('Load a model from the Assets panel, then press Play to test.', 'info');
  }, [triggerToast]);

  const handleRenameObject = useCallback((id, name) => {
    setObjects((prev) => prev.map((obj) => (obj.id === id ? { ...obj, name } : obj)));
  }, []);

  const handleAddAsset = useCallback((type) => {
    const isRobotAsset = ['rover', 'drone', 'humanoid', 'robotic_arm'].includes(type);
    handleAddObject(type, isRobotAsset);
  }, [handleAddObject]);

  const handleDeleteObject = useCallback((targetId = selectedId) => {
    if (targetId && !isPlaying) {
      const obj = objects.find(o => o.id === targetId);
      const getChildrenIds = (id) => {
          const children = objects.filter(o => o.parentId === id).map(o => o.id);
          return children.reduce((acc, childId) => [...acc, ...getChildrenIds(childId)], children);
      };
      const idsToDelete = [targetId, ...getChildrenIds(targetId)];
      setObjects(prev => prev.filter(o => !idsToDelete.includes(o.id)));
      if (idsToDelete.includes(selectedId)) setSelectedId(null);
      setContextMenu({ visible: false, x:0, y:0, type: null, targetId: null });
      triggerToast(`Deleted ${obj?.name}`);
    }
  }, [selectedId, isPlaying, objects, triggerToast]);

  const handleDuplicateObject = useCallback((targetId = selectedId) => {
      if (targetId && !isPlaying) {
          const objToCopy = objects.find(o => o.id === targetId);
          if (!objToCopy) return;
          const newId = Math.random().toString(36).substr(2, 9);
          const newObj = { ...objToCopy, id: newId, name: `${objToCopy.name} (Copy)`, pos: [objToCopy.pos[0] + 1, objToCopy.pos[1], objToCopy.pos[2] + 1] };
          setObjects(prev => [...prev, newObj]);
          setSelectedId(newId);
          setContextMenu({ visible: false, x:0, y:0, type: null, targetId: null });
          triggerToast(`Duplicated ${objToCopy.name}`);
      }
  }, [selectedId, isPlaying, objects, triggerToast]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayMode();
      } else if (!isPlaying) {
        if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
        else if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
        else if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
        else if (e.key === 'f' || e.key === 'F') {
            if (selectedId) setFocusTrigger(Date.now()); // Triggers camera focus in ThreeJsView
        }
        else if (e.key === 'Delete' || e.key === 'Backspace') handleDeleteObject();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleSave();
      }

      if (e.key === 'Escape') {
        setSelectedId(null);
        setActiveMenu(null);
        setShowShortcutsModal(false);
        setShowDeployModal(false);
        setContextMenu({ visible: false, x:0, y:0, type: null, targetId: null });
        setShowAddComponent(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, togglePlayMode, handleDeleteObject, handleSave, selectedId]);

  // Handle Pane Resizing
  useEffect(() => {
    if (!isDraggingPane) return;
    const handleMouseMove = (e) => {
      if (isDraggingPane === 'left') setLeftWidth(Math.max(200, Math.min(e.clientX, window.innerWidth - rightWidth - 200)));
      else if (isDraggingPane === 'right') setRightWidth(Math.max(250, Math.min(window.innerWidth - e.clientX, window.innerWidth - leftWidth - 200)));
      else if (isDraggingPane === 'bottom') setBottomHeight(Math.max(150, Math.min(window.innerHeight - e.clientY, window.innerHeight - 200)));
    };
    const handleMouseUp = () => setIsDraggingPane(null);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPane, rightWidth, leftWidth]);

  // Close menus on external click
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
      setContextMenu({ visible: false, x:0, y:0, type: null, targetId: null });
      setShowAddComponent(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMenu = (e, menuName) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === menuName ? null : menuName);
    setContextMenu({ visible: false, x:0, y:0, type: null, targetId: null });
  };

  const handleContextMenu = (e, type, targetId = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, type, targetId });
    if (targetId) setSelectedId(targetId);
    setActiveMenu(null);
  };

  // Real Reinforcement Learning Loop (Q-learning)
  useEffect(() => {
    let interval;

    if (isTraining && isPlaying) {
      if (!trainerRef.current) {
        trainerRef.current = createTrainingEngine(modelId, {
          deterministic: benchmarkMode,
          seed: benchmarkSeedRef.current,
        });
        setCurrentEpsilon(trainerRef.current.epsilon);
      }

      interval = setInterval(() => {
        const currentObjects = objectsRef.current;
        const stepResult = runTrainingStep(currentObjects, trainerRef.current, { is2D: workspace.is2D });

        if (stepResult?.objects) {
          objectsRef.current = stepResult.objects;
          setObjects(stepResult.objects);
        }

        if (stepResult?.missingTargets) {
          const prepared = ensureTrainingSceneReady();
          if (prepared.addedAgent || prepared.addedGoal) {
            triggerToast('Training scene auto-healed (agent/goal restored).', 'info');
            return;
          }
          setIsTraining(false);
          triggerToast('Training needs one agent and one goal object in scene.', 'info');
          return;
        }

        if (stepResult?.stepMetrics) {
          const step = stepResult.stepMetrics;
          setTrainingEpoch(step.episode);
          setLatestEpisodeMetrics((prev) => ({ ...prev, ...step }));
          setCurrentEpsilon(step.epsilon);

          setRunQueue((prev) => {
            if (prev.length === 0) return prev;

            let runningFound = false;
            return prev.map((run) => {
              if (!runningFound && run.status === 'queued') {
                runningFound = true;
                return {
                  ...run,
                  status: 'running',
                  startedAt: run.startedAt || Date.now(),
                  progress: Math.max(run.progress, 2),
                };
              }

              if (run.status === 'running') {
                runningFound = true;
                const progressFromSteps = Math.min(98, step.totalSteps / 6.5);
                const progressFromDistance = Math.max(0, Math.min(98, (40 - step.distance) * 2));
                const progress = Math.max(run.progress, Number(Math.max(progressFromSteps, progressFromDistance).toFixed(1)));

                return {
                  ...run,
                  progress,
                };
              }

              return run;
            });
          });
        }

        if (stepResult?.episodePoint) {
          const point = stepResult.episodePoint;
          setTrainingEpoch(point.episode);
          setLatestEpisodeMetrics(point);
          setCurrentEpsilon(point.epsilon);
          setTrainingData((prev) => {
            const updated = [...prev, point];
            if (updated.length > 120) updated.shift();
            return updated;
          });

          if (benchmarkMode) {
            setBenchmarkTracker((prev) => updateBenchmarkTracker(prev, point));
          }

          setRunQueue((prev) => {
            if (prev.length === 0) return prev;

            let runningFound = false;
            return prev.map((run) => {
              if (!runningFound && run.status === 'queued') {
                runningFound = true;
                return {
                  ...run,
                  status: 'running',
                  startedAt: run.startedAt || Date.now(),
                  progress: Math.max(run.progress, 5),
                };
              }

              if (run.status === 'running') {
                runningFound = true;
                const progressFromEpisodes = Math.min(99, point.episode / 2);
                const progressFromReward = Math.max(0, Math.min(99, (point.reward + 60) / 1.8));
                const progress = Math.max(run.progress, Number(Math.max(progressFromEpisodes, progressFromReward).toFixed(1)));

                if (progress >= 99 && point.solved) {
                  return {
                    ...run,
                    status: 'completed',
                    progress: 100,
                    finishedAt: Date.now(),
                  };
                }

                return {
                  ...run,
                  progress,
                };
              }

              return run;
            });
          });
        }
      }, TRAINING_STEP_INTERVAL_MS);
    }

    return () => clearInterval(interval);
  }, [isTraining, isPlaying, modelId, triggerToast, workspace.is2D, ensureTrainingSceneReady, benchmarkMode]);

  const handleAddObject = (type, isAgent = false, parentId = null, customUrl = null) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const nameMap = { empty: 'GameObject', cube: 'Cube', sphere: 'Sphere', sensor: 'Sensor Pod', plane: 'Plane', humanoid: 'Humanoid', rover: 'Rover', drone: 'Drone', robotic_arm: 'Robotic Arm', light: 'Light Source' };

    let url = customUrl;
    if (type === 'gltf') {
      if (!url) {
        setShowGltfModal(true);
        setActiveMenu(null);
        return;
      }
    }

    const defaultPos = parentId ? [0,0,0] : [0, type === 'plane' ? 0 : type === 'light' ? 10 : 5, 0];

    setObjects([...objects, {
      id: newId,
      parentId: parentId,
      name: type === 'gltf' ? 'Custom CAD Model' : `${nameMap[type]}`,
      type: type,
      url: url,
      pos: defaultPos,
      rot: [0,0,0],
      scale: [type === 'plane' ? 20 : 1, type === 'plane' ? 0.1 : 1, type === 'plane' ? 20 : 1],
      agent: isAgent,
      color: type === 'sensor' ? '#00ffcc' : (isAgent ? '#00ffcc' : (type === 'plane' ? '#555555' : '#8899a6')), 
      mass: type === 'plane' || type === 'light' || type === 'sensor' ? 0 : (type === 'empty' ? undefined : 1), 
      sensors: isAgent,
      roughness: type === 'plane' ? 1.0 : 0.85,
      metalness: type === 'plane' ? 0.0 : 0.1,
      friction: 0.3,
      restitution: 0.1,
      sensorMount: type === 'sensor',
    }]);
    
    if (parentId) setExpandedNodes(prev => new Set(prev).add(parentId));
    
    setSelectedId(newId);
    setActiveMenu(null);
    setContextMenu({ visible: false, x:0, y:0, type: null, targetId: null });
    triggerToast(`Created ${nameMap[type]}`);
  };

  const handleCreateGltfObject = () => {
    const normalized = gltfUrlInput.trim();
    if (!normalized) {
      triggerToast('GLTF URL is required.', 'info');
      return;
    }

    const looksLikeModel = /\.(gltf|glb)(\?.*)?$/i.test(normalized);
    if (!looksLikeModel) {
      triggerToast('Please provide a valid .gltf or .glb URL.', 'info');
      return;
    }

    handleAddObject('gltf', false, null, normalized);
    setGltfUrlInput('');
    setShowGltfModal(false);
  };

  const handleAddSensorPod = useCallback((parentId) => {
    if (!parentId) return;
    const newId = Math.random().toString(36).substr(2, 9);
    setObjects((prev) => normalizeSceneForEditor([
      ...prev,
      {
        id: newId,
        parentId,
        name: 'Sensor Pod',
        type: 'sensor',
        pos: [0, 1.2, 0.6],
        rot: [0, 0, 0],
        scale: [0.45, 0.45, 0.45],
        color: '#00ffcc',
        mass: 0,
        roughness: 0.25,
        metalness: 0.65,
        sensorMount: true,
      },
    ]));
    setExpandedNodes((prev) => new Set(prev).add(parentId));
    setSelectedId(newId);
    triggerToast('Sensor pod added. Reposition with transform gizmo.', 'success');
  }, [triggerToast]);

  const applyEnvironmentProfile = useCallback(() => {
    if (isPlaying) {
      triggerToast('Stop simulation before applying atmospheric profile.', 'info');
      return;
    }

    const humidityRatio = Math.max(0, Math.min(1, environmentProfile.humidityPct / 100));
    const pressureRatio = Math.max(0.3, environmentProfile.pressureKPa / 101.3);
    const windFactor = Math.max(0, environmentProfile.windMps / 30);

    setObjects((prev) => normalizeSceneForEditor(prev.map((obj) => {
      if (obj.type === 'light' || obj.type === 'empty' || obj.mass === undefined) return obj;
      return {
        ...obj,
        friction: Number((0.18 + humidityRatio * 0.62).toFixed(2)),
        restitution: Number((0.08 + (1 - humidityRatio) * 0.2).toFixed(2)),
        linearDamping: Number((0.01 + (1 / pressureRatio - 1) * 0.03 + windFactor * 0.02).toFixed(3)),
        envTemperatureC: environmentProfile.temperatureC,
        envPressureKPa: environmentProfile.pressureKPa,
        envHumidityPct: environmentProfile.humidityPct,
        envWindMps: environmentProfile.windMps,
      };
    })));

    triggerToast('Atmospheric profile applied to scene physics.', 'success');
  }, [isPlaying, environmentProfile, triggerToast]);

  const handleGenerateEnvironment = useCallback((preset) => {
    if (isPlaying) {
      triggerToast('Stop simulation before generating environment tools.', 'info');
      return;
    }

    const genId = () => Math.random().toString(36).substr(2, 9);
    const generated = [];

    if (preset === 'obstacle-field') {
      const count = workspace.is2D ? 24 : 40;
      for (let i = 0; i < count; i += 1) {
        const x = Number((Math.random() * 36 - 18).toFixed(2));
        const y = workspace.is2D ? Number((Math.random() * 36 - 18).toFixed(2)) : Number((Math.random() * 2 + 0.5).toFixed(2));
        const z = workspace.is2D ? 0.5 : Number((Math.random() * 36 - 18).toFixed(2));
        generated.push({
          id: genId(),
          parentId: null,
          name: `Obstacle ${i + 1}`,
          type: i % 4 === 0 ? 'sphere' : 'cube',
          pos: [x, y, z],
          rot: [0, 0, 0],
          scale: [1 + Math.random() * 1.8, 1 + Math.random() * 1.8, 1 + Math.random() * 1.8],
          color: '#5a6675',
          mass: 0,
          roughness: 0.9,
          metalness: 0.05,
          is2D: workspace.is2D,
        });
      }
    }

    if (preset === 'maze-track') {
      const lanes = 9;
      const spacing = 4;
      for (let i = -lanes; i <= lanes; i += 1) {
        if (i % 2 === 0) continue;
        const isVertical = i % 3 === 0;
        generated.push({
          id: genId(),
          parentId: null,
          name: `Maze Wall ${i}`,
          type: 'cube',
          pos: isVertical
            ? [i * spacing, workspace.is2D ? 0 : 1.5, workspace.is2D ? 0.5 : 0]
            : [0, workspace.is2D ? i * spacing : 1.5, workspace.is2D ? 0.5 : i * spacing],
          rot: [0, 0, 0],
          scale: isVertical ? [1.2, workspace.is2D ? 10 : 3, workspace.is2D ? 1 : 26] : [26, workspace.is2D ? 1.2 : 3, 1.2],
          color: '#4f5966',
          mass: 0,
          roughness: 0.95,
          metalness: 0.02,
          is2D: workspace.is2D,
        });
      }
    }

    if (preset === 'goal-course') {
      const points = workspace.is2D
        ? [[-10, -10, 0.5], [-4, 8, 0.5], [6, -2, 0.5], [12, 10, 0.5]]
        : [[-10, 0.5, -10], [-3, 0.5, 7], [8, 0.5, -4], [13, 0.5, 11]];

      points.forEach((pos, idx) => {
        generated.push({
          id: genId(),
          parentId: null,
          name: idx === points.length - 1 ? 'Goal' : `Waypoint ${idx + 1}`,
          type: 'sphere',
          pos,
          rot: [0, 0, 0],
          scale: [1, 1, 1],
          color: idx === points.length - 1 ? '#ff3333' : '#6ea8f5',
          mass: 0,
          roughness: 0.3,
          metalness: 0.1,
          is2D: workspace.is2D,
        });
      });
    }

    if (preset === 'warehouse-kit') {
      for (let lane = -2; lane <= 2; lane += 1) {
        const x = lane * 7;
        for (let shelf = 0; shelf < 4; shelf += 1) {
          const z = -14 + shelf * 9;
          generated.push({
            id: genId(),
            parentId: null,
            name: `Rack ${lane + 3}-${shelf + 1}`,
            type: 'cube',
            pos: [x, workspace.is2D ? 0.5 : 2.2, workspace.is2D ? 0.5 : z],
            rot: [0, 0, 0],
            scale: [2.6, workspace.is2D ? 1.2 : 4.2, workspace.is2D ? 1 : 1.2],
            color: '#4b5563',
            mass: 0,
            roughness: 0.82,
            metalness: 0.18,
            is2D: workspace.is2D,
          });
        }
      }
    }

    if (preset === 'urban-kit') {
      for (let block = 0; block < 12; block += 1) {
        const x = Number((Math.random() * 40 - 20).toFixed(2));
        const z = Number((Math.random() * 40 - 20).toFixed(2));
        const height = Number((6 + Math.random() * 20).toFixed(2));
        generated.push({
          id: genId(),
          parentId: null,
          name: `City Block ${block + 1}`,
          type: 'cube',
          pos: [x, workspace.is2D ? Number((Math.random() * 30 - 15).toFixed(2)) : height * 0.5, workspace.is2D ? 0.5 : z],
          rot: [0, 0, 0],
          scale: [4 + Math.random() * 5, workspace.is2D ? 1.2 : height, workspace.is2D ? 1 : 4 + Math.random() * 5],
          color: '#334155',
          mass: 0,
          roughness: 0.75,
          metalness: 0.22,
          is2D: workspace.is2D,
        });
      }
    }

    if (preset === 'terrain-kit') {
      for (let rock = 0; rock < 18; rock += 1) {
        const radius = 1 + Math.random() * 3;
        generated.push({
          id: genId(),
          parentId: null,
          name: `Boulder ${rock + 1}`,
          type: 'sphere',
          pos: [
            Number((Math.random() * 48 - 24).toFixed(2)),
            workspace.is2D ? Number((Math.random() * 36 - 18).toFixed(2)) : Number((0.5 + Math.random() * 1.8).toFixed(2)),
            workspace.is2D ? 0.5 : Number((Math.random() * 48 - 24).toFixed(2)),
          ],
          rot: [0, 0, 0],
          scale: [radius, radius * (0.7 + Math.random() * 0.8), radius],
          color: '#57534e',
          mass: 0,
          roughness: 0.97,
          metalness: 0.04,
          is2D: workspace.is2D,
        });
      }
    }

    if (preset === 'underwater-kit') {
      for (let gate = 0; gate < 8; gate += 1) {
        generated.push({
          id: genId(),
          parentId: null,
          name: `Gate Ring ${gate + 1}`,
          type: 'torus',
          pos: [
            Number((Math.random() * 40 - 20).toFixed(2)),
            workspace.is2D ? Number((Math.random() * 36 - 18).toFixed(2)) : Number((0.8 + Math.random() * 3).toFixed(2)),
            workspace.is2D ? 0.5 : Number((Math.random() * 40 - 20).toFixed(2)),
          ],
          rot: [90, 0, 0],
          scale: [2.2, 2.2, 2.2],
          color: '#38bdf8',
          mass: 0,
          roughness: 0.35,
          metalness: 0.32,
          is2D: workspace.is2D,
        });
      }
    }

    if (preset === 'space-kit') {
      for (let crater = 0; crater < 12; crater += 1) {
        const radius = 1.5 + Math.random() * 3.5;
        generated.push({
          id: genId(),
          parentId: null,
          name: `Crater ${crater + 1}`,
          type: 'sphere',
          pos: [
            Number((Math.random() * 48 - 24).toFixed(2)),
            workspace.is2D ? Number((Math.random() * 36 - 18).toFixed(2)) : Number((0.3 + Math.random() * 0.9).toFixed(2)),
            workspace.is2D ? 0.5 : Number((Math.random() * 48 - 24).toFixed(2)),
          ],
          rot: [0, 0, 0],
          scale: [radius * 1.35, Math.max(0.4, radius * 0.38), radius * 1.35],
          color: '#4c1d95',
          mass: 0,
          roughness: 0.9,
          metalness: 0.08,
          is2D: workspace.is2D,
        });
      }
    }

    if (generated.length === 0) return;

    setObjects((prev) => normalizeSceneForEditor([...prev, ...generated]));
    triggerToast(`Generated ${generated.length} objects via ${preset}.`, 'success');
    setActiveTabBottom('project');
  }, [isPlaying, workspace.is2D, triggerToast]);

  const handleExportBenchmarkReport = useCallback(() => {
    if (!benchmarkMode || !benchmarkTracker || benchmarkSummary.episodes === 0) {
      triggerToast('No benchmark data available yet.', 'info');
      return;
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      workspace: {
        name: workspace.name,
        template: workspace.template,
        is2D: workspace.is2D,
      },
      benchmark: {
        ...benchmarkTracker,
        summary: benchmarkSummary,
      },
      rewardHistory: trainingData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(workspace.template || 'benchmark').replace(/\s+/g, '-')}-benchmark-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    triggerToast('Benchmark report exported.', 'success');
  }, [benchmarkMode, benchmarkTracker, benchmarkSummary, trainingData, workspace, triggerToast]);

  const handleExportReadinessReport = useCallback(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      workspace: {
        name: workspace.name,
        template: workspace.template,
        projectId: workspace.projectId || null,
      },
      readiness: readinessSummary,
      benchmark: benchmarkSummary,
      scenarioSuite: scenarioSuiteReport,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(workspace.name || 'nexus-sim').replace(/\s+/g, '-').toLowerCase()}-readiness-report.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    triggerToast('Readiness report exported.', 'success');
  }, [workspace, readinessSummary, benchmarkSummary, scenarioSuiteReport, triggerToast]);

  const handleRunScenarioSuite = useCallback(() => {
    const report = runReadinessScenarioSuite({
      objects,
      trainingData,
      benchmarkSummary,
      environmentProfile,
      is2D: workspace.is2D,
    });
    setScenarioSuiteReport(report);
    triggerToast(`Scenario suite complete: ${report.summary.passCount}/${report.summary.total} ready`, report.summary.marketReady ? 'success' : 'info');
  }, [objects, trainingData, benchmarkSummary, environmentProfile, workspace.is2D, triggerToast]);

  const handleExportLaunchEvidencePack = useCallback(() => {
    const evidence = buildLaunchEvidencePack({
      workspace,
      readiness: readinessSummary,
      scenarioSuite: scenarioSuiteReport,
      benchmark: benchmarkSummary,
      environmentProfile,
      trainingData,
    });

    const baseName = `${(workspace.name || 'nexus-sim').replace(/\s+/g, '-').toLowerCase()}-launch-evidence`;

    const jsonBlob = new Blob([JSON.stringify(evidence.payload, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonAnchor = document.createElement('a');
    jsonAnchor.href = jsonUrl;
    jsonAnchor.download = `${baseName}.json`;
    jsonAnchor.click();
    URL.revokeObjectURL(jsonUrl);

    const mdBlob = new Blob([evidence.markdown], { type: 'text/markdown;charset=utf-8' });
    const mdUrl = URL.createObjectURL(mdBlob);
    const mdAnchor = document.createElement('a');
    mdAnchor.href = mdUrl;
    mdAnchor.download = `${baseName}.md`;
    mdAnchor.click();
    URL.revokeObjectURL(mdUrl);

    triggerToast('Launch evidence pack exported (.json + .md).', 'success');
  }, [workspace, readinessSummary, scenarioSuiteReport, benchmarkSummary, environmentProfile, trainingData, triggerToast]);

  const updateObject = (id, field, value) => {
    setObjects(objects.map(obj => obj.id === id ? { ...obj, [field]: value } : obj));
  };

  const applyMaterialPreset = useCallback((targetId, preset) => {
    if (!targetId) return;

    const presets = {
      'brushed-steel': { color: '#8f9fb0', roughness: 0.34, metalness: 0.82 },
      'carbon-fiber': { color: '#2b323b', roughness: 0.25, metalness: 0.45 },
      'matte-polymer': { color: '#556070', roughness: 0.9, metalness: 0.08 },
      'neon-ceramic': { color: '#6ea8f5', roughness: 0.2, metalness: 0.12 },
      'hazard-shell': { color: '#f59e0b', roughness: 0.62, metalness: 0.2 },
    };

    const selected = presets[preset];
    if (!selected) return;

    setObjects((prev) => prev.map((obj) => {
      if (obj.id !== targetId) return obj;
      return {
        ...obj,
        ...selected,
      };
    }));

    triggerToast(`Applied ${preset} material preset.`, 'success');
  }, [triggerToast]);

  const handleTransformGizmoUpdate = useCallback((id, newPos, newRot, newScale) => {
    setObjects(prev => prev.map(obj => {
      if (obj.id === id) {
        return { 
          ...obj, 
          pos: newPos ? [Number(newPos[0].toFixed(2)), Number(newPos[1].toFixed(2)), Number(newPos[2].toFixed(2))] : obj.pos, 
          rot: newRot ? [Number(newRot[0].toFixed(2)), Number(newRot[1].toFixed(2)), Number(newRot[2].toFixed(2))] : obj.rot, 
          scale: newScale ? [Number(newScale[0].toFixed(2)), Number(newScale[1].toFixed(2)), Number(newScale[2].toFixed(2))] : obj.scale 
        };
      }
      return obj;
    }));
  }, []);

  const toggleNodeExpansion = (e, id) => {
      e.stopPropagation();
      const newExpanded = new Set(expandedNodes);
      if (newExpanded.has(id)) newExpanded.delete(id);
      else newExpanded.add(id);
      setExpandedNodes(newExpanded);
  };

  const handleKeyboardActivate = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const renderHierarchyTree = (parentId = null, depth = 0) => {
      const children = objects.filter((o) => o.parentId === parentId && (!filteredHierarchyIds || filteredHierarchyIds.has(o.id)));
      if (children.length === 0) return null;

      return children.map(obj => {
          const hasChildren = objects.some(o => o.parentId === obj.id);
          const isExpanded = expandedNodes.has(obj.id);
          
          return (
              <React.Fragment key={obj.id}>
                  <div 
                      onClick={(e) => { e.stopPropagation(); setSelectedId(obj.id); }}
                      onKeyDown={(e) => handleKeyboardActivate(e, () => {
                        e.stopPropagation();
                        setSelectedId(obj.id);
                      })}
                      onContextMenu={(e) => handleContextMenu(e, 'hierarchy', obj.id)}
                      role="button"
                      tabIndex={0}
                      aria-selected={selectedId === obj.id}
                      className={`flex items-center py-1.5 pr-4 cursor-pointer text-xs border-l-2 transition-colors no-select ${selectedId === obj.id ? 'bg-[#3a72b833] text-white border-[#3a72b8]' : 'hover:bg-[#2a2a2a] text-gray-300 border-transparent'} ${isPlaying && !obj.agent ? 'opacity-60' : ''}`}
                      style={{ paddingLeft: `${depth * 16 + 12}px` }}
                  >
                      <div
                        className="w-4 flex justify-center mr-1"
                        onClick={(e) => hasChildren && toggleNodeExpansion(e, obj.id)}
                        onKeyDown={(e) => {
                          if (!hasChildren) return;
                          handleKeyboardActivate(e, () => toggleNodeExpansion(e, obj.id));
                        }}
                        role={hasChildren ? 'button' : undefined}
                        tabIndex={hasChildren ? 0 : -1}
                        aria-label={hasChildren ? `Toggle ${obj.name} children` : undefined}
                      >
                         {hasChildren ? <ChevronRight size={12} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} /> : null}
                      </div>
                      
                      {obj.type === 'light' ? <Zap size={14} className="mr-2 text-yellow-500" /> : 
                       obj.sensorMount ? <Crosshair size={14} className="mr-2 text-[#00ffcc]" /> :
                       obj.agent ? <Cpu size={14} className="mr-2 text-[#00ffcc]" /> :
                       obj.type === 'gltf' ? <Upload size={14} className="mr-2 text-[#aaa]" /> :
                       obj.type === 'empty' ? <Box size={14} className="mr-2 text-gray-600 border border-dashed border-gray-500 rounded-sm" /> :
                       <Box size={14} className="mr-2 text-gray-400" />}
                      <span className="truncate">{obj.name}</span>
                      {isTraining && obj.agent && (
                        <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[#3a72b822] text-[#9fc3f0] border border-[#3a72b855] font-black tracking-wider uppercase animate-pulse">
                          Training
                        </span>
                      )}
                  </div>
                  {hasChildren && isExpanded && renderHierarchyTree(obj.id, depth + 1)}
              </React.Fragment>
          );
      });
  };

  const selectedObject = objects.find(o => o.id === selectedId);
  const hierarchyNodes = renderHierarchyTree(null, 0);

  return (
    <div className="h-screen flex flex-col bg-[#2d2d30] text-[#d4d4d4] font-sans overflow-hidden text-sm selection:bg-[#3a72b8] selection:text-white relative">
      
      {/* Toast Notifications */}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col space-y-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="bg-[#1a1a1a] border border-[#333] text-white px-5 py-3.5 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center transform transition-all duration-300">
            {t.type === 'success' ? <CheckCircle size={18} className="text-[#6ea8f5] mr-3" /> : <Info size={18} className="text-[#6ea8f5] mr-3" />}
            <span className="font-bold text-xs tracking-wide uppercase">{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Right-Click Context Menus */}
      {contextMenu.visible && (
        <div 
          className="fixed z-[9999] bg-[#1a1a1a] border border-[#3f3f42] rounded-lg shadow-2xl py-1.5 text-[#ccc] text-xs font-bold min-w-[200px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
         >
            {contextMenu.type === 'hierarchy' && (
                <>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={() => handleAddObject('empty', false, contextMenu.targetId)}><PlusCircle size={14} className="mr-3 shrink-0"/> <span>Create Empty {contextMenu.targetId ? 'Child' : ''}</span></div>
                   <div className="border-t border-[#3d3d3f] my-1"></div>
                   <div className="px-4 py-1 text-gray-500 text-[10px] font-black uppercase tracking-widest cursor-default">Primitives</div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-6" onClick={() => handleAddObject('cube', false, contextMenu.targetId)}><Box size={14} className="mr-3 shrink-0"/> <span>Cube</span></div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-6" onClick={() => handleAddObject('sphere', false, contextMenu.targetId)}><Circle size={14} className="mr-3 shrink-0"/> <span>Sphere</span></div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-6" onClick={() => handleAddObject('plane', false, contextMenu.targetId)}><Square size={14} className="mr-3 shrink-0"/> <span>Plane</span></div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-6" onClick={() => handleAddObject('light', false, contextMenu.targetId)}><Zap size={14} className="mr-3 shrink-0"/> <span>Light Source</span></div>
                   <div className="border-t border-[#3d3d3f] my-1"></div>
                   <div className="px-4 py-1 text-[#00ffcc] text-[10px] font-black uppercase tracking-widest cursor-default">Robotics Agents</div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-6" onClick={() => handleAddObject('robotic_arm', true, contextMenu.targetId)}><Cpu size={14} className="mr-3 shrink-0"/> <span>Robotic Arm</span></div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-6" onClick={() => handleAddObject('rover', true, contextMenu.targetId)}><Rocket size={14} className="mr-3 shrink-0"/> <span>Rover</span></div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-6" onClick={() => handleAddObject('drone', true, contextMenu.targetId)}><Plane size={14} className="mr-3 shrink-0"/> <span>Drone</span></div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-6" onClick={() => handleAddObject('humanoid', true, contextMenu.targetId)}><Activity size={14} className="mr-3 shrink-0"/> <span>Humanoid</span></div>
                   {contextMenu.targetId && (
                       <>
                           <div className="border-t border-[#3d3d3f] my-1"></div>
                           <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={() => handleDuplicateObject(contextMenu.targetId)}><Copy size={14} className="mr-3 shrink-0"/> <span>Duplicate</span></div>
                           <div className="px-4 py-2 hover:bg-[#ff3333] hover:text-white cursor-pointer flex items-center" onClick={() => handleDeleteObject(contextMenu.targetId)}><Trash size={14} className="mr-3 shrink-0"/> <span>Delete</span></div>
                       </>
                   )}
                </>
            )}
            {contextMenu.type === 'assets' && (
                <>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={() => { setContextMenu({...contextMenu, visible: false}); triggerToast("Created new folder"); }}><FolderPlus size={14} className="mr-3 shrink-0"/> <span>Create Folder</span></div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={() => { setContextMenu({...contextMenu, visible: false}); triggerToast("Created PBR Material"); }}><Circle size={14} className="mr-3 shrink-0"/> <span>New Material</span></div>
                   <div className="border-t border-[#3d3d3f] my-1.5"></div>
                   <div className="px-4 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={() => { setContextMenu({...contextMenu, visible: false}); triggerToast("Import dialog opened"); }}><Upload size={14} className="mr-3 shrink-0"/> <span>Import CAD Asset...</span></div>
                </>
            )}
         </div>
      )}

      {isDraggingPane && (
        <div className="fixed inset-0 z-[9998]" style={{ cursor: isDraggingPane === 'bottom' ? 'row-resize' : 'col-resize' }} />
      )}

      {/* 1. HEADER MENUS */}
      <div className="h-8 bg-[#323233] border-b border-[#1e1e1e] flex items-center px-2.5 space-x-1.5 text-[11px] z-50 flex-shrink-0 select-none">
        <div className="font-extrabold text-white flex items-center space-x-2 cursor-pointer mr-3" onClick={onExit} title="Return to Hub">
          <Cpu size={16} className="text-[#00ffcc]" />
          <span className="tracking-[0.18em] uppercase">Nexus AI</span>
        </div>
        <div className="flex space-x-0.5 relative text-gray-300 font-semibold tracking-wide">
          
          <div className="relative">
            <span className={`hover:bg-[#3a3a3b] hover:text-white cursor-pointer px-2.5 py-1 rounded-sm transition-colors ${activeMenu === 'file' ? 'bg-[#3a3a3b] text-white' : ''}`} onClick={(e) => toggleMenu(e, 'file')}>File</span>
            {activeMenu === 'file' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a1a] border border-[#3f3f42] shadow-2xl py-1.5 text-[#ccc] z-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex justify-between" onClick={handleSave}><span>Save Environment</span><span className="text-gray-500 text-[10px]">Ctrl+S</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={handleExportProject}><Download size={14} className="mr-3 shrink-0"/> <span>Export Project JSON</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={() => importInputRef.current?.click()}><Upload size={14} className="mr-3 shrink-0"/> <span>Import Project JSON</span></div>
                <div className="border-t border-[#3d3d3f] my-1.5"></div>
                <div className="px-5 py-2 hover:bg-[#ff3333] hover:text-white cursor-pointer flex items-center" onClick={() => { setObjects([]); localStorage.removeItem(workspaceStorageKey); localStorage.removeItem(environmentStorageKey); setActiveMenu(null); triggerToast("Scene cleared", "info"); }}><Trash2 size={14} className="mr-3 shrink-0"/> <span>Clear All Entities</span></div>
                <div className="px-5 py-2 hover:bg-[#ff3333] hover:text-white cursor-pointer flex items-center" onClick={onExit}><LayoutTemplate size={14} className="mr-3 shrink-0"/> <span>Exit to Hub</span></div>
              </div>
            )}
          </div>

          <div className="relative">
            <span className={`hover:bg-[#3a3a3b] hover:text-white cursor-pointer px-2.5 py-1 rounded-sm transition-colors ${activeMenu === 'edit' ? 'bg-[#3a3a3b] text-white' : ''}`} onClick={(e) => toggleMenu(e, 'edit')}>Edit</span>
            {activeMenu === 'edit' && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-[#1a1a1a] border border-[#3f3f42] shadow-2xl py-1.5 text-[#ccc] z-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex justify-between" onClick={() => handleDuplicateObject()}><span>Duplicate</span><span className="text-gray-500 text-[10px]">Ctrl+D</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex justify-between" onClick={() => { handleDeleteObject(); setActiveMenu(null); }}><span>Delete Selected</span><span className="text-gray-500 text-[10px]">Del</span></div>
                <div className="border-t border-[#3d3d3f] my-1.5"></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex justify-between" onClick={() => { togglePlayMode(); setActiveMenu(null); }}><span>{isPlaying ? 'Stop Sim' : 'Play Sim'}</span><span className="text-gray-500 text-[10px]">Space</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex justify-between" onClick={() => { if(selectedId) setFocusTrigger(Date.now()); setActiveMenu(null); }}><span>Frame Object</span><span className="text-gray-500 text-[10px]">F</span></div>
              </div>
            )}
          </div>

          <div className="relative">
            <span className={`hover:bg-[#3a3a3b] hover:text-white cursor-pointer px-2.5 py-1 rounded-sm transition-colors ${activeMenu === 'gameobject' ? 'bg-[#3a3a3b] text-white' : ''}`} onClick={(e) => toggleMenu(e, 'gameobject')}>GameObject</span>
            {activeMenu === 'gameobject' && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-[#1a1a1a] border border-[#3f3f42] shadow-2xl py-1.5 text-[#ccc] z-50 rounded-lg" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={() => handleAddObject('empty')}><PlusCircle size={14} className="mr-3 shrink-0"/> <span>Create Empty</span></div>
                <div className="px-5 py-2 mt-1 hover:bg-[#222] text-white cursor-default font-black text-[10px] uppercase tracking-widest text-[#888]">3D Primitives</div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer pl-8 flex items-center" onClick={() => handleAddObject('cube')}><Box size={14} className="mr-3 shrink-0"/> <span>Cube</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer pl-8 flex items-center" onClick={() => handleAddObject('sphere')}><Circle size={14} className="mr-3 shrink-0"/> <span>Sphere</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer pl-8 flex items-center" onClick={() => handleAddObject('sensor')}><Crosshair size={14} className="mr-3 shrink-0"/> <span>Sensor Pod</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer pl-8 flex items-center" onClick={() => handleAddObject('plane')}><Square size={14} className="mr-3 shrink-0"/> <span>Plane</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center" onClick={() => handleAddObject('light')}><Zap size={14} className="mr-3 shrink-0"/> <span>Light Source</span></div>
                <div className="border-t border-[#3d3d3f] my-1.5"></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex justify-between items-center text-yellow-500" onClick={() => handleAddObject('gltf')}>
                    <div className="flex items-center"><Upload size={14} className="mr-3 shrink-0"/> <span>Import CAD / GLTF</span></div>
                </div>
                <div className="border-t border-[#3d3d3f] my-1.5"></div>
                <div className="px-5 py-2 hover:bg-[#222] text-[#00ffcc] cursor-default font-black text-[10px] uppercase tracking-widest">Robotics Agents</div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-8" onClick={() => handleAddObject('robotic_arm', true)}><Cpu size={14} className="mr-3 shrink-0"/> <span>6-DOF Robotic Arm</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-8" onClick={() => handleAddObject('rover', true)}><Rocket size={14} className="mr-3 shrink-0"/> <span>UGV Rover</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-8" onClick={() => handleAddObject('drone', true)}><Plane size={14} className="mr-3 shrink-0"/> <span>UAV Drone</span></div>
                <div className="px-5 py-2 hover:bg-[#3a72b8] hover:text-white cursor-pointer flex items-center pl-8" onClick={() => handleAddObject('humanoid', true)}><Activity size={14} className="mr-3 shrink-0"/> <span>Bipedal Humanoid</span></div>
              </div>
            )}
          </div>

          <span className="hover:bg-[#3a3a3b] hover:text-white cursor-pointer px-2.5 py-1 rounded-sm transition-colors">Assets</span>
          <span className="hover:bg-[#3a3a3b] hover:text-white cursor-pointer px-2.5 py-1 rounded-sm transition-colors">Component</span>
          <span className="hover:bg-[#3a3a3b] hover:text-white cursor-pointer px-2.5 py-1 rounded-sm transition-colors">Window</span>
          <span className="hover:bg-[#3a3a3b] hover:text-white cursor-pointer px-2.5 py-1 rounded-sm transition-colors">Help</span>
        </div>
        <div className="ml-auto text-gray-500 flex items-center space-x-2.5">
           <span className="text-[10px] bg-[#2b2b2c] px-2 py-1 rounded-sm border border-[#4b4b4e] text-gray-300 font-semibold tracking-wide">
             RUNS {queueSummary.running} active / {queueSummary.queued} queued
           </span>
           <button onClick={() => setShowShortcutsModal(true)} title="View Keyboard Shortcuts" className="flex items-center text-gray-400 font-semibold hover:text-white bg-[#2b2b2c] px-2.5 py-1 rounded-sm transition-colors border border-[#4b4b4e] hover:border-[#3a72b8]">
             <Keyboard size={14} className="mr-2"/> Shortcuts
           </button>
           {isPlaying && <span className="text-green-400 animate-pulse font-bold flex items-center bg-green-900/25 px-2 py-1 rounded-sm border border-green-500/40 tracking-wide"><Play size={12} className="mr-2"/> SIM LIVE</span>}
        </div>
      </div>

      {/* 2. MAIN TOOLBAR */}
      <input
        ref={importInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportProject}
        className="hidden"
      />

      <Toolbar
        isPlaying={isPlaying}
        isTraining={isTraining}
        onTogglePlay={() => togglePlayMode()}
        onToggleTraining={handleToggleTraining}
        onTestModels={handleTestModels}
        trainingEpoch={trainingEpoch}
        latestEpisodeMetrics={latestEpisodeMetrics}
        providerStatusLabel={providerStatus.label}
        providerStatusClass={providerStatus.className}
        providerStatusTitle={providerStatus.title}
        trainingMode={trainingMode}
        setTrainingMode={setTrainingMode}
      />

      {/* 3. MIDDLE WORKSPACE */}
      <div className="flex flex-col flex-1 overflow-hidden" onClick={() => setActiveMenu(null)}>
        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT: HIERARCHY */}
          {!leftCollapsed && (
            <div style={{ width: leftWidth }} className="bg-[#2b2b2c] border-[#1e1e1e] flex flex-col z-10 shadow-xl flex-shrink-0 select-none">
              <HierarchyPanel
                objects={objects}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onRename={handleRenameObject}
                onAddObject={handleAddObject}
                onDeleteObject={handleDeleteObject}
                isPlaying={isPlaying}
                query={hierarchyQuery}
                onQueryChange={setHierarchyQuery}
              />
            </div>
          )}

          {!leftCollapsed && <div className={`w-[6px] bg-[#202022] hover:bg-[#3a72b8] cursor-col-resize z-50 flex-shrink-0 transition-colors ${isDraggingPane === 'left' ? 'bg-[#3a72b8]' : ''}`} onMouseDown={(e) => { e.preventDefault(); setIsDraggingPane('left'); }} />}

          {/* CENTER: SCENE VIEW */}
          <div className="flex-1 bg-[#252526] flex flex-col relative outline-none min-w-0">
            <SceneView
              viewComponent={ThreeJsView}
              objects={objects}
              isPlaying={isPlaying}
              isTraining={isTraining}
              selectedId={selectedId}
              transformMode={transformMode}
              onTransformChange={handleTransformGizmoUpdate}
              showGrid={showGrid}
              setShowGrid={setShowGrid}
              gridFollowCamera={gridFollowCamera}
              setGridFollowCamera={setGridFollowCamera}
              skyboxType={skyboxType}
              setSkyboxType={setSkyboxType}
              is2D={workspace.is2D}
              environmentProfile={environmentProfile}
              focusTrigger={focusTrigger}
              onDropAsset={handleAddAsset}
            />
          </div>

          {!rightCollapsed && <div className={`w-[6px] bg-[#202022] hover:bg-[#3a72b8] cursor-col-resize z-50 flex-shrink-0 transition-colors ${isDraggingPane === 'right' ? 'bg-[#3a72b8]' : ''}`} onMouseDown={(e) => { e.preventDefault(); setIsDraggingPane('right'); }} />}

          {!rightCollapsed && (
            <div style={{ width: rightWidth }} className="bg-[#2b2b2c] flex flex-col overflow-y-auto z-10 shadow-2xl flex-shrink-0 relative">
              <div className="h-9 bg-[#303031] flex items-center px-3 border-b border-[#1f1f1f] font-semibold text-[11px] text-gray-300 tracking-wide uppercase select-none">
                <ChevronsRight size={16} className="mr-3 text-gray-500 hover:text-white cursor-pointer transition-colors" title="Collapse Panel" onClick={(e) => { e.stopPropagation(); setRightCollapsed(true); }} />
                Inspector {isPlaying && <span className="ml-3 px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-800 rounded-sm text-[9px] font-black">LOCKED IN PLAY MODE</span>}
              </div>

              <InspectorPanel
                selectedObject={selectedObject}
                isPlaying={isPlaying}
                updateObject={updateObject}
                onAddSensorPod={handleAddSensorPod}
              />
            </div>
          )}
        </div>

        {!bottomCollapsed && <div className={`h-[6px] bg-[#111] hover:bg-[#007acc] cursor-row-resize z-50 flex-shrink-0 transition-colors ${isDraggingPane === 'bottom' ? 'bg-[#007acc]' : ''}`} onMouseDown={(e) => { e.preventDefault(); setIsDraggingPane('bottom'); }} />}

        {/* BOTTOM PANEL */}
        {!bottomCollapsed && (
          <div style={{ height: bottomHeight }} className="bg-[#252526] flex flex-col z-10 relative flex-shrink-0">
            <div className="h-9 bg-[#303031] flex items-center px-3 border-b border-[#222] select-none shadow-sm relative">
              <BottomTab title="Project" active={activeTabBottom === 'project'} onClick={() => setActiveTabBottom('project')} icon={<Folder size={14}/>}/>
              <BottomTab title="Console" active={activeTabBottom === 'console'} onClick={() => setActiveTabBottom('console')} icon={<TerminalSquare size={14}/>}/>
              <BottomTab title="Run Queue" active={activeTabBottom === 'runs'} onClick={() => setActiveTabBottom('runs')} icon={<Cpu size={14}/>} />
              <BottomTab title="ML-Agents" active={activeTabBottom === 'ml-agents'} onClick={() => setActiveTabBottom('ml-agents')} icon={<Activity size={14}/>} />
              <BottomTab title="Readiness" active={activeTabBottom === 'readiness'} onClick={() => setActiveTabBottom('readiness')} icon={<ShieldCheck size={14}/>} />
              
              <button onClick={() => setBottomCollapsed(true)} className="absolute right-6 p-1.5 bg-[#1a1a1a] hover:bg-[#333] text-gray-500 hover:text-white rounded border border-[#333] transition-colors shadow-inner" title="Collapse Bottom Panel">
                 <ChevronsDown size={14} />
              </button>
            </div>
            
            <div 
              className="flex-1 overflow-y-auto bg-[#1f1f20] p-4 relative"
               onContextMenu={(e) => activeTabBottom === 'project' && handleContextMenu(e, 'assets')}
            >
              {activeTabBottom === 'project' && (
                <AssetsPanel
                  workspace={workspace}
                  engineRef={trainerRef}
                  onModelLoaded={() => triggerToast('Model loaded from storage.', 'success')}
                  onAddAsset={handleAddAsset}
                  trainingData={trainingData}
                  isTraining={isTraining}
                />
              )}

              {activeTabBottom === 'console' && (
                <div className="font-mono text-[12px] space-y-2 text-gray-300">
                  <div className="text-gray-500">[{new Date().toLocaleTimeString()}] System: Nexus AI Engine initialized. Hardware: WebGL 2.0 / WebXR Supported</div>
                  <div>[{new Date().toLocaleTimeString()}] Scene: Loaded simulation template '{workspace.name}' successfully.</div>
                  <div className="text-green-400 font-bold">[{new Date().toLocaleTimeString()}] PhysX: Material definitions mapped. Domain Randomization seed set.</div>
                  {isPlaying && <div className="text-[#6ea8f5] font-bold">[{new Date().toLocaleTimeString()}] Physics: World started. Stepping at 60Hz. Constraints active.</div>}
                  {isTraining && <div className="text-yellow-400 font-bold">[{new Date().toLocaleTimeString()}] RL Engine: Running online policy improvement loop with live scene feedback.</div>}
                </div>
              )}

              {activeTabBottom === 'runs' && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-white font-black tracking-widest uppercase">Model Run Queue</div>
                    <div className="text-xs text-gray-400 font-bold bg-[#222] px-4 py-1.5 rounded-full border border-[#444]">
                      Total {queueSummary.total} · Running {queueSummary.running} · Queued {queueSummary.queued}
                    </div>
                  </div>

                  {activeRun && (
                    <div className="mb-3 border border-[#355278] bg-[#111826] rounded-lg p-3">
                      <div className="text-[10px] text-[#9fc3f0] font-black uppercase tracking-wider mb-2">Active Run Details</div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                        <div className="text-gray-400">Model <span className="text-white font-bold ml-1">{activeRun.config.model.toUpperCase()}</span></div>
                        <div className="text-gray-400">Robot <span className="text-white font-bold ml-1">{activeRun.config.robot}</span></div>
                        <div className="text-gray-400">Status <span className="text-[#9fc3f0] font-bold ml-1 uppercase">{activeRun.status}</span></div>
                        <div className="text-gray-400">Progress <span className="text-white font-bold ml-1">{activeRun.progress.toFixed(1)}%</span></div>
                        <div className="text-gray-400">Episode <span className="text-white font-bold ml-1">{trainingEpoch}</span></div>
                        <div className="text-gray-400">Reward <span className="text-white font-bold ml-1">{Number(latestEpisodeMetrics?.reward || 0).toFixed(2)}</span></div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 overflow-y-auto pr-2">
                    {runQueue.length === 0 && (
                      <div className="h-32 border border-[#333] rounded-lg bg-[#101010] flex items-center justify-center text-gray-600 text-xs font-black tracking-widest uppercase">
                        No training runs queued yet
                      </div>
                    )}

                    {runQueue.map((run) => (
                      <div key={run.id} className="border border-[#333] bg-[#101010] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-white font-black tracking-wide uppercase">{run.config.model} · {run.config.robot}</div>
                          <span className={`text-[10px] px-2 py-1 rounded border font-black tracking-wider uppercase ${
                            run.status === 'completed'
                              ? 'bg-green-900/30 text-green-400 border-green-600/50'
                              : run.status === 'running'
                                  ? 'bg-[#3a72b822] text-[#9fc3f0] border-[#3a72b866]'
                                : 'bg-[#1f2937] text-gray-300 border-[#374151]'
                          }`}>
                            {run.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mb-3">
                          Env: {run.config.environment} · Objects: {run.config.objectCount} · ETA: {run.etaMinutes} min
                        </div>
                        <div className="w-full h-2 rounded bg-[#222] overflow-hidden">
                          <div className="h-full bg-[#3a72b8] transition-all" style={{ width: `${run.progress}%` }} />
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500 font-bold tracking-wider">{run.progress.toFixed(1)}% COMPLETE</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTabBottom === 'ml-agents' && (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm text-white font-black tracking-widest uppercase">Mean Reward (Smoothed)</div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-400 font-bold bg-[#222] px-4 py-1.5 rounded-full border border-[#444]">Active Network: <span className="text-[#9fc3f0] ml-1">{modelId.toUpperCase()}</span></div>
                      {benchmarkMode && benchmarkSummary.episodes > 0 && (
                        <button onClick={handleExportBenchmarkReport} className="text-[10px] font-extrabold uppercase tracking-wide bg-[#2b2b2c] text-gray-200 border border-[#4b4b4e] hover:border-[#3a72b8] rounded-sm px-3 py-1.5 transition-colors">Export Benchmark</button>
                      )}
                    </div>
                  </div>
                  {benchmarkMode && benchmarkSummary.episodes > 0 && (
                    <div className="mb-3 grid grid-cols-4 gap-2 text-[10px]">
                      <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Episodes <span className="text-white ml-1">{benchmarkSummary.episodes}</span></div>
                      <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Success <span className="text-[#9fc3f0] ml-1">{benchmarkSummary.successRate}%</span></div>
                      <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Reward <span className="text-white ml-1">{benchmarkSummary.avgReward}</span></div>
                      <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Score <span className="text-[#9fc3f0] ml-1">{benchmarkSummary.score}</span></div>
                    </div>
                  )}
                  {!isTraining && (
                    <div className="mb-3 bg-[#111] border border-[#2f3f57] rounded-md p-3 text-[11px]">
                      <div className="text-[#9fc3f0] font-black uppercase tracking-wide mb-1">Training Quick Start</div>
                      <div className="text-gray-300">1) Place/keep one agent and one goal in scene.</div>
                      <div className="text-gray-300">2) Click <span className="font-black">Play & Train</span> in top toolbar.</div>
                      <div className="text-gray-300">3) Watch reward curve + readiness score for progress.</div>
                    </div>
                  )}
                  <div className="flex-1 border-2 border-[#333] bg-[#0a0a0a] rounded-xl relative overflow-hidden flex items-end min-h-[120px] shadow-inner">
                    <svg className="w-full h-full absolute bottom-0 left-0" preserveAspectRatio="none">
                      <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#222" strokeWidth="2" strokeDasharray="6" />
                      <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#333" strokeWidth="2" strokeDasharray="6" />
                      <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#222" strokeWidth="2" strokeDasharray="6" />
                      {trainingData.length > 1 && (
                        <path
                          d={`M ${trainingData.map((d, i) => {
                            const x = (i / 100) * 100;
                            const y = 100 - ((d.reward + 50) / 150) * 100;
                            return `${x}% ${y}%`;
                          }).join(' L ')}`}
                          fill="none"
                          stroke="#3a72b8"
                          strokeWidth="3"
                          vectorEffect="non-scaling-stroke"
                          style={{ filter: 'drop-shadow(0 0 6px rgba(58,114,184,0.6))' }}
                        />
                      )}
                      {trainingData.length > 1 && (
                        <path
                          d={`M 0% 100% L ${trainingData.map((d, i) => {
                            const x = (i / 100) * 100;
                            const y = 100 - ((d.reward + 50) / 150) * 100;
                            return `${x}% ${y}%`;
                          }).join(' L ')} L 100% 100% Z`}
                          fill="url(#grad)"
                        />
                      )}
                      <defs>
                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(58, 114, 184, 0.45)" />
                          <stop offset="100%" stopColor="rgba(58, 114, 184, 0.0)" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {!isTraining && trainingData.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-sm font-black tracking-widest uppercase select-none">
                        Awaiting Training Session
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTabBottom === 'readiness' && (
                <div className="h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-white font-black tracking-widest uppercase">Sim2Real Launch Readiness</div>
                    <div className="flex items-center gap-2">
                      <div className={`text-xs font-black px-3 py-1.5 rounded-full border ${readinessSummary.releaseReady ? 'bg-green-900/35 text-green-300 border-green-600/40' : 'bg-amber-900/35 text-amber-300 border-amber-600/40'}`}>
                        {readinessSummary.releaseReady ? 'Release Ready' : 'Needs Hardening'}
                      </div>
                      <button onClick={handleRunScenarioSuite} className="text-[10px] font-extrabold uppercase tracking-wide bg-[#2b5f9f] text-white border border-[#3a72b8] hover:bg-[#3a72b8] rounded-sm px-3 py-1.5 transition-colors">Run Scenario Suite</button>
                      <button onClick={handleExportLaunchEvidencePack} className="text-[10px] font-extrabold uppercase tracking-wide bg-[#165534] text-white border border-[#22c55e] hover:bg-[#15803d] rounded-sm px-3 py-1.5 transition-colors">Export Launch Pack</button>
                      <button onClick={handleExportReadinessReport} className="text-[10px] font-extrabold uppercase tracking-wide bg-[#2b2b2c] text-gray-200 border border-[#4b4b4e] hover:border-[#3a72b8] rounded-sm px-3 py-1.5 transition-colors">Export Readiness</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2 mb-4 text-[10px]">
                    <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Overall <span className="text-white ml-1">{readinessSummary.overallScore}</span></div>
                    <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Scene <span className="text-white ml-1">{readinessSummary.categories.sceneComplexity}</span></div>
                    <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Sensors <span className="text-white ml-1">{readinessSummary.categories.sensorCoverage}</span></div>
                    <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Env <span className="text-white ml-1">{readinessSummary.categories.environmentFidelity}</span></div>
                    <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Training <span className="text-white ml-1">{readinessSummary.categories.trainingMaturity}</span></div>
                    <div className="bg-[#1a1a1b] border border-[#3d3d3f] rounded-sm px-2 py-1.5 text-gray-300">Benchmark <span className="text-white ml-1">{readinessSummary.categories.benchmarkRigor}</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                    <div className="border border-[#333] rounded-lg bg-[#101010] p-4 overflow-y-auto">
                      <div className="text-[11px] text-gray-400 font-black uppercase tracking-wider mb-3">Quality Gates</div>
                      <div className="space-y-2">
                        {readinessSummary.gates.map((gate) => (
                          <div key={gate.id} className="bg-[#161616] border border-[#2e2e2f] rounded-md px-3 py-2">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-200 font-bold">{gate.label}</span>
                              <span className={`${gate.pass ? 'text-green-400' : 'text-amber-300'} font-black`}>{gate.value.toFixed(1)} / {gate.target}</span>
                            </div>
                            <div className="w-full h-1.5 rounded bg-[#222] mt-2 overflow-hidden">
                              <div className={`h-full ${gate.pass ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, gate.value)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border border-[#333] rounded-lg bg-[#101010] p-4 overflow-y-auto">
                      <div className="text-[11px] text-gray-400 font-black uppercase tracking-wider mb-3">Release Evidence</div>
                      <div className="space-y-2 text-[11px] text-gray-300">
                        <div className="flex justify-between"><span>Objects</span><span className="text-white">{readinessSummary.metrics.totalObjects}</span></div>
                        <div className="flex justify-between"><span>Dynamic Bodies</span><span className="text-white">{readinessSummary.metrics.dynamicObjects}</span></div>
                        <div className="flex justify-between"><span>Agents</span><span className="text-white">{readinessSummary.metrics.agents}</span></div>
                        <div className="flex justify-between"><span>Sensor Nodes</span><span className="text-white">{readinessSummary.metrics.sensorObjects}</span></div>
                        <div className="flex justify-between"><span>Solved Rate</span><span className="text-white">{readinessSummary.metrics.solvedRate}%</span></div>
                        <div className="flex justify-between"><span>Benchmark Episodes</span><span className="text-white">{readinessSummary.metrics.benchmarkEpisodes}</span></div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#2a2a2b]">
                        <div className="text-[10px] text-gray-500 font-black uppercase tracking-wider mb-2">Recommended Next Steps</div>
                        {readinessSummary.recommendations.length === 0 ? (
                          <div className="text-[11px] text-green-300">All launch heuristics passed. Continue validation against external benchmark scenarios.</div>
                        ) : (
                          <ul className="space-y-1.5">
                            {readinessSummary.recommendations.map((item, index) => (
                              <li key={`${item}-${index}`} className="text-[11px] text-gray-300">• {item}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {scenarioSuiteReport && (
                        <div className="mt-4 pt-3 border-t border-[#2a2a2b]">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Scenario Suite</div>
                            <div className={`text-[10px] font-black px-2 py-1 rounded border ${scenarioSuiteReport.summary.marketReady ? 'bg-green-900/35 text-green-300 border-green-600/40' : 'bg-amber-900/35 text-amber-300 border-amber-600/40'}`}>
                              Avg {scenarioSuiteReport.summary.averageScore} · Stability {scenarioSuiteReport.summary.transferStability}%
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {scenarioSuiteReport.scenarios.map((scenario) => (
                              <div key={scenario.id} className="text-[10px] bg-[#161616] border border-[#2e2e2f] rounded px-2 py-1.5 flex items-center justify-between">
                                <span className="text-gray-300">{scenario.label}</span>
                                <span className={`${scenario.releaseReady ? 'text-green-400' : 'text-amber-300'} font-black`}>{scenario.overallScore}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SHORTCUTS HELP MODAL */}
      {showShortcutsModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm" onClick={() => setShowShortcutsModal(false)}>
          <div className="bg-[#151515] border border-[#333] w-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-14 bg-[#111] border-b border-[#222] flex items-center justify-between px-6">
              <div className="text-white font-black tracking-wider uppercase flex items-center"><Keyboard size={20} className="mr-3 text-[#00ffcc]"/> Editor Shortcuts</div>
              <X size={20} className="text-gray-500 hover:text-white cursor-pointer transition-colors" onClick={() => setShowShortcutsModal(false)} />
            </div>
            <div className="p-8 space-y-5">
              <ShortcutRow keys={['Space']} desc="Play / Pause Physics Simulation" />
              <div className="h-px bg-[#222] w-full my-3"></div>
              <ShortcutRow keys={['W']} desc="Select Translate Tool" />
              <ShortcutRow keys={['E']} desc="Select Rotate Tool" />
              <ShortcutRow keys={['R']} desc="Select Scale Tool" />
              <ShortcutRow keys={['F']} desc="Frame / Focus Selected Object" />
              <div className="h-px bg-[#222] w-full my-3"></div>
              <ShortcutRow keys={['Del', 'Bksp']} desc="Delete Selected Entity" />
              <ShortcutRow keys={['Esc']} desc="Deselect / Close Menus" />
              <ShortcutRow keys={['Ctrl', 'S']} desc="Save Environment State" />
            </div>
            <div className="bg-[#0a0a0a] p-4 border-t border-[#222] text-center text-gray-500 text-xs font-bold uppercase tracking-widest">
              Press Esc to close
            </div>
          </div>
        </div>
      )}

      {/* DEPLOYMENT MODAL (ROS2) */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm">
           <div className="bg-[#111] border border-[#333] w-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="h-14 bg-[#0a0a0a] border-b border-[#222] flex items-center justify-between px-6">
                 <div className="text-[#00ffcc] font-black text-sm tracking-wider uppercase flex items-center"><TerminalSquare size={18} className="mr-3"/> Sim2Real Deployment Pipeline</div>
                 <X size={18} className="text-gray-500 hover:text-white cursor-pointer transition-colors" onClick={() => setShowDeployModal(false)} />
              </div>
              <div className="p-8 bg-[#050505] font-mono text-xs text-green-400 space-y-3 h-80 overflow-y-auto leading-relaxed">
                 <div>$ nexus-build --target ros2_humble --model policy_v4.onnx --quantize int8</div>
                 <div className="text-gray-400">Loading neural network computational graph... [OK]</div>
                 <div className="text-gray-400">Optimizing weights for Nvidia TensorRT inference...</div>
                 <div className="text-yellow-400">Warning: Observation space dimension mismatch handled via padding strategy.</div>
                 <div className="text-gray-400">Applying Domain Randomization normalization filters... [OK]</div>
                 <div>Generating C++ ROS2 Node wrappers and publisher topics...</div>
                 <div>{'[=========>               ] 45%'}</div>
                 <div className="animate-pulse text-white mt-6 font-bold">Compiling executable binaries... please wait.</div>
              </div>
              <div className="p-5 bg-[#0a0a0a] border-t border-[#222] flex justify-end">
                 <button onClick={() => setShowDeployModal(false)} className="px-6 py-2.5 bg-[#333] hover:bg-[#ff3333] text-white rounded-lg text-xs font-black tracking-wider uppercase transition-colors shadow-md">Cancel Build</button>
              </div>
           </div>
        </div>
      )}

      {showGltfModal && (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center backdrop-blur-sm" onClick={() => setShowGltfModal(false)}>
          <div className="bg-[#111] border border-[#333] w-[620px] rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="h-14 bg-[#0a0a0a] border-b border-[#222] flex items-center justify-between px-6">
              <div className="text-[#9fc3f0] font-black text-sm tracking-wider uppercase flex items-center"><Upload size={16} className="mr-2"/> Import CAD / GLTF</div>
              <X size={18} className="text-gray-500 hover:text-white cursor-pointer transition-colors" onClick={() => setShowGltfModal(false)} />
            </div>
            <div className="p-6 space-y-4">
              <div className="text-xs text-gray-400">Paste a direct HTTPS URL to a `.gltf` or `.glb` model file.</div>
              <input
                value={gltfUrlInput}
                onChange={(e) => setGltfUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowGltfModal(false);
                  if (e.key === 'Enter') handleCreateGltfObject();
                }}
                aria-label="GLTF model URL"
                placeholder="https://example.com/robot.glb"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-md px-3 py-2 text-white outline-none focus:border-[#3a72b8]"
              />
            </div>
            <div className="p-5 bg-[#0a0a0a] border-t border-[#222] flex justify-end gap-3">
              <button onClick={() => setShowGltfModal(false)} className="px-4 py-2 bg-[#222] hover:bg-[#333] text-gray-300 rounded-md text-xs font-bold tracking-wide uppercase transition-colors">Cancel</button>
              <button onClick={handleCreateGltfObject} className="px-4 py-2 bg-[#3a72b8] hover:bg-[#2b5f9f] text-white rounded-md text-xs font-black tracking-wider uppercase transition-colors">Create Model</button>
            </div>
          </div>
        </div>
      )}

      <div className="h-5 bg-[#262627] border-t border-[#1e1e1e] flex items-center px-2.5 text-[10px] text-gray-400 font-semibold tracking-wide flex-shrink-0 select-none">
        <span className="mr-3">Layout: Default</span>
        <span className="mr-3 text-[#444]">|</span>
        <span className="mr-3">Objects: {objects.length}</span>
        <span className="mr-3 text-[#444]">|</span>
        <span className="mr-3">Selected: {selectedObject ? selectedObject.name : 'None'}</span>
        <span className="mr-3 text-[#444]">|</span>
        <span className="mr-3">Mode: {isPlaying ? 'Play' : 'Edit'}</span>
        <span className="mr-3 text-[#444]">|</span>
        <button
          type="button"
          onClick={refreshBridgeHealth}
          className={`mr-3 hover:text-white transition-colors ${bridgeStatusClass}`}
          title={bridgeStatusInteractiveTitle}
        >
          {bridgeStatusLabel}
        </button>
        <span className="ml-auto">Training: {isTraining ? 'Active' : 'Idle'}</span>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function ShortcutRow({ keys, desc }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-300 font-bold">{desc}</span>
      <div className="flex space-x-2">
        {keys.map(k => (
          <span key={k} className="bg-[#222] text-white border border-[#444] rounded-md px-3 py-1.5 text-xs font-black min-w-[32px] text-center shadow-md shadow-black/50">
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}

function ToolButton({ icon, active, onClick, disabled, title }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-10 h-8 flex items-center justify-center rounded transition-all ${disabled ? 'opacity-30 cursor-not-allowed' : active ? 'bg-[#007acc] text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]' : 'text-gray-400 hover:bg-[#333] hover:text-white'}`}
    >
      {icon}
    </button>
  );
}

function ComponentPanel({ title, icon, children, accent }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`border rounded-lg overflow-hidden shadow-sm ${accent ? 'border-[#3a72b844] bg-[#3a72b80a]' : 'border-[#3b3b3b] bg-[#1f1f20]'}`}>
      <div 
        className={`flex items-center p-2.5 cursor-pointer select-none transition-colors ${accent ? 'bg-[#3a72b822] hover:bg-[#3a72b833]' : 'bg-[#252526] hover:bg-[#2d2d2f]'}`}
        onClick={() => setOpen(!open)}
      >
        <ChevronRight size={16} className={`transform transition-transform mr-2 ${accent ? 'text-[#9fc3f0]' : 'text-gray-400'} ${open ? 'rotate-90' : ''}`} />
        <span className={`${accent ? 'text-[#9fc3f0]' : 'text-gray-400'} mr-3 shrink-0`}>{icon}</span>
        <span className={`text-[11px] font-extrabold uppercase tracking-wide ${accent ? 'text-white' : 'text-gray-200'}`}>{title}</span>
      </div>
      {open && <div className="p-4 bg-transparent">{children}</div>}
    </div>
  );
}

function Vector3Input({ label, value, onChange }) {
  const handleInput = (idx, val) => {
    const newVal = [...value];
    newVal[idx] = parseFloat(val) || 0;
    onChange(newVal);
  };
  return (
    <div className="flex items-center text-xs mb-2.5">
      <div className="w-20 text-gray-400 font-semibold uppercase tracking-wide">{label}</div>
      <div className="flex-1 flex space-x-2">
        <div className="flex-1 flex bg-[#1b1b1c] rounded-sm overflow-hidden border border-[#3d3d3d] focus-within:border-[#3a72b8] transition-colors shadow-inner">
          <div className="w-6 bg-[#2a2a2b] text-[#d06a6a] flex items-center justify-center text-[10px] font-black select-none">X</div>
          <input type="number" value={Number(value[0]||0).toFixed(2)} onChange={(e)=>handleInput(0, e.target.value)} className="w-full bg-transparent text-white px-2 py-1.5 text-right font-mono outline-none min-w-0" />
        </div>
        <div className="flex-1 flex bg-[#1b1b1c] rounded-sm overflow-hidden border border-[#3d3d3d] focus-within:border-[#3a72b8] transition-colors shadow-inner">
          <div className="w-6 bg-[#2a2a2b] text-[#7cc083] flex items-center justify-center text-[10px] font-black select-none">Y</div>
          <input type="number" value={Number(value[1]||0).toFixed(2)} onChange={(e)=>handleInput(1, e.target.value)} className="w-full bg-transparent text-white px-2 py-1.5 text-right font-mono outline-none min-w-0" />
        </div>
        <div className="flex-1 flex bg-[#1b1b1c] rounded-sm overflow-hidden border border-[#3d3d3d] focus-within:border-[#3a72b8] transition-colors shadow-inner">
          <div className="w-6 bg-[#2a2a2b] text-[#6ea8f5] flex items-center justify-center text-[10px] font-black select-none">Z</div>
          <input type="number" value={Number(value[2]||0).toFixed(2)} onChange={(e)=>handleInput(2, e.target.value)} className="w-full bg-transparent text-white px-2 py-1.5 text-right font-mono outline-none min-w-0" />
        </div>
      </div>
    </div>
  );
}

function BottomTab({ title, active, onClick, icon }) {
  return (
    <div 
      onClick={onClick}
      className={`px-4 py-2 flex items-center text-[11px] font-extrabold uppercase tracking-wide cursor-pointer border-t-2 ${active ? 'bg-[#151515] text-white border-t-[#007acc]' : 'bg-transparent text-gray-500 border-t-transparent hover:text-gray-300 hover:bg-[#222]'} transition-colors`}
    >
      {icon && <span className={`mr-3 shrink-0 ${active ? 'text-[#007acc]' : ''}`}>{icon}</span>}
      {title}
    </div>
  );
}

function AssetIcon({ name, icon }) {
  return (
    <div className="flex flex-col items-center w-28 group cursor-pointer">
      <div className="w-20 h-20 bg-[#1e1e1e] border border-[#333] rounded-xl flex items-center justify-center group-hover:border-[#007acc] group-hover:bg-[#252525] transition-all shadow-lg group-hover:shadow-[0_5px_15px_rgba(0,122,204,0.2)]">
        {icon}
      </div>
      <div className="text-xs font-bold text-gray-400 mt-3 truncate w-full text-center group-hover:text-white px-1 transition-colors">{name}</div>
    </div>
  );
}

// --- THREE.JS & CANNON.JS WRAPPER ---
function ThreeJsView({ objects, isPlaying, isTraining, selectedId, transformMode, onTransformChange, showGrid, gridFollowCamera, skyboxType, is2D, focusTrigger, environmentProfile }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const meshesRef = useRef({});
  const bodiesRef = useRef({});
  const controlsRef = useRef(null);
  const transformRef = useRef(null);
  const worldRef = useRef(null);
  const gridHelperRef = useRef(null);
  const infiniteGroundRef = useRef(null);
  
  const rendererRef = useRef(null);
  const mainCameraRef = useRef(null);
  const pipCameraRef = useRef(null);
  const trainingMotionRef = useRef({});
  const [sceneVersion, setSceneVersion] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadScript = (src, checkGlobal) => {
      const globalKey = '__nexusScriptLoadCache';
      const loadCache = window[globalKey] || (window[globalKey] = {});

      return new Promise((resolve) => {
        if (window[checkGlobal]) return resolve();
        if (checkGlobal.includes('.') && window[checkGlobal.split('.')[0]]) {
            const props = checkGlobal.split('.');
            if(window[props[0]][props[1]]) return resolve();
        }

        if (loadCache[src]) {
          loadCache[src].then(resolve);
          return;
        }

        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          loadCache[src] = new Promise((innerResolve) => {
            existingScript.addEventListener('load', innerResolve, { once: true });
          });
          loadCache[src].then(resolve);
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        loadCache[src] = new Promise((innerResolve) => {
          script.onload = innerResolve;
        });
        loadCache[src].then(resolve);
        document.head.appendChild(script);
      });
    };

    const loadAll = async () => {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'THREE');
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js', 'THREE.OrbitControls');
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js', 'THREE.TransformControls');
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', 'THREE.GLTFLoader');
      await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/environments/RoomEnvironment.js', 'THREE.RoomEnvironment');
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js', 'CANNON');
      if (isMounted) initThree();
    };

    loadAll();

    function initThree() {
      if (!mountRef.current || !window.THREE) return;
      const THREE = window.THREE;
      const CANNON = window.CANNON;
      while (mountRef.current.firstChild) mountRef.current.removeChild(mountRef.current.firstChild);

      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      // Fixed Moiré: Enabled logarithmicDepthBuffer to sort distant pixels properly
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", logarithmicDepthBuffer: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2; 
      renderer.autoClear = false; 
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      if (THREE.RoomEnvironment) scene.userData.studioEnv = pmremGenerator.fromScene(new THREE.RoomEnvironment()).texture;

      const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
      const skyMat = new THREE.ShaderMaterial({
          uniforms: {
              topColor: { value: new THREE.Color('#5a8cbd') },
              bottomColor: { value: new THREE.Color('#2a2a2a') },
              offset: { value: 33 },
              exponent: { value: 0.6 }
          },
          vertexShader: `varying vec3 vWorldPosition; void main() { vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
          fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorldPosition; void main() { vec3 horizonColor = vec3(0.80, 0.84, 0.88); float h = normalize(vWorldPosition).y; vec3 color; if (h > 0.0) { color = mix(horizonColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)); } else { color = mix(horizonColor, bottomColor, max(pow(max(-h, 0.0), 0.2), 0.0)); } gl_FragColor = vec4(color, 1.0); }`,
          side: THREE.BackSide, depthWrite: false
      });
      const skyDome = new THREE.Mesh(skyGeo, skyMat);
      skyDome.renderOrder = -100;
      scene.add(skyDome);
      scene.userData.skyDome = skyDome;

      const envScene = new THREE.Scene();
      envScene.add(skyDome.clone());
      scene.userData.unityEnv = pmremGenerator.fromScene(envScene).texture;

      if (skyboxType === 'unity') {
          scene.userData.skyDome.visible = true;
          scene.background = null; 
          scene.fog = new THREE.Fog('#cbd6e0', 500, 12000); 
          scene.environment = scene.userData.unityEnv;
      } else {
          scene.userData.skyDome.visible = true;
          scene.background = null;
          scene.fog = new THREE.Fog('#60748a', 400, 9000); 
          scene.environment = scene.userData.studioEnv;
      }

      const infiniteGroundGeo = new THREE.PlaneGeometry(500000, 500000, 1, 1);
      const infiniteGroundMat = new THREE.MeshStandardMaterial({
        color: skyboxType === 'unity' ? '#89a7c2' : '#6d7f94',
        roughness: 0.95,
        metalness: 0.02,
      });
      const infiniteGround = new THREE.Mesh(infiniteGroundGeo, infiniteGroundMat);
      if (is2D) {
        infiniteGround.rotation.set(0, 0, 0);
        infiniteGround.position.set(0, 0, -0.08);
      } else {
        infiniteGround.rotation.x = -Math.PI / 2;
        infiniteGround.position.set(0, -0.08, 0);
      }
      infiniteGround.receiveShadow = !is2D;
      infiniteGround.renderOrder = -20;
      scene.add(infiniteGround);
      infiniteGroundRef.current = infiniteGround;

      // Massive Grid Setup & Moiré reduction
      const gridHelper = new THREE.GridHelper(120000, 4000, 0x8fa8c4, 0x5b6d80);
      gridHelper.position.y = -0.01; 
      gridHelper.visible = showGrid;
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.22;
      if(is2D) {
          gridHelper.rotation.x = Math.PI / 2; 
      }
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;

      const selectionBox = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1,1,1)), 0x3a72b8);
      selectionBox.material.depthTest = false; 
      selectionBox.material.transparent = true;
      selectionBox.material.opacity = 0.9;
      selectionBox.visible = false;
      scene.add(selectionBox);
      scene.userData.selectionBox = selectionBox;
      setSceneVersion((prev) => prev + 1);

      let camera;
      if (is2D) {
          camera = new THREE.OrthographicCamera(width / -50, width / 50, height / 50, height / -50, 1, 500000);
          camera.position.set(0, 0, 50);
          camera.lookAt(0, 0, 0);
      } else {
          camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500000);
          camera.position.set(20, 15, 20);
          camera.lookAt(0, 0, 0);
      }
      mainCameraRef.current = camera;

      const pipCam = new THREE.PerspectiveCamera(70, 1.5, 0.1, 100);
      pipCameraRef.current = pipCam;

      const controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      
      controls.minDistance = 1;      
      controls.maxDistance = 8000;    
      controls.maxZoom = 10;         
      controls.minZoom = 0.05;       

      if (is2D) {
          controls.enableRotate = false; 
      } else {
          controls.maxPolarAngle = Math.PI / 2 - 0.01; 
      }
      controlsRef.current = controls;

      const tControls = new THREE.TransformControls(camera, renderer.domElement);
      tControls.addEventListener('dragging-changed', (event) => controls.enabled = !event.value);
      if (is2D) tControls.showZ = false; 
      tControls.addEventListener('mouseUp', () => {
         if (transformRef.current.object) {
             const obj = transformRef.current.object;
             const id = Object.keys(meshesRef.current).find(key => meshesRef.current[key] === obj);
             if (id) {
                 onTransformChange(id, 
                     [obj.position.x, obj.position.y, obj.position.z],
                     [obj.rotation.x * 180/Math.PI, obj.rotation.y * 180/Math.PI, obj.rotation.z * 180/Math.PI],
                     [obj.scale.x, obj.scale.y, obj.scale.z]
                 );
             }
         }
      });
      scene.add(tControls);
      transformRef.current = tControls;

      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x60748a, 0.95);
      hemiLight.position.set(0, 50, 0);
      scene.add(hemiLight);
      
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.3);
      dirLight.position.set(20, 40, 20);
      dirLight.castShadow = !is2D; 
      dirLight.shadow.mapSize.width = 2048; 
      dirLight.shadow.mapSize.height = 2048;
      dirLight.shadow.camera.near = 0.5;
      dirLight.shadow.camera.far = 100;
      dirLight.shadow.camera.left = -40;
      dirLight.shadow.camera.right = 40;
      dirLight.shadow.camera.top = 40;
      dirLight.shadow.camera.bottom = -40;
      dirLight.shadow.bias = -0.0001; 
      dirLight.shadow.normalBias = 0.02; 
      scene.add(dirLight);
      scene.userData.dirLight = dirLight;

      const animate = function () {
        if (!isMounted) return;
        requestAnimationFrame(animate);
        if (controlsRef.current) controlsRef.current.update();
        
        if (window._selectedMesh && scene.userData.selectionBox) {
            scene.userData.selectionBox.setFromObject(window._selectedMesh);
            scene.userData.selectionBox.update();
            scene.userData.selectionBox.visible = true;
        } else if (scene.userData.selectionBox) {
            scene.userData.selectionBox.visible = false;
        }

        const pulseIntensity = 0.25 + ((Math.sin(Date.now() / 140) + 1) * 0.3);
        Object.values(meshesRef.current).forEach((mesh) => {
          const trainingPulseActive = Boolean(mesh?.userData?.trainingPulse);
          mesh.traverse((child) => {
            if (!child?.isMesh || !child.material) return;

            const applyPulse = (mat) => {
              if (!mat?.emissive) return;
              if (trainingPulseActive) {
                mat.emissive.set('#3a72b8');
                mat.emissiveIntensity = pulseIntensity;
              }
            };

            if (Array.isArray(child.material)) child.material.forEach(applyPulse);
            else applyPulse(child.material);
          });
        });

        if (worldRef.current) {
            worldRef.current.step(1/60);
            Object.keys(bodiesRef.current).forEach(id => {
                const body = bodiesRef.current[id];
                const mesh = meshesRef.current[id];
                if (body && mesh) {
                    if (mesh.userData.trainingDynamics) {
                      const target = new THREE.Vector3(body.position.x, body.position.y, body.position.z);
                      mesh.position.lerp(target, 0.24);

                      const previous = trainingMotionRef.current[id] || {
                        lastTarget: target.clone(),
                        speed: 0,
                        actuatorPhase: 0,
                      };

                      const delta = target.clone().sub(previous.lastTarget);
                      const speed = delta.length();

                      if (speed > 0.0008) {
                        const headingQuat = new THREE.Quaternion();
                        if (is2D) {
                          const angleZ = Math.atan2(delta.y, delta.x);
                          headingQuat.setFromEuler(new THREE.Euler(0, 0, angleZ));
                        } else {
                          const yaw = Math.atan2(delta.x, delta.z);
                          headingQuat.setFromEuler(new THREE.Euler(0, yaw, 0));
                        }
                        mesh.quaternion.slerp(headingQuat, 0.16);
                      }

                      const movementSpeed = speed > 0.0008 ? speed : previous.speed * 0.92;
                      const control = mesh.userData.trainingControl || {};
                      const steering = Number(control.steering || 0);
                      const throttle = Number(control.throttle || 0);
                      const throttleMagnitude = Math.max(0, Math.min(1, Math.abs(throttle) + Math.abs(steering) * 0.4));
                      const actuatorPhase = (previous.actuatorPhase || 0) + (0.08 + throttleMagnitude * 0.32);

                      if (Math.abs(steering) > 0.001 && !is2D) {
                        const steerQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, steering * 0.06, 0));
                        mesh.quaternion.slerp(steerQuat.multiply(mesh.quaternion.clone()), 0.08);
                      }

                      mesh.traverse((child) => {
                        if (!child) return;

                        if (typeof child.name === 'string' && child.name.startsWith('wheel-')) {
                          child.rotation.x -= Math.max(0.01, (movementSpeed * 8) + throttleMagnitude * 0.45);
                        }

                        if (typeof child.name === 'string' && child.name.startsWith('rotor-')) {
                          child.rotation.y += 0.35 + throttleMagnitude * 1.4;
                        }

                        if (typeof child.name === 'string' && (child.name === 'left-leg' || child.name === 'right-leg')) {
                          const dir = child.name === 'left-leg' ? 1 : -1;
                          child.rotation.x = Math.sin(actuatorPhase) * Math.min(0.35, throttleMagnitude * 0.42) * dir;
                        }

                        if (typeof child.name === 'string' && child.name.startsWith('quad-leg-')) {
                          const legIdx = Number(child.name.split('-')[2] || 0);
                          const phase = legIdx % 2 === 0 ? 0 : Math.PI;
                          child.rotation.x = Math.sin(actuatorPhase + phase) * Math.min(0.28, throttleMagnitude * 0.36);
                        }

                        if (child.name === 'arm-seg1') {
                          child.rotation.z = steering * 0.28;
                        }
                        if (child.name === 'arm-seg2') {
                          child.rotation.x = -throttle * 0.22;
                        }
                      });

                      trainingMotionRef.current[id] = {
                        lastTarget: target,
                        speed: movementSpeed,
                        actuatorPhase,
                      };
                    } else {
                      mesh.position.copy(body.position);
                      mesh.quaternion.copy(body.quaternion);
                    }
                }
            });
        }

        if (mainCameraRef.current && !is2D && gridFollowCamera) {
          const snap = 12;
          const snappedX = Math.round(mainCameraRef.current.position.x / snap) * snap;
          const snappedZ = Math.round(mainCameraRef.current.position.z / snap) * snap;
          if (gridHelperRef.current) {
            gridHelperRef.current.position.x = snappedX;
            gridHelperRef.current.position.z = snappedZ;
          }
          if (infiniteGroundRef.current) {
            infiniteGroundRef.current.position.x = mainCameraRef.current.position.x;
            infiniteGroundRef.current.position.z = mainCameraRef.current.position.z;
          }
        }

        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;

        renderer.clear();
        renderer.setViewport(0, 0, w, h);
        renderer.setScissor(0, 0, w, h);
        renderer.setScissorTest(false);
        renderer.render(scene, mainCameraRef.current);

        if (window._activeAgentId && meshesRef.current[window._activeAgentId] && !is2D) {
            const agentMesh = meshesRef.current[window._activeAgentId];
            const camOffset = new THREE.Vector3(0, 1.5, 0.5); 
            const worldQuat = new THREE.Quaternion();
            agentMesh.getWorldQuaternion(worldQuat);
            camOffset.applyQuaternion(worldQuat);
            
            const worldPos = new THREE.Vector3();
            agentMesh.getWorldPosition(worldPos);
            pipCameraRef.current.position.copy(worldPos).add(camOffset);
            
            const lookDir = new THREE.Vector3(0, 0, 1);
            lookDir.applyQuaternion(worldQuat);
            const target = pipCameraRef.current.position.clone().add(lookDir);
            pipCameraRef.current.lookAt(target);

            const pipW = 320; const pipH = 180; const paddingX = 24; const paddingY = 24;
            
            renderer.clearDepth(); 
            renderer.setScissorTest(true);
            renderer.setScissor(w - pipW - paddingX, paddingY, pipW, pipH);
            renderer.setViewport(w - pipW - paddingX, paddingY, pipW, pipH);
            
            renderer.setClearColor('#00ffcc');
            renderer.clearColor();
            
            renderer.setScissor(w - pipW - paddingX + 2, paddingY + 2, pipW - 4, pipH - 4 - 24); 
            renderer.setViewport(w - pipW - paddingX + 2, paddingY + 2, pipW - 4, pipH - 4 - 24);
            renderer.setClearColor(skyboxType === 'unity' ? '#5a6c76' : '#111111'); 
            renderer.clearColor();
            
            renderer.render(scene, pipCameraRef.current);
            renderer.setScissorTest(false);
        }
      };
      animate();

      const handleResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        if (is2D) {
            mainCameraRef.current.left = w / -50;
            mainCameraRef.current.right = w / 50;
            mainCameraRef.current.top = h / 50;
            mainCameraRef.current.bottom = h / -50;
        } else {
            mainCameraRef.current.aspect = w / h;
        }
        mainCameraRef.current.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      
      const resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(mountRef.current);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (mountRef.current) resizeObserver.unobserve(mountRef.current);
        renderer.dispose();
      };
    }
    return () => { isMounted = false; };
  }, [is2D, onTransformChange, showGrid, skyboxType, gridFollowCamera]); 

  // Shortcut logic: "F" to frame object
  useEffect(() => {
     if (focusTrigger && window._selectedMesh && controlsRef.current && mainCameraRef.current && window.THREE) {
         const mesh = window._selectedMesh;
         const box = new window.THREE.Box3().setFromObject(mesh);
         const center = box.getCenter(new window.THREE.Vector3());
         const size = box.getSize(new window.THREE.Vector3());
         const maxDim = Math.max(size.x, size.y, size.z) || 1;

         controlsRef.current.target.copy(center);
         
         const dir = new window.THREE.Vector3();
         mainCameraRef.current.getWorldDirection(dir);
         // Move camera back along the view vector relative to object size
         mainCameraRef.current.position.copy(center).add(dir.multiplyScalar(-maxDim * 3));
         controlsRef.current.update();
     }
  }, [focusTrigger]);

  useEffect(() => {
    if (!sceneRef.current || !window.THREE) return;
    if (gridHelperRef.current) gridHelperRef.current.visible = showGrid;
    const scene = sceneRef.current;
    if (skyboxType === 'unity') {
       if (scene.userData.skyDome) scene.userData.skyDome.visible = true;
       scene.background = null;
       scene.fog = new window.THREE.Fog('#cbd6e0', 500, 12000); 
       scene.environment = scene.userData.unityEnv;
       if (infiniteGroundRef.current?.material) {
        infiniteGroundRef.current.material.color.set('#89a7c2');
       }
    } else {
       if (scene.userData.skyDome) scene.userData.skyDome.visible = true;
       scene.background = null;
       scene.fog = new window.THREE.Fog('#60748a', 400, 9000); 
       scene.environment = scene.userData.studioEnv;
       if (infiniteGroundRef.current?.material) {
        infiniteGroundRef.current.material.color.set('#6d7f94');
       }
    }
    const humidity = Math.max(0, Math.min(100, environmentProfile?.humidityPct ?? 45));
    const attenuation = 1 - (humidity / 100) * 0.35;
    if (scene.userData.dirLight) {
      scene.userData.dirLight.intensity = (skyboxType === 'unity' ? 2.3 : 2.1) * attenuation;
    }
  }, [showGrid, skyboxType, environmentProfile]);

  useEffect(() => {
    if (!sceneVersion || !window.THREE || !sceneRef.current) return;
    const THREE = window.THREE;
    const CANNON = window.CANNON;
    const scene = sceneRef.current;
    
    const selectedAgentId = (objects.find((item) => item.id === selectedId)?.agent) ? selectedId : null;
    const fallbackAgentId = isTraining ? (objects.find((item) => item?.agent)?.id || null) : null;
    window._activeAgentId = selectedAgentId || fallbackAgentId;
    window._selectedMesh = meshesRef.current[selectedId];

    if (isPlaying && !worldRef.current && CANNON) {
        worldRef.current = new CANNON.World();
      const gravityScale = Math.max(0.55, Math.min(1.35, (environmentProfile?.pressureKPa ?? 101.3) / 101.3));
      worldRef.current.gravity.set(0, -9.81 * gravityScale, 0); 
        worldRef.current.broadphase = new CANNON.NaiveBroadphase();
        worldRef.current.solver.iterations = 20; 
    } else if (!isPlaying && worldRef.current) {
        worldRef.current = null;
        bodiesRef.current = {};
    }

    objects.forEach(obj => {
      if (!meshesRef.current[obj.id]) {
          if (obj.type === 'light') {
             const lightMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 8), new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: true}));
             scene.add(lightMesh);
             meshesRef.current[obj.id] = lightMesh;
          } else {
             let mesh, geometry, material;
             material = new THREE.MeshStandardMaterial({ 
               color: obj.color || (obj.agent ? '#333333' : '#8899a6'),
               roughness: obj.roughness !== undefined ? obj.roughness : 0.85,
               metalness: obj.metalness !== undefined ? obj.metalness : 0.1
             });

             if (obj.type === 'empty') mesh = new THREE.Group();
             else if (obj.type === 'plane') geometry = new THREE.BoxGeometry(1, 1, 1); 
             else if (obj.type === 'cube') geometry = new THREE.BoxGeometry(1, 1, 1);
             else if (obj.type === 'sphere') geometry = new THREE.SphereGeometry(0.5, 32, 32);
             else if (obj.type === 'sensor') geometry = new THREE.SphereGeometry(0.35, 24, 24);
             else if (obj.type === 'torus') geometry = new THREE.TorusGeometry(1, 0.2, 16, 50);
             else if (obj.type === 'gltf' && obj.url) {
                 mesh = new THREE.Group();
                 new THREE.GLTFLoader().load(obj.url, (gltf) => mesh.add(gltf.scene));
                 geometry = null; 
             }
             else if (obj.agent) {
               mesh = new THREE.Group();
               if (obj.type === 'robotic_arm') {
                 const baseMat = new THREE.MeshStandardMaterial({ color: '#222', metalness: 0.8, roughness: 0.2 });
                 const armMat = new THREE.MeshStandardMaterial({ color: '#f39c12', metalness: 0.5, roughness: 0.5 });
                 const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 32), baseMat);
                 const joint1 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), baseMat); joint1.position.y = 0.4;
                 const segment1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 16), armMat); segment1.position.y = 1.15;
                 const joint2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), baseMat); joint2.position.y = 1.9;
                 const segment2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 16), armMat); segment2.position.set(0, 2.5, 0.3); segment2.rotation.x = Math.PI / 6;
                 segment1.name = 'arm-seg1';
                 segment2.name = 'arm-seg2';
                 mesh.add(base, joint1, segment1, joint2, segment2);
               } else if (obj.type === 'drone') {
                 const armMat = new THREE.MeshStandardMaterial({ color: '#555' });
                 mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), material));
                 mesh.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.05), armMat));
                 mesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.2), armMat));
                 [[0.55, 0.14, 0.55], [-0.55, 0.14, 0.55], [0.55, 0.14, -0.55], [-0.55, 0.14, -0.55]].forEach((pos, idx) => {
                   const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 18), new THREE.MeshStandardMaterial({ color: '#a7b7c8', metalness: 0.72, roughness: 0.22 }));
                   rotor.position.set(pos[0], pos[1], pos[2]);
                   rotor.name = `rotor-${idx}`;
                   mesh.add(rotor);
                 });
               } else if (obj.type === 'rover') {
                 const bodyMat = new THREE.MeshStandardMaterial({ color: obj.color || '#8899a6', metalness: 0.24, roughness: 0.58 });
                 const wheelMat = new THREE.MeshStandardMaterial({ color: '#1f2933', metalness: 0.15, roughness: 0.72 });
                 const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 2.5), bodyMat);
                 chassis.position.y = 0.45;
                 mesh.add(chassis);
                 [[-0.92, 0.22, 0.95], [0.92, 0.22, 0.95], [-0.92, 0.22, -0.95], [0.92, 0.22, -0.95]].forEach((position, idx) => {
                   const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 20), wheelMat);
                   wheel.rotation.z = Math.PI / 2;
                   wheel.position.set(position[0], position[1], position[2]);
                   wheel.name = `wheel-${idx}`;
                   mesh.add(wheel);
                 });
               } else if (obj.type === 'humanoid') {
                 const suitMat = new THREE.MeshStandardMaterial({ color: obj.color || '#c084fc', metalness: 0.14, roughness: 0.5 });
                 const visorMat = new THREE.MeshStandardMaterial({ color: '#9fc3f0', metalness: 0.68, roughness: 0.2 });
                 const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.4), suitMat);
                 torso.position.y = 1.08;
                 const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), visorMat);
                 head.position.y = 1.82;
                 const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.22), suitMat);
                 leftLeg.position.set(-0.18, 0.42, 0);
                 leftLeg.name = 'left-leg';
                 const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.85, 0.22), suitMat);
                 rightLeg.position.set(0.18, 0.42, 0);
                 rightLeg.name = 'right-leg';
                 mesh.add(torso, head, leftLeg, rightLeg);
               } else if (obj.type === 'quadruped') {
                 const bodyMat = new THREE.MeshStandardMaterial({ color: obj.color || '#f39c12', metalness: 0.18, roughness: 0.56 });
                 const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.5, 2.35), bodyMat);
                 body.position.y = 0.9;
                 mesh.add(body);
                 [[-0.5, 0.3, 0.88], [0.5, 0.3, 0.88], [-0.5, 0.3, -0.88], [0.5, 0.3, -0.88]].forEach((position, idx) => {
                   const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 16), bodyMat);
                   leg.position.set(position[0], position[1], position[2]);
                   leg.name = `quad-leg-${idx}`;
                   mesh.add(leg);
                 });
               } else {
                 const fallbackMat = new THREE.MeshStandardMaterial({ color: obj.color || '#00ffcc', metalness: 0.22, roughness: 0.6 });
                 const core = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1.35), fallbackMat);
                 core.position.y = 0.72;
                 mesh.add(core);
               }
             }

             if (geometry && !mesh) mesh = new THREE.Mesh(geometry, material);
             mesh.traverse((child) => { if (child.isMesh) { child.castShadow = !is2D; child.receiveShadow = !is2D; } });
             
             if (obj.sensors) {
                 const sensorGroup = new THREE.Group();
                 const mat = new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.3 });
                 const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,10)]);
                 [-45, -25, 0, 25, 45].forEach(angle => { const line = new THREE.Line(geo, mat); line.rotation.y = angle * Math.PI / 180; sensorGroup.add(line); });
                 mesh.add(sensorGroup);
             }

             scene.add(mesh); 
             meshesRef.current[obj.id] = mesh;
          }
      }
    });

    objects.forEach(obj => {
      const mesh = meshesRef.current[obj.id];
      if (!mesh) return;
      mesh.userData.trainingPulse = Boolean(isTraining && obj.agent);
      mesh.userData.trainingDynamics = Boolean(isTraining && obj.agent);
      mesh.userData.trainingControl = obj.trainingControl || null;

      if (obj.type === 'light') {
         mesh.position.set(obj.pos[0], obj.pos[1], obj.pos[2]);
         mesh.material.color.setHex(selectedId === obj.id ? 0x00ffcc : 0xffff00);
         if (scene.userData.dirLight) scene.userData.dirLight.position.set(obj.pos[0], obj.pos[1], obj.pos[2]);
      } else {
          if (mesh.material && obj.type !== 'empty') {
              mesh.material.color.set(obj.color || '#ffffff');
              mesh.material.roughness = obj.roughness ?? 0.8;
              mesh.material.metalness = obj.metalness ?? 0.1;
              mesh.material.emissive.setHex(selectedId === obj.id ? 0x003333 : 0x000000); 
              mesh.material.needsUpdate = true;
          }

          const targetParent = obj.parentId && meshesRef.current[obj.parentId] ? meshesRef.current[obj.parentId] : scene;
          if (mesh.parent !== targetParent) {
              targetParent.add(mesh);
          }

            if (!isPlaying || obj.type === 'empty' || !bodiesRef.current[obj.id]) {
              mesh.position.set(obj.pos[0], obj.pos[1], obj.pos[2]);
              mesh.scale.set(obj.scale[0], obj.scale[1], obj.scale[2]);
              mesh.rotation.set(obj.rot[0] * Math.PI / 180, obj.rot[1] * Math.PI / 180, obj.rot[2] * Math.PI / 180);
          }

          if (isPlaying && CANNON && worldRef.current && !obj.parentId && obj.type !== 'empty') {
              if (!bodiesRef.current[obj.id]) {
                  let shape;
                  if (obj.type === 'plane') shape = new CANNON.Box(new CANNON.Vec3(obj.scale[0]/2, obj.scale[1]/2, obj.scale[2]/2));
                  else if (obj.type === 'sphere') shape = new CANNON.Sphere(obj.scale[0]/2);
                  else shape = new CANNON.Box(new CANNON.Vec3(obj.scale[0]/2, obj.scale[1]/2, obj.scale[2]/2)); 

                  const physicsMat = new CANNON.Material();
                  physicsMat.friction = obj.friction ?? 0.3;
                  physicsMat.restitution = obj.restitution ?? 0.1; 

                  const body = new CANNON.Body({ mass: obj.mass || 0, position: new CANNON.Vec3(obj.pos[0], obj.pos[1], obj.pos[2]), shape: shape, material: physicsMat });
                  if (typeof obj.linearDamping === 'number') {
                    body.linearDamping = obj.linearDamping;
                  }
                  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(obj.rot[0] * Math.PI / 180, obj.rot[1] * Math.PI / 180, obj.rot[2] * Math.PI / 180));
                  body.quaternion.set(q.x, q.y, q.z, q.w);
                  worldRef.current.addBody(body);
                  bodiesRef.current[obj.id] = body;
                  } else {
                    const body = bodiesRef.current[obj.id];
                    if (isPlaying && body.mass > 0) {
                      const windMps = Math.max(0, environmentProfile?.windMps ?? 0);
                      const windPush = (windMps * 0.012) / 60;
                      body.velocity.x += windPush;
                    }
                    if (obj.agent || (typeof obj.name === 'string' && obj.name.toLowerCase().includes('goal'))) {
                      body.position.set(obj.pos[0], obj.pos[1], obj.pos[2]);
                      body.velocity.set(0, 0, 0);
                      body.angularVelocity.set(0, 0, 0);
                    }
              }
          }
      }
    });

    Object.keys(meshesRef.current).forEach(id => {
      if (!objects.find(o => o.id === id)) {
        const mesh = meshesRef.current[id];
        if (mesh.parent) mesh.parent.remove(mesh);
        delete meshesRef.current[id];
        delete trainingMotionRef.current[id];
        if (bodiesRef.current[id] && worldRef.current) {
            worldRef.current.removeBody(bodiesRef.current[id]);
            delete bodiesRef.current[id];
        }
      }
    });

    if (transformRef.current) {
        if (selectedId && meshesRef.current[selectedId] && !isPlaying) {
            transformRef.current.attach(meshesRef.current[selectedId]);
            transformRef.current.setMode(transformMode);
        } else {
            transformRef.current.detach();
        }
    }
  }, [objects, selectedId, isPlaying, isTraining, transformMode, is2D, environmentProfile, sceneVersion]);

  return <div ref={mountRef} className={`w-full h-full outline-none ${isPlaying ? 'cursor-default' : 'cursor-crosshair'}`}></div>;
}