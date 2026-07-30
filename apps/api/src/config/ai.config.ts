import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  defaultProvider: process.env.DEFAULT_AI_PROVIDER || 'openai',
  defaultModel: process.env.DEFAULT_AI_MODEL || 'gpt-4o',
  evaluationModel: process.env.EVALUATION_AI_MODEL || 'gpt-4o',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
}));
