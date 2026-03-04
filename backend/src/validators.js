import { z } from 'zod';

export const projectCreateSchema = z.object({
  name: z.string().min(2),
  template: z.string().min(2),
  is2D: z.boolean().default(false),
  config: z
    .object({
      environment: z.string().min(2),
      robot: z.string().min(2),
      model: z.string().min(2),
    })
    .optional(),
});

export const sceneSaveSchema = z.object({
  schemaVersion: z.string().min(1),
  objects: z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      name: z.string().optional(),
      pos: z.array(z.number()).optional(),
    }).passthrough(),
  ),
});

export const runCreateSchema = z.object({
  projectId: z.string().min(3),
  model: z.string().min(2),
  environment: z.string().min(2),
  robot: z.string().min(2),
  maxSteps: z.number().int().positive().optional(),
  seed: z.number().int().optional(),
  provider: z.string().min(3).optional(),
  deterministic: z.boolean().optional(),
});

export const modelCreateSchema = z.object({
  projectId: z.string().min(3),
  runId: z.string().min(3),
  name: z.string().min(2),
  framework: z.string().min(2),
  metrics: z.object({
    meanReward: z.number().optional(),
    successRate: z.number().optional(),
  }).optional(),
});

export const templatePackSchema = z.object({
  name: z.string().min(2),
  tags: z.array(z.string()).max(10).default([]),
  template: z.object({
    environment: z.string().min(2),
    robot: z.string().min(2),
    model: z.string().min(2),
    task: z.string().min(2).optional(),
    sensorProfile: z.string().min(2).optional(),
    obstacleDensity: z.number().min(0).max(100).optional(),
    domainRandomization: z.boolean().optional(),
    arenaScale: z.number().min(10).max(500).optional(),
    elevationVariance: z.number().min(0).max(5).optional(),
    lightIntensity: z.number().min(0.1).max(5).optional(),
  }).passthrough(),
});
