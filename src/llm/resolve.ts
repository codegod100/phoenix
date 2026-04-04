/**
 * LLM Provider Resolution — Direct Fireworks API only.
 *
 * Uses raw HTTP streaming to Fireworks API. No Pi SDK, no CLI spawning.
 */

import type { LLMConfig, LLMProvider } from './provider.js';
import { FireworksProvider, createFireworksProvider } from './fireworks.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

interface PhoenixConfig {
  llm?: LLMConfig;
}

const DEFAULT_PROVIDER = 'fireworks';
const DEFAULT_MODEL = 'accounts/fireworks/routers/kimi-k2p5-turbo';

/**
 * Resolve the LLM provider — direct Fireworks API only.
 * Returns null if API key not available.
 */
export async function resolveProvider(phoenixDir?: string): Promise<LLMProvider | null> {
  const config = phoenixDir ? loadConfig(phoenixDir) : {};

  // Check for explicit env var override
  const envProvider = process.env.PHOENIX_LLM_PROVIDER;
  const envModel = process.env.PHOENIX_LLM_MODEL;

  // Use explicit settings, config, or defaults
  const provider = envProvider ?? config.llm?.provider ?? DEFAULT_PROVIDER;
  const model = envModel ?? config.llm?.model ?? DEFAULT_MODEL;

  if (provider !== 'fireworks') {
    console.warn(`Provider ${provider} not supported. Only 'fireworks' is available.`);
    return null;
  }

  try {
    const fw = createFireworksProvider(model);
    console.log(`Using Fireworks API: ${model}`);
    return fw;
  } catch (err) {
    console.error(`Failed to create Fireworks provider: ${err}`);
    return null;
  }
}

/**
 * Create a provider pool — uses multiple Fireworks providers for parallelism.
 * Note: Fireworks has rate limits, so we use a single provider with concurrency control.
 */
export async function createProviderPool(
  phoenixDir: string,
  _concurrency: number = 3
): Promise<LLMProvider | null> {
  // Fireworks benefits more from sequential streaming than parallel requests
  // due to rate limits. Return single provider.
  return resolveProvider(phoenixDir);
}

/**
 * Create a CLI Pool — NOT USED. Direct API only.
 * @deprecated Use resolveProvider() instead
 */
export async function createCLIPoolForPhoenix(
  phoenixDir: string,
  _concurrency: number = 4
): Promise<never> {
  throw new Error('CLI pool disabled. Use direct Fireworks API via resolveProvider().');
}

/**
 * Resolve provider or pool — always returns direct Fireworks provider.
 */
export async function resolveProviderOrPool(
  phoenixDir: string,
  _concurrency: number = 3
): Promise<LLMProvider | null> {
  return resolveProvider(phoenixDir);
}

/**
 * Describe which providers are available.
 */
export async function describeAvailability(): Promise<{
  available: string[];
  configured: string | null;
  hint: string;
}> {
  const hasKey = !!(process.env.FIREWORKS_API_KEY || process.env.PHOENIX_FIREWORKS_KEY);
  return {
    available: hasKey ? ['fireworks'] : [],
    configured: hasKey ? 'fireworks' : null,
    hint: hasKey
      ? 'Using direct Fireworks API with streaming. Set FIREWORKS_API_KEY if needed.'
      : 'Set FIREWORKS_API_KEY or PHOENIX_FIREWORKS_KEY env var.',
  };
}

/**
 * Load Phoenix config from .phoenix/config.json.
 */
function loadConfig(phoenixDir: string): PhoenixConfig {
  const configPath = join(phoenixDir, 'config.json');
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Save Phoenix config to .phoenix/config.json.
 */
export function saveConfig(phoenixDir: string, config: PhoenixConfig): void {
  mkdirSync(phoenixDir, { recursive: true });
  writeFileSync(
    join(phoenixDir, 'config.json'),
    JSON.stringify(config, null, 2) + '\n',
    'utf8',
  );
}

// Re-export Fireworks provider for direct use
export { FireworksProvider, createFireworksProvider };
