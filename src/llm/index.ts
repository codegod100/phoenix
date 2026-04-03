/**
 * LLM integration — pi SDK-based provider system for code generation.
 */

export type { LLMProvider, GenerateOptions, LLMConfig } from './provider.js';
export { DEFAULT_MODELS } from './provider.js';

// Legacy providers replaced by pi SDK
// export { AnthropicProvider } from './anthropic.js'; // Removed - use pi SDK
// export { OpenAIProvider } from './openai.js'; // Removed - use pi SDK

// New pi SDK-based provider
export { PiSDKProvider, ProviderPool, createPiSDKProvider, describePiSDKAvailability, listAvailableModels } from './pi-sdk.js';

// CLI-based parallel pool for true process isolation
export { CLIPool, createCLIPool } from './cli-pool.js';

// Updated resolution that uses pi SDK
export { resolveProvider, resolveProviderOrPool, createProviderPool, describeAvailability } from './resolve.js';

export {
  buildPrompt,
  buildClientPrompt,
  buildTsUiPrompt,
  buildFixPrompt,
  getOptimizedPrompt,
  estimateTokens,
  SYSTEM_PROMPT,
  KIMI_SYSTEM_PROMPT,
  getSystemPrompt,
  getKimiSystemPrompt,
} from './prompt.js';
