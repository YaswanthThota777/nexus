export const TEMPLATE_FIELD_DEFS = [
  {
    key: 'environment',
    label: 'Environment',
    type: 'select',
    options: [
      { id: 'warehouse', name: 'Warehouse Logistics', is2D: false, floorColor: '#3a3a3a' },
      { id: 'city', name: 'Urban Smart City', is2D: false, floorColor: '#2a2a2a' },
      { id: 'terrain', name: 'Rough Terrain', is2D: false, floorColor: '#5c544d' },
      { id: 'underwater', name: 'Underwater Lab', is2D: false, floorColor: '#16324f' },
      { id: 'space', name: 'Low-Gravity Zone', is2D: false, floorColor: '#1d1f3a' },
      { id: 'grid2d', name: '2D Grid Arena', is2D: true, floorColor: '#222222' },
    ],
  },
  {
    key: 'robot',
    label: 'Robot Type',
    type: 'select',
    options: [
      { id: 'quadruped', name: 'Quadruped Robot', mass: 15, color: '#f39c12', actionSpace: 'continuous' },
      { id: 'arm6dof', name: '6-DOF Robotic Arm', mass: 35, color: '#00a8ff', actionSpace: 'continuous' },
      { id: 'rover', name: 'Autonomous Rover', mass: 120, color: '#8899a6', actionSpace: 'continuous' },
      { id: 'drone', name: 'Aerial Drone', mass: 8, color: '#66ffcc', actionSpace: 'continuous' },
      { id: 'humanoid', name: 'Humanoid Bot', mass: 55, color: '#c084fc', actionSpace: 'continuous' },
      { id: 'amr', name: 'AMR Mobile Base', mass: 75, color: '#22c55e', actionSpace: 'discrete' },
    ],
  },
  {
    key: 'robotProfile',
    label: 'Robot Design Profile',
    type: 'select',
    options: [
      { id: 'standard', name: 'Standard' },
      { id: 'spot-x', name: 'Spot-X Quadruped (Hero)' },
      { id: 'ur10-pro', name: 'UR10-Pro Arm (Hero)' },
      { id: 'perseus-rover', name: 'Perseus Rover (Hero)' },
      { id: 'aerial-ranger', name: 'Aerial Ranger Drone (Hero)' },
      { id: 'atlas-nx', name: 'Atlas-NX Humanoid (Hero)' },
    ],
  },
  {
    key: 'model',
    label: 'Training Model',
    type: 'select',
    options: [
      {
        id: 'ppo',
        name: 'PPO (Stable RL)',
        supports: ['continuous', 'discrete'],
        profile: {
          strategy: 'On-policy clipped objective',
          strength: 'Reliable convergence across mixed tasks',
          bestFor: ['navigation', 'inspection', 'balance'],
        },
      },
      {
        id: 'sac',
        name: 'SAC (Continuous Control)',
        supports: ['continuous'],
        profile: {
          strategy: 'Entropy-regularized actor-critic',
          strength: 'Strong exploration and smooth control',
          bestFor: ['navigation', 'balance'],
        },
      },
      {
        id: 'ddpg',
        name: 'DDPG (Actor-Critic)',
        supports: ['continuous'],
        profile: {
          strategy: 'Deterministic policy gradients',
          strength: 'Precise low-noise control loops',
          bestFor: ['pick_place', 'balance'],
        },
      },
      {
        id: 'bc',
        name: 'Behavior Cloning',
        supports: ['continuous', 'discrete'],
        profile: {
          strategy: 'Supervised imitation warm-start',
          strength: 'Fast bootstrapping from demonstrations',
          bestFor: ['pick_place', 'inspection'],
        },
      },
      {
        id: 'hybrid',
        name: 'Hybrid Planner + RL',
        supports: ['continuous', 'discrete'],
        profile: {
          strategy: 'Rule-guided policy refinement',
          strength: 'Safer behavior in cluttered scenes',
          bestFor: ['navigation', 'inspection', 'pick_place'],
        },
      },
    ],
  },
  {
    key: 'task',
    label: 'Task Objective',
    type: 'select',
    options: [
      { id: 'navigation', name: 'Navigation' },
      { id: 'pick_place', name: 'Pick & Place' },
      { id: 'balance', name: 'Balance & Stability' },
      { id: 'inspection', name: 'Inspection Patrol' },
    ],
  },
  {
    key: 'sensorProfile',
    label: 'Sensor Profile',
    type: 'select',
    options: [
      { id: 'basic', name: 'Basic (pose + ray)' },
      { id: 'vision', name: 'Vision (RGB + depth)' },
      { id: 'fusion', name: 'Fusion (RGB + LiDAR + IMU)' },
    ],
  },
  {
    key: 'obstacleDensity',
    label: 'Obstacle Density',
    type: 'number',
    min: 0,
    max: 100,
    step: 5,
  },
  {
    key: 'domainRandomization',
    label: 'Domain Randomization',
    type: 'boolean',
  },
  {
    key: 'arenaScale',
    label: 'Arena Scale',
    type: 'number',
    min: 40,
    max: 400,
    step: 10,
  },
  {
    key: 'elevationVariance',
    label: 'Elevation Variance',
    type: 'number',
    min: 0,
    max: 3,
    step: 0.2,
  },
  {
    key: 'lightIntensity',
    label: 'Light Intensity',
    type: 'number',
    min: 0.3,
    max: 3,
    step: 0.1,
  },
  {
    key: 'temperatureC',
    label: 'Temperature (°C)',
    type: 'number',
    min: -40,
    max: 80,
    step: 0.5,
  },
  {
    key: 'pressureKPa',
    label: 'Pressure (kPa)',
    type: 'number',
    min: 20,
    max: 130,
    step: 0.5,
  },
  {
    key: 'humidityPct',
    label: 'Humidity (%)',
    type: 'number',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: 'windMps',
    label: 'Wind Speed (m/s)',
    type: 'number',
    min: 0,
    max: 40,
    step: 0.1,
  },
];

