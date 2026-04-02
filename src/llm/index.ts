/**
 * LLM integration — pi SDK-based provider system for code generation.
 */

export type { LLMProvider, GenerateOptions, LLMConfig } from './provider.js';
export { DEFAULT_MODELS } from './provider.js';

// Legacy providers replaced by pi SDK
// export { AnthropicProvider } from './anthropic.js'; // Removed - use pi SDK
// export { OpenAIProvider } from './openai.js'; // Removed - use pi SDK

// New pi SDK-based provider
export { PiSDKProvider, createPiSDKProvider, describePiSDKAvailability, listAvailableModels } from './pi-sdk.js';

// Updated resolution that uses pi SDK
export { resolveProvider, describeAvailability } from './resolve.js';

export { buildPrompt, SYSTEM_PROMPT, getSystemPrompt } from './prompt.js';
