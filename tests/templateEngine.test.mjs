import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultTemplateSpec,
  validateTemplateSpec,
  applyHeroTemplatePreset,
  getRobotProfileCompatibility,
  HERO_TEMPLATE_PRESETS,
  getModelProfile,
  compileTemplateToScene,
} from '../src/lib/templateEngine.js';

test('hero presets generate valid template specs', () => {
  HERO_TEMPLATE_PRESETS.forEach((preset) => {
    const spec = applyHeroTemplatePreset(createDefaultTemplateSpec(), preset.id);
    const validation = validateTemplateSpec(spec);
    assert.equal(validation.valid, true, `Preset ${preset.id} should be valid`);
  });
});

test('robot profile compatibility rejects mismatched robot', () => {
  const spec = {
    ...createDefaultTemplateSpec(),
    robotProfile: 'spot-x',
    robot: 'drone',
  };

  const compatibility = getRobotProfileCompatibility(spec);
  assert.equal(compatibility.compatible, false);
  assert.match(compatibility.reason, /requires robot type 'quadruped'/i);
});

test('hero preset applies exact profile and robot pair', () => {
  const spec = applyHeroTemplatePreset(createDefaultTemplateSpec(), 'hero-atlas-nx');
  assert.equal(spec.robotProfile, 'atlas-nx');
  assert.equal(spec.robot, 'humanoid');
});

test('getModelProfile falls back safely for unknown model', () => {
  const profile = getModelProfile('non-existent-model');
  assert.equal(profile.id, 'ppo');
  assert.equal(profile.name, 'PPO (Stable RL)');
  assert.deepEqual(profile.bestFor, ['navigation']);
});

test('default template includes atmospheric fields', () => {
  const spec = createDefaultTemplateSpec();
  assert.equal(typeof spec.temperatureC, 'number');
  assert.equal(typeof spec.pressureKPa, 'number');
  assert.equal(typeof spec.humidityPct, 'number');
  assert.equal(typeof spec.windMps, 'number');
});

test('validation rejects out-of-range atmospheric settings', () => {
  const spec = {
    ...createDefaultTemplateSpec(),
    pressureKPa: 150,
  };

  const validation = validateTemplateSpec(spec);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(' '), /Pressure \(kPa\) must be <= 130\./);
});

test('compileTemplateToScene produces trainable scenes for major environment presets', () => {
  const genId = (() => {
    let id = 0;
    return () => `id-${id++}`;
  })();

  const presets = [
    { environment: 'warehouse', robot: 'arm6dof', task: 'pick_place', model: 'ddpg' },
    { environment: 'underwater', robot: 'drone', task: 'inspection', model: 'sac' },
    { environment: 'space', robot: 'rover', task: 'navigation', model: 'ppo' },
    { environment: 'terrain', robot: 'quadruped', task: 'balance', model: 'ppo' },
  ];

  presets.forEach((override) => {
    const spec = { ...createDefaultTemplateSpec(), ...override };
    const scene = compileTemplateToScene(spec, genId);

    const hasAgent = scene.some((item) => item?.agent === true);
    const hasGoal = scene.some((item) => {
      if (typeof item?.name === 'string' && item.name.toLowerCase().includes('goal')) return true;
      return item?.type === 'sphere' && typeof item?.color === 'string' && item.color.toLowerCase().includes('ff3333');
    });
    assert.equal(hasAgent, true, `Expected agent for environment ${override.environment}`);
    assert.equal(hasGoal, true, `Expected goal for environment ${override.environment}`);
  });
});
