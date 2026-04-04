/**
 * LLM integration — Direct Fireworks API only.
 *
 * Raw HTTP streaming. No Pi SDK, no CLI processes.
 */

export type { LLMProvider, GenerateOptions, LLMConfig } from './provider.js';
export { DEFAULT_MODELS } from './provider.js';

// Direct Fireworks API provider
export { FireworksProvider, createFireworksProvider } from './fireworks.js';

// Resolution — Fireworks API only
export { resolveProvider, resolveProviderOrPool, createProviderPool, describeAvailability, saveConfig } from './resolve.js';

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