function getField(key) {
  return TEMPLATE_FIELD_DEFS.find((item) => item.key === key);
}

function createSpecRandom(spec) {
  const seedSource = `${spec.environment}|${spec.robot}|${spec.robotProfile}|${spec.model}|${spec.task}|${spec.sensorProfile}|${spec.obstacleDensity}|${spec.arenaScale}|${spec.elevationVariance}|${spec.temperatureC}|${spec.pressureKPa}|${spec.humidityPct}|${spec.windMps}`;
  let hash = 2166136261;
  for (let index = 0; index < seedSource.length; index += 1) {
    hash ^= seedSource.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let state = Math.abs(hash) % 2147483647;
  if (state <= 0) state += 2147483646;

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function randomInRange(random, min, max) {
  return min + (max - min) * random();
}

function round(value, decimals = 2) {
  return Number(value.toFixed(decimals));
}

function buildBounds(arenaScale, is2D) {
  const half = arenaScale * 0.5;
  const wallHeight = is2D ? 1.2 : 3.2;
  const thickness = Math.max(1, arenaScale * 0.02);
  return [
    { name: 'Boundary North', pos: [0, wallHeight * 0.5, half], scale: [arenaScale, wallHeight, thickness] },
    { name: 'Boundary South', pos: [0, wallHeight * 0.5, -half], scale: [arenaScale, wallHeight, thickness] },
    { name: 'Boundary East', pos: [half, wallHeight * 0.5, 0], scale: [thickness, wallHeight, arenaScale] },
    { name: 'Boundary West', pos: [-half, wallHeight * 0.5, 0], scale: [thickness, wallHeight, arenaScale] },
  ];
}

export function createDefaultTemplateSpec() {
  return {
    environment: getField('environment').options[0].id,
    robot: getField('robot').options[0].id,
    robotProfile: 'standard',
    model: getField('model').options[0].id,
    task: getField('task').options[0].id,
    sensorProfile: getField('sensorProfile').options[0].id,
    obstacleDensity: 30,
    domainRandomization: true,
    arenaScale: 140,
    elevationVariance: 0.4,
    lightIntensity: 1.1,
    temperatureC: 22,
    pressureKPa: 101.3,
    humidityPct: 45,
    windMps: 1.2,
  };
}

export function validateTemplateSpec(spec) {
  const errors = [];
  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['Template spec must be an object.'] };
  }

  TEMPLATE_FIELD_DEFS.forEach((field) => {
    const value = spec[field.key];
    if (field.type === 'select') {
      const found = field.options.some((option) => option.id === value);
      if (!found) errors.push(`${field.label} has invalid value.`);
    }

    if (field.type === 'number') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push(`${field.label} must be a number.`);
      } else {
        if (field.min !== undefined && value < field.min) errors.push(`${field.label} must be >= ${field.min}.`);
        if (field.max !== undefined && value > field.max) errors.push(`${field.label} must be <= ${field.max}.`);
      }
    }

    if (field.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${field.label} must be true/false.`);
    }
  });

  const compatibility = getModelCompatibility(spec);
  if (!compatibility.compatible) {
    errors.push(compatibility.reason);
  }

  const profileCompatibility = getRobotProfileCompatibility(spec);
  if (!profileCompatibility.compatible) {
    errors.push(profileCompatibility.reason);
  }

  return { valid: errors.length === 0, errors };
}

export function getRobotProfileCompatibility(spec) {
  const profileId = spec?.robotProfile || 'standard';
  if (profileId === 'standard') {
    return { compatible: true, reason: 'Compatible' };
  }

  const profileToRobot = {
    'spot-x': 'quadruped',
    'ur10-pro': 'arm6dof',
    'perseus-rover': 'rover',
    'aerial-ranger': 'drone',
    'atlas-nx': 'humanoid',
  };

  const requiredRobot = profileToRobot[profileId];
  if (!requiredRobot) {
    return { compatible: false, reason: 'Unknown robot design profile.' };
  }

  if (spec?.robot !== requiredRobot) {
    return {
      compatible: false,
      reason: `Robot design profile '${profileId}' requires robot type '${requiredRobot}'.`,
    };
  }

  return { compatible: true, reason: 'Compatible' };
}

export const HERO_TEMPLATE_PRESETS = [
  {
    id: 'hero-spot-x',
    name: 'Spot-X Field Runner',
    description: 'High-detail quadruped with rugged field kit and rich perception stack.',
    difficulty: 'intermediate',
    featured: true,
    spec: {
      environment: 'terrain',
      robot: 'quadruped',
      robotProfile: 'spot-x',
      model: 'ppo',
      task: 'navigation',
      sensorProfile: 'fusion',
      obstacleDensity: 50,
      domainRandomization: true,
      arenaScale: 190,
      elevationVariance: 1.1,
      lightIntensity: 1.2,
    },
  },
  {
    id: 'hero-ur10-pro',
    name: 'UR10-Pro Cell',
    description: 'Industrial 6-DOF arm with precision pick/place cell scene.',
    difficulty: 'easy',
    featured: false,
    spec: {
      environment: 'warehouse',
      robot: 'arm6dof',
      robotProfile: 'ur10-pro',
      model: 'ddpg',
      task: 'pick_place',
      sensorProfile: 'vision',
      obstacleDensity: 35,
      domainRandomization: true,
      arenaScale: 150,
      elevationVariance: 0.3,
      lightIntensity: 1.3,
    },
  },
  {
    id: 'hero-perseus-rover',
    name: 'Perseus Recon Rover',
    description: 'Exploration rover tuned for long-range autonomous inspection.',
    difficulty: 'expert',
    featured: false,
    spec: {
      environment: 'space',
      robot: 'rover',
      robotProfile: 'perseus-rover',
      model: 'hybrid',
      task: 'inspection',
      sensorProfile: 'fusion',
      obstacleDensity: 45,
      domainRandomization: true,
      arenaScale: 210,
      elevationVariance: 0.8,
      lightIntensity: 1.4,
    },
  },
  {
    id: 'hero-aerial-ranger',
    name: 'Aerial Ranger X4',
    description: 'Advanced drone profile with strong obstacle-dense flight navigation.',
    difficulty: 'expert',
    featured: false,
    spec: {
      environment: 'city',
      robot: 'drone',
      robotProfile: 'aerial-ranger',
      model: 'sac',
      task: 'navigation',
      sensorProfile: 'fusion',
      obstacleDensity: 55,
      domainRandomization: true,
      arenaScale: 220,
      elevationVariance: 0.5,
      lightIntensity: 1.3,
    },
  },
  {
    id: 'hero-atlas-nx',
    name: 'Atlas-NX Balancer',
    description: 'Humanoid morphology tuned for balance and mobility studies.',
    difficulty: 'intermediate',
    featured: false,
    spec: {
      environment: 'terrain',
      robot: 'humanoid',
      robotProfile: 'atlas-nx',
      model: 'ppo',
      task: 'balance',
      sensorProfile: 'vision',
      obstacleDensity: 30,
      domainRandomization: true,
      arenaScale: 170,
      elevationVariance: 0.9,
      lightIntensity: 1.25,
    },
  },
];

export function applyHeroTemplatePreset(baseSpec, presetId) {
  const preset = HERO_TEMPLATE_PRESETS.find((item) => item.id === presetId);
  if (!preset) return baseSpec;
  return {
    ...baseSpec,
    ...preset.spec,
  };
}

export function getModelCompatibility(spec) {
  const robot = getField('robot').options.find((item) => item.id === spec.robot);
  const model = getField('model').options.find((item) => item.id === spec.model);
  if (!robot || !model) {
    return { compatible: false, reason: 'Unknown robot/model combination.' };
  }

  if (!model.supports.includes(robot.actionSpace)) {
    return {
      compatible: false,
      reason: `${model.name} does not support ${robot.actionSpace} action space required by ${robot.name}.`,
    };
  }

  return { compatible: true, reason: 'Compatible' };
}

export function getModelProfile(modelId) {
  const model = getField('model').options.find((item) => item.id === modelId);
  if (!model) {
    return {
      id: 'ppo',
      name: 'PPO (Stable RL)',
      strategy: 'On-policy clipped objective',
      strength: 'Reliable convergence across mixed tasks',
      bestFor: ['navigation'],
    };
  }

  return {
    id: model.id,
    name: model.name,
    strategy: model.profile?.strategy || 'Policy optimization',
    strength: model.profile?.strength || 'General purpose control',
    bestFor: Array.isArray(model.profile?.bestFor) ? model.profile.bestFor : ['navigation'],
  };
}

export function isTemplate2D(spec) {
  const environment = getField('environment').options.find((item) => item.id === spec.environment);
  return Boolean(environment?.is2D);
}

export function exportTemplatePack(spec) {
  return {
    schema: 'nexus-template-pack',
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    template: spec,
  };
}

export function importTemplatePack(raw) {
  try {
    const payload = JSON.parse(raw);
    if (payload?.schema !== 'nexus-template-pack' || !payload?.template) {
      return { valid: false, error: 'Invalid template pack schema.' };
    }
    const validation = validateTemplateSpec(payload.template);
    if (!validation.valid) {
      return { valid: false, error: validation.errors.join(' ') };
    }
    return { valid: true, template: payload.template };
  } catch {
    return { valid: false, error: 'Template pack is not valid JSON.' };
  }
}

export function compileTemplateToScene(spec, genId) {
  const environment = getField('environment').options.find((item) => item.id === spec.environment) || getField('environment').options[0];
  const robot = getField('robot').options.find((item) => item.id === spec.robot) || getField('robot').options[0];
  const modelProfile = getModelProfile(spec.model);
  const robotProfileId = spec.robotProfile || 'standard';
  const is2D = Boolean(environment.is2D);
  const arenaScale = Number(spec.arenaScale || 140);
  const elevationVariance = Number(spec.elevationVariance || 0);
  const lightIntensity = Number(spec.lightIntensity || 1);
  const spawnRange = Math.max(8, Math.round(arenaScale / 5));
  const random = createSpecRandom(spec);
  const obstacleDensity = Number(spec.obstacleDensity || 0);

  const objects = [
    { id: genId(), parentId: null, name: 'Main Sun', type: 'light', pos: [20, 40, 20], rot: [-45, 30, 0], scale: [1, 1, 1], intensity: lightIntensity },
    {
      id: genId(),
      parentId: null,
      name: is2D ? '2D Arena Floor' : 'Simulation Floor',
      type: 'plane',
      pos: [0, -0.05, 0],
      rot: [0, 0, 0],
      scale: [arenaScale, 0.1, arenaScale],
      color: environment.floorColor,
      mass: 0,
      roughness: 1.0,
    },
  ];

  buildBounds(arenaScale, is2D).forEach((wall) => {
    objects.push({
      id: genId(),
      parentId: null,
      name: wall.name,
      type: 'cube',
      pos: wall.pos,
      rot: [0, 0, 0],
      scale: wall.scale,
      color: '#3f3f46',
      mass: 0,
      roughness: 0.95,
    });
  });

  const environmentDecorators = {
    warehouse: () => {
      for (let lane = -2; lane <= 2; lane += 1) {
        const x = lane * Math.max(6, arenaScale * 0.06);
        for (let shelf = 0; shelf < 4; shelf += 1) {
          const z = -spawnRange + shelf * (spawnRange * 0.6);
          objects.push({
            id: genId(),
            parentId: null,
            name: `Rack ${lane + 3}-${shelf + 1}`,
            type: 'cube',
            pos: [round(x), 2.2, round(z)],
            rot: [0, 0, 0],
            scale: [2.5, 4.4, 1.2],
            color: '#475569',
            mass: 0,
          });
        }
      }
    },
    city: () => {
      for (let block = 0; block < 8; block += 1) {
        const x = round(randomInRange(random, -spawnRange, spawnRange));
        const z = round(randomInRange(random, -spawnRange, spawnRange));
        const height = round(randomInRange(random, 8, 26));
        objects.push({
          id: genId(),
          parentId: null,
          name: `Building ${block + 1}`,
          type: 'cube',
          pos: [x, height * 0.5, z],
          rot: [0, 0, 0],
          scale: [6, height, 6],
          color: '#334155',
          mass: 0,
        });
      }
    },
    terrain: () => {
      for (let rock = 0; rock < 10; rock += 1) {
        const radius = round(randomInRange(random, 1.2, 3.8));
        const x = round(randomInRange(random, -spawnRange, spawnRange));
        const z = round(randomInRange(random, -spawnRange, spawnRange));
        objects.push({
          id: genId(),
          parentId: null,
          name: `Boulder ${rock + 1}`,
          type: 'sphere',
          pos: [x, Math.max(0.6, radius * 0.45), z],
          rot: [0, 0, 0],
          scale: [radius, radius * randomInRange(random, 0.8, 1.4), radius],
          color: '#57534e',
          mass: 0,
        });
      }
    },
    underwater: () => {
      for (let ring = 0; ring < 5; ring += 1) {
        objects.push({
          id: genId(),
          parentId: null,
          name: `Gate Ring ${ring + 1}`,
          type: 'torus',
          pos: [round(randomInRange(random, -spawnRange, spawnRange)), round(randomInRange(random, 1, 4)), round(randomInRange(random, -spawnRange, spawnRange))],
          rot: [90, 0, 0],
          scale: [2.3, 2.3, 2.3],
          color: '#38bdf8',
          mass: 0,
        });
      }
    },
    space: () => {
      for (let crater = 0; crater < 8; crater += 1) {
        const radius = round(randomInRange(random, 1.5, 4.8));
        objects.push({
          id: genId(),
          parentId: null,
          name: `Crater ${crater + 1}`,
          type: 'sphere',
          pos: [round(randomInRange(random, -spawnRange, spawnRange)), Math.max(0.35, radius * 0.22), round(randomInRange(random, -spawnRange, spawnRange))],
          rot: [0, 0, 0],
          scale: [radius * 1.4, Math.max(0.4, radius * 0.35), radius * 1.4],
          color: '#4c1d95',
          mass: 0,
        });
      }
    },
    grid2d: () => {
      const laneSize = Math.max(4, Math.round(spawnRange * 0.5));
      for (let index = -2; index <= 2; index += 1) {
        objects.push({
          id: genId(),
          parentId: null,
          name: `Grid Wall ${index + 3}`,
          type: 'cube',
          pos: [index * laneSize, 0.6, 0],
          rot: [0, 0, 0],
          scale: [1.2, 1.2, laneSize * 1.1],
          color: '#374151',
          mass: 0,
          is2D: true,
        });
      }
    },
  };

  const decorateEnvironment = environmentDecorators[environment.id];
  if (decorateEnvironment) decorateEnvironment();

  const obstacleCount = Math.max(3, Math.round(obstacleDensity / 4));
  for (let index = 0; index < obstacleCount; index += 1) {
    const isSphere = index % 3 === 0;
    const size = round(randomInRange(random, 1.1, 3.1));
    objects.push({
      id: genId(),
      parentId: null,
      name: `Dynamic Obstacle ${index + 1}`,
      type: isSphere ? 'sphere' : 'cube',
      pos: [
        round(randomInRange(random, -spawnRange, spawnRange)),
        round(Math.max(0.55, randomInRange(random, 0.8, 2.2 + elevationVariance))),
        round(randomInRange(random, -spawnRange, spawnRange)),
      ],
      rot: [0, round(randomInRange(random, 0, 45)), 0],
      scale: [size, isSphere ? size : round(randomInRange(random, 1, 2.8)), size],
      color: isSphere ? '#64748b' : '#52525b',
      mass: 0,
    });
  }

  const agentRoot = genId();
  objects.push({
    id: agentRoot,
    parentId: null,
    name: robot.name,
    type: 'empty',
    pos: [0, is2D ? 0.5 : 1.2, 0],
    rot: [0, 0, 0],
    scale: [1, 1, 1],
    agent: true,
    sensors: spec.sensorProfile !== 'basic',
    mass: robot.mass,
    modelType: spec.model,
    modelProfile,
    robotProfile: robotProfileId,
    taskType: spec.task,
    domainRandomization: spec.domainRandomization,
  });

  if (spec.robot === 'quadruped') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Torso', type: 'cube', pos: [0, 0, 0], rot: [0, 0, 0], scale: [1.2, 0.4, 2.6], color: robot.color, mass: 10 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Battery Pack', type: 'cube', pos: [0, 0.32, -0.2], rot: [0, 0, 0], scale: [0.85, 0.2, 0.75], color: '#f59e0b', mass: 2.2 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Head Sensor Pod', type: 'cube', pos: [0, 0.25, 1.15], rot: [0, 0, 0], scale: [0.55, 0.25, 0.35], color: '#1f2937', mass: 1.1 });
    [[0.7, -0.9], [-0.7, -0.9], [0.7, 0.9], [-0.7, 0.9]].forEach((legPos, index) => {
      objects.push({ id: genId(), parentId: agentRoot, name: `Hip ${index + 1}`, type: 'sphere', pos: [legPos[0], -0.15, legPos[1]], rot: [0, 0, 0], scale: [0.22, 0.22, 0.22], color: '#7c2d12', mass: 0.6 });
      objects.push({ id: genId(), parentId: agentRoot, name: `Leg ${index + 1} Upper`, type: 'cube', pos: [legPos[0], -0.45, legPos[1]], rot: [0, 0, 0], scale: [0.22, 0.8, 0.22], color: '#fbbf24', mass: 1 });
      objects.push({ id: genId(), parentId: agentRoot, name: `Leg ${index + 1} Lower`, type: 'cube', pos: [legPos[0], -0.95, legPos[1]], rot: [0, 0, 0], scale: [0.2, 0.6, 0.2], color: '#d97706', mass: 0.8 });
      objects.push({ id: genId(), parentId: agentRoot, name: `Foot ${index + 1}`, type: 'sphere', pos: [legPos[0], -1.32, legPos[1]], rot: [0, 0, 0], scale: [0.18, 0.18, 0.18], color: '#422006', mass: 0.4 });
    });
  } else if (spec.robot === 'arm6dof') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Arm Base', type: 'cube', pos: [0, 0.5, 0], rot: [0, 0, 0], scale: [0.8, 1, 0.8], color: robot.color, mass: 12 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Joint 1', type: 'sphere', pos: [0, 1.0, 0], rot: [0, 0, 0], scale: [0.36, 0.36, 0.36], color: '#1d4ed8', mass: 1.2, joint: 'hinge' });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Arm Link 1', type: 'cube', pos: [0, 1.85, 0], rot: [0, 0, 20], scale: [0.25, 1.7, 0.25], color: '#93c5fd', mass: 6, joint: 'hinge' });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Arm Link 2', type: 'cube', pos: [0.35, 2.8, 0], rot: [0, 0, -25], scale: [0.22, 1.4, 0.22], color: '#60a5fa', mass: 4.8, joint: 'hinge' });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Wrist Joint', type: 'sphere', pos: [0.58, 3.18, 0], rot: [0, 0, 0], scale: [0.24, 0.24, 0.24], color: '#2563eb', mass: 0.8 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Gripper Palm', type: 'cube', pos: [0.78, 3.35, 0], rot: [0, 0, 0], scale: [0.34, 0.16, 0.34], color: '#e2e8f0', mass: 1.5 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Gripper Finger L', type: 'cube', pos: [0.92, 3.27, 0.12], rot: [0, 0, 0], scale: [0.08, 0.26, 0.08], color: '#cbd5e1', mass: 0.3 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Gripper Finger R', type: 'cube', pos: [0.92, 3.27, -0.12], rot: [0, 0, 0], scale: [0.08, 0.26, 0.08], color: '#cbd5e1', mass: 0.3 });
  } else if (spec.robot === 'rover' || spec.robot === 'amr') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Chassis', type: 'cube', pos: [0, 0.4, 0], rot: [0, 0, 0], scale: [2.2, 0.5, 3.2], color: robot.color, mass: 40 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Roll Cage', type: 'cube', pos: [0, 0.95, -0.2], rot: [0, 0, 0], scale: [1.6, 0.55, 2.2], color: '#1f2937', mass: 7 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Front Bumper', type: 'cube', pos: [0, 0.28, 1.78], rot: [0, 0, 0], scale: [2.1, 0.25, 0.2], color: '#111827', mass: 2.5 });
    [[1.0, 1.3], [-1.0, 1.3], [1.0, -1.3], [-1.0, -1.3]].forEach((wheelPos, index) => {
      objects.push({ id: genId(), parentId: agentRoot, name: `Suspension ${index + 1}`, type: 'cube', pos: [wheelPos[0] * 0.92, 0.32, wheelPos[1] * 0.82], rot: [0, 0, wheelPos[0] > 0 ? 8 : -8], scale: [0.14, 0.46, 0.14], color: '#374151', mass: 0.8 });
      objects.push({ id: genId(), parentId: agentRoot, name: `Wheel ${index + 1}`, type: 'sphere', pos: [wheelPos[0], 0.18, wheelPos[1]], rot: [0, 0, 0], scale: [0.45, 0.45, 0.45], color: '#0f172a', mass: 4 });
    });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Mast Pole', type: 'cube', pos: [0, 1.45, 0.35], rot: [0, 0, 0], scale: [0.1, 0.7, 0.1], color: '#475569', mass: 0.5 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Mast Camera', type: 'cube', pos: [0, 1.8, 0.55], rot: [0, 0, 0], scale: [0.34, 0.18, 0.18], color: '#0ea5e9', mass: 0.6 });
    if (spec.robot === 'amr') {
      objects.push({ id: genId(), parentId: agentRoot, name: 'Payload Deck', type: 'cube', pos: [0, 0.95, 0], rot: [0, 0, 0], scale: [1.5, 0.18, 2.2], color: '#22c55e', mass: 8 });
      objects.push({ id: genId(), parentId: agentRoot, name: 'Safety Beacon', type: 'sphere', pos: [0, 1.45, -1.05], rot: [0, 0, 0], scale: [0.14, 0.14, 0.14], color: '#f97316', mass: 0.2 });
    }
  } else if (spec.robot === 'drone') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Drone Body', type: 'cube', pos: [0, 1.2, 0], rot: [0, 0, 0], scale: [1.2, 0.3, 1.2], color: robot.color, mass: 5 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Battery Module', type: 'cube', pos: [0, 1.34, 0], rot: [0, 0, 0], scale: [0.62, 0.16, 0.62], color: '#334155', mass: 0.9 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Front Camera', type: 'sphere', pos: [0, 1.18, 0.58], rot: [0, 0, 0], scale: [0.14, 0.14, 0.14], color: '#7dd3fc', mass: 0.1 });
    [[0.65, 0.65], [-0.65, 0.65], [0.65, -0.65], [-0.65, -0.65]].forEach((armPos, index) => {
      objects.push({ id: genId(), parentId: agentRoot, name: `Rotor Arm ${index + 1}`, type: 'cube', pos: [armPos[0] * 0.5, 1.2, armPos[1] * 0.5], rot: [0, 0, 0], scale: [1.1, 0.07, 0.1], color: '#334155', mass: 0.8 });
      objects.push({ id: genId(), parentId: agentRoot, name: `Rotor ${index + 1}`, type: 'torus', pos: [armPos[0], 1.28, armPos[1]], rot: [90, 0, 0], scale: [0.38, 0.38, 0.08], color: '#93c5fd', mass: 0.3 });
    });
  } else if (spec.robot === 'humanoid') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Core', type: 'cube', pos: [0, 1.2, 0], rot: [0, 0, 0], scale: [0.7, 1.3, 0.4], color: robot.color, mass: 20 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Head', type: 'sphere', pos: [0, 2.2, 0], rot: [0, 0, 0], scale: [0.45, 0.45, 0.45], color: '#a78bfa', mass: 2.2 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Visor', type: 'cube', pos: [0, 2.22, 0.28], rot: [0, 0, 0], scale: [0.34, 0.12, 0.08], color: '#93c5fd', mass: 0.2 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Chest Plate', type: 'cube', pos: [0, 1.42, 0.22], rot: [0, 0, 0], scale: [0.62, 0.5, 0.1], color: '#7c3aed', mass: 2.2 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Arm Left', type: 'cube', pos: [-0.6, 1.35, 0], rot: [0, 0, 18], scale: [0.18, 1.1, 0.18], color: '#8b5cf6', mass: 2.1 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Arm Right', type: 'cube', pos: [0.6, 1.35, 0], rot: [0, 0, -18], scale: [0.18, 1.1, 0.18], color: '#8b5cf6', mass: 2.1 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Leg Left', type: 'cube', pos: [-0.25, 0.2, 0], rot: [0, 0, 0], scale: [0.2, 1.2, 0.2], color: '#6d28d9', mass: 3.2 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Leg Right', type: 'cube', pos: [0.25, 0.2, 0], rot: [0, 0, 0], scale: [0.2, 1.2, 0.2], color: '#6d28d9', mass: 3.2 });
  }

  if (spec.sensorProfile === 'vision' || spec.sensorProfile === 'fusion') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Vision Mast', type: 'cube', pos: [0, 1.8, 0.4], rot: [0, 0, 0], scale: [0.12, 0.5, 0.12], color: '#38bdf8', mass: 0.5 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Depth Camera', type: 'cube', pos: [0, 2.05, 0.62], rot: [0, 0, 0], scale: [0.35, 0.16, 0.18], color: '#0ea5e9', mass: 0.6 });
  }

  if (spec.sensorProfile === 'fusion') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'LiDAR Ring', type: 'torus', pos: [0, 1.55, 0], rot: [90, 0, 0], scale: [0.45, 0.45, 0.1], color: '#14b8a6', mass: 0.7 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'IMU Core', type: 'sphere', pos: [0, 1.1, 0], rot: [0, 0, 0], scale: [0.15, 0.15, 0.15], color: '#22d3ee', mass: 0.2 });
  }

  if (robotProfileId === 'spot-x') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Thermal Camera', type: 'cube', pos: [0, 0.28, 1.38], rot: [0, 0, 0], scale: [0.24, 0.14, 0.12], color: '#ef4444', mass: 0.2 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Top LiDAR Pod', type: 'sphere', pos: [0, 0.55, 0.35], rot: [0, 0, 0], scale: [0.18, 0.18, 0.18], color: '#0ea5e9', mass: 0.3 });
  }

  if (robotProfileId === 'ur10-pro') {
    objects.push({ id: genId(), parentId: null, name: 'Control Cabinet', type: 'cube', pos: [-2.2, 1.1, -1.8], rot: [0, 0, 0], scale: [1.1, 2.2, 0.9], color: '#334155', mass: 0 });
    objects.push({ id: genId(), parentId: null, name: 'Safety Cage Post A', type: 'cube', pos: [1.9, 1.5, 1.9], rot: [0, 0, 0], scale: [0.12, 3, 0.12], color: '#f59e0b', mass: 0 });
    objects.push({ id: genId(), parentId: null, name: 'Safety Cage Post B', type: 'cube', pos: [-1.9, 1.5, 1.9], rot: [0, 0, 0], scale: [0.12, 3, 0.12], color: '#f59e0b', mass: 0 });
  }

  if (robotProfileId === 'perseus-rover') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Solar Panel Left', type: 'cube', pos: [-1.25, 1.05, -0.25], rot: [0, 0, 8], scale: [1.1, 0.07, 1.7], color: '#1e3a8a', mass: 1.2 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Solar Panel Right', type: 'cube', pos: [1.25, 1.05, -0.25], rot: [0, 0, -8], scale: [1.1, 0.07, 1.7], color: '#1e3a8a', mass: 1.2 });
  }

  if (robotProfileId === 'aerial-ranger') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Landing Skid Left', type: 'cube', pos: [-0.38, 0.78, 0], rot: [0, 0, 0], scale: [0.06, 0.26, 1.1], color: '#94a3b8', mass: 0.2 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Landing Skid Right', type: 'cube', pos: [0.38, 0.78, 0], rot: [0, 0, 0], scale: [0.06, 0.26, 1.1], color: '#94a3b8', mass: 0.2 });
  }

  if (robotProfileId === 'atlas-nx') {
    objects.push({ id: genId(), parentId: agentRoot, name: 'Backpack Power Unit', type: 'cube', pos: [0, 1.35, -0.24], rot: [0, 0, 0], scale: [0.38, 0.58, 0.2], color: '#7c3aed', mass: 1.1 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Knee Joint Left', type: 'sphere', pos: [-0.25, -0.24, 0], rot: [0, 0, 0], scale: [0.12, 0.12, 0.12], color: '#8b5cf6', mass: 0.3 });
    objects.push({ id: genId(), parentId: agentRoot, name: 'Knee Joint Right', type: 'sphere', pos: [0.25, -0.24, 0], rot: [0, 0, 0], scale: [0.12, 0.12, 0.12], color: '#8b5cf6', mass: 0.3 });
  }

  const goalNameByTask = {
    navigation: 'Navigation Goal',
    pick_place: 'Pickup Target',
    balance: 'Balance Anchor',
    inspection: 'Inspection Waypoint',
  };

  objects.push({
    id: genId(),
    parentId: null,
    name: goalNameByTask[spec.task] || 'Task Goal',
    type: 'sphere',
    pos: [Math.min(spawnRange * 0.5, 10), is2D ? 0.5 : 1, Math.min(spawnRange * 0.6, 12)],
    rot: [0, 0, 0],
    scale: [1, 1, 1],
    color: '#ff3333',
    mass: 0,
  });

  if (spec.task === 'pick_place') {
    objects.push({
      id: genId(),
      parentId: null,
      name: 'Pickup Crate',
      type: 'cube',
      pos: [Math.min(spawnRange * 0.25, 6), is2D ? 0.5 : 0.8, -Math.min(spawnRange * 0.15, 4)],
      rot: [0, 0, 0],
      scale: [0.9, 0.9, 0.9],
      color: '#f59e0b',
      mass: 2,
    });
    objects.push({
      id: genId(),
      parentId: null,
      name: 'Drop Zone',
      type: 'torus',
      pos: [Math.min(spawnRange * 0.6, 12), is2D ? 0.5 : 0.65, -Math.min(spawnRange * 0.5, 10)],
      rot: [90, 0, 0],
      scale: [1.4, 1.4, 0.16],
      color: '#10b981',
      mass: 0,
    });
  }

  if (spec.task === 'inspection') {
    for (let waypoint = 0; waypoint < 3; waypoint += 1) {
      objects.push({
        id: genId(),
        parentId: null,
        name: `Inspection Marker ${waypoint + 1}`,
        type: 'sphere',
        pos: [
          round(randomInRange(random, -spawnRange * 0.7, spawnRange * 0.7)),
          is2D ? 0.5 : round(randomInRange(random, 0.8, 2.4)),
          round(randomInRange(random, -spawnRange * 0.7, spawnRange * 0.7)),
        ],
        rot: [0, 0, 0],
        scale: [0.65, 0.65, 0.65],
        color: '#22d3ee',
        mass: 0,
      });
    }
  }

  if (spec.task === 'balance') {
    objects.push({
      id: genId(),
      parentId: null,
      name: 'Balance Beam',
      type: 'cube',
      pos: [0, is2D ? 0.5 : 1.2, 0],
      rot: [0, 0, 0],
      scale: [Math.max(8, arenaScale * 0.15), 0.45, 1.2],
      color: '#a78bfa',
      mass: 0,
    });
  }

  return normalizeSceneForEditor(objects);
}

export function normalizeSceneForEditor(objects) {
  if (!Array.isArray(objects) || objects.length === 0) return objects;

  const positioned = objects.filter((item) => Array.isArray(item.pos));
  if (positioned.length === 0) return objects;

  const center = positioned.reduce((acc, item) => {
    acc.x += item.pos[0];
    acc.y += item.pos[1];
    acc.z += item.pos[2];
    return acc;
  }, { x: 0, y: 0, z: 0 });

  center.x /= positioned.length;
  center.y /= positioned.length;
  center.z /= positioned.length;

  return objects.map((item) => {
    if (!Array.isArray(item.pos)) return item;
    return {
      ...item,
      pos: [
        Number((item.pos[0] - center.x).toFixed(2)),
        Number((item.pos[1] - Math.max(0, center.y - 1)).toFixed(2)),
        Number((item.pos[2] - center.z).toFixed(2)),
      ],
    };
  });
}
