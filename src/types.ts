export interface SiteRow {
  providerName: string;
  providerId: string;
  modelName: string;
  modelId: string;
  family: string | null;
  toolCall: boolean;
  reasoning: boolean;
  input: string[];
  output: string[];
  cost: {
    input: number | null;
    output: number | null;
    reasoning: number | null;
    cacheRead: number | null;
    cacheWrite: number | null;
    inputAudio: number | null;
    outputAudio: number | null;
  } | null;
  limit: {
    context: number;
    input: number | null;
    output: number;
  };
  structuredOutput: boolean | null;
  temperature: boolean;
  openWeights: boolean;
  knowledge: string | null;
  releaseDate: string;
  lastUpdated: string;
  searchText: string;
}

export interface SiteData {
  generatedAt: string;
  rowCount: number;
  rows: SiteRow[];
}

export interface ApiCost {
  input?: number;
  output?: number;
  reasoning?: number;
  cache_read?: number;
  cache_write?: number;
  input_audio?: number;
  output_audio?: number;
}

export interface ApiModel {
  id: string;
  name: string;
  family?: string;
  tool_call: boolean;
  reasoning: boolean;
  modalities: {
    input: string[];
    output: string[];
  };
  cost?: ApiCost;
  limit: {
    context: number;
    input?: number;
    output: number;
  };
  structured_output?: boolean;
  temperature?: boolean;
  open_weights: boolean;
  knowledge?: string;
  release_date: string;
  last_updated: string;
  status?: string;
}

export interface ApiProvider {
  id: string;
  name: string;
  models: Record<string, ApiModel>;
}

export type ApiResponse = Record<string, ApiProvider>;
