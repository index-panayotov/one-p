import { z } from 'zod';

// Story status enum
export const StoryStatus = z.enum(['draft', 'ready', 'in-progress', 'done']);
export type StoryStatus = z.infer<typeof StoryStatus>;

// Priority enum
export const Priority = z.enum(['low', 'medium', 'high', 'critical']);
export type Priority = z.infer<typeof Priority>;

// Story type enum
export const StoryType = z.enum(['user-story', 'technical-story', 'bug', 'spike']);
export type StoryType = z.infer<typeof StoryType>;

// Acceptance Criterion schema
export const AcceptanceCriterionSchema = z.object({
  text: z.string(),
  completed: z.boolean().default(false),
});
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

// Story schema
export const StorySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: StoryType.default('user-story'),
  status: StoryStatus.default('draft'),
  priority: Priority.default('medium'),
  feature: z.string().optional(),
  persona: z.string().optional(),
  asA: z.string().optional(),
  iWant: z.string().optional(),
  soThat: z.string().optional(),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).default([]),
  openQuestions: z.array(z.string()).default([]),
  edgeCases: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  relatedStories: z.array(z.string()).default([]),
  estimate: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type Story = z.infer<typeof StorySchema>;

// Feature schema
export const FeatureSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: StoryStatus.default('draft'),
  priority: Priority.default('medium'),
  successCriteria: z.array(z.string()).default([]),
  stories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type Feature = z.infer<typeof FeatureSchema>;

// Persona schema
export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  goals: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
  behaviors: z.array(z.string()).default([]),
});
export type Persona = z.infer<typeof PersonaSchema>;

// Project configuration schema
export const ProjectConfigSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  personas: z.array(PersonaSchema).default([]),
  defaultPriority: Priority.default('medium'),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

// INVEST criteria for story quality
export interface InvestAnalysis {
  independent: { score: number; feedback: string };
  negotiable: { score: number; feedback: string };
  valuable: { score: number; feedback: string };
  estimable: { score: number; feedback: string };
  small: { score: number; feedback: string };
  testable: { score: number; feedback: string };
  overallScore: number;
  suggestions: string[];
}
