import { z } from 'zod';

export const modelConfigFields = {
  SCREENING_PROVIDER: z.enum(['openai', 'openrouter']).default('openai'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default(''),
  OPENROUTER_API_KEY: z.string().default(''),
  OPENROUTER_MODEL: z.string().default(''),
  MODEL_TIMEOUT_MS: z.coerce.number().int().min(500).max(5000).default(3500)
};
const modelSchema = z.object(modelConfigFields);
export type ModelConfig = z.infer<typeof modelSchema>;
export const loadModelConfig = (env: NodeJS.ProcessEnv = process.env): ModelConfig => modelSchema.parse(env);
export const modelConfigured = (config: ModelConfig): boolean => config.SCREENING_PROVIDER === 'openrouter'
  ? !!config.OPENROUTER_API_KEY && !!config.OPENROUTER_MODEL
  : !!config.OPENAI_API_KEY && !!config.OPENAI_MODEL;
