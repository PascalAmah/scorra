import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  defaultProvider: process.env.AI_PROVIDER || process.env.DEFAULT_AI_PROVIDER || 'openai',
  defaultModel: process.env.DEFAULT_AI_MODEL || 'gpt-4o',
  evaluationModel: process.env.EVALUATION_AI_MODEL || 'gpt-4o',
  anthropicEvaluationModel: process.env.EVALUATION_AI_MODEL_ANTHROPIC || 'claude-3-5-sonnet-20241022',
  groqEvaluationModel: process.env.EVALUATION_AI_MODEL_GROQ || 'openai/gpt-oss-120b',
  geminiEvaluationModel: process.env.EVALUATION_AI_MODEL_GEMINI || 'gemini-2.0-flash',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2048', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.2'),
}));
