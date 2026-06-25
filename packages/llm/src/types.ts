export type MatiaLlmPurpose = "article" | "factCheck";

export type MatiaLlmResolvedConfig = {
  chatUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
};

export type CompleteChatParams = {
  config: MatiaLlmResolvedConfig;
  system: string;
  user: string;
  jsonMode?: boolean;
};

export type CompleteChatResult = {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};
