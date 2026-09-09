export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GROQ = 'groq',
  GEMINI = 'gemini',
  CUSTOM = 'custom',
}

export interface HallucinationDetectionResult {
  detected: boolean;
  confidence: number;
  details: HallucinationDetail[];
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface HallucinationDetail {
  claim: string;
  type: 'FACTUAL_ERROR' | 'UNSUPPORTED_CLAIM' | 'CONTRADICTION' | 'FABRICATION';
  confidence: number;
  explanation: string;
}

export interface FeedbackSummary {
  totalEvaluations: number;
  commonThemes: string[];
  strengthAreas: string[];
  weaknessAreas: string[];
  suggestedImprovements: string[];
  overallSentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  summary: string;
}

export interface AutoLabelSuggestion {
  suggestedLabel: string;
  confidence: number;
  reasoning: string;
  alternativeLabels: Array<{ label: string; confidence: number }>;
}

export interface EvaluatorDisagreementAnalysis {
  taskId: string;
  disagreementRate: number;
  rootCauses: string[];
  problematicItems: Array<{
    datasetRowId: string;
    disagreementScore: number;
    evaluatorOpinions: string[];
  }>;
  recommendations: string[];
}

export interface AIEvaluationRequest {
  prompt: string;
  response: string;
  context?: string;
  expectedOutput?: string;
  criteria: string[];
  provider?: AIProvider;
}

export interface AIEvaluationResult {
  scores: Record<string, number>;
  dimensionExplanations: Record<string, string>;
  overallScore: number;
  reasoning: string;
  hallucinationDetection: HallucinationDetectionResult;
  qualityLabel: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  confidence: number;
  tokensUsed: number;
  latencyMs: number;
}
