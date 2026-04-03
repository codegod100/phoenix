/**
 * LLM Provider Resolution — uses pi SDK for unified provider management.
 *
 * Replaced native fetch-based providers with pi SDK's AuthStorage and ModelRegistry.
 */

import type { LLMConfig, LLMProvider } from './provider.js';
import { PiSDKProvider, ProviderPool, createPiSDKProvider, describePiSDKAvailability } from './pi-sdk.js';
import { CLIPool, createCLIPool } from './cli-pool.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

interface PhoenixConfig {
  llm?: LLMConfig;
}

/**
 * Resolve the LLM provider using pi SDK.
 * Returns null if no provider is available.
 */
export async function resolveProvider(phoenixDir?: string): Promise<PiSDKProvider | null> {
  const config = phoenixDir ? loadConfig(phoenixDir) : {};

  // Check for explicit env var override
  const envProvider = process.env.PHOENIX_LLM_PROVIDER;
  const envModel = process.env.PHOENIX_LLM_MODEL;

  // Determine preferred provider/model (env vars take precedence over config)
  const preferredProvider = envProvider ?? config.llm?.provider;
  const preferredModel = envModel ?? config.llm?.model;

  // Create the provider via pi SDK with preferences
  const provider = await createPiSDKProvider(phoenixDir, preferredProvider, preferredModel);

  // Save preference if we detected it (and have a phoenix dir)
  if (phoenixDir && provider && !config.llm) {
    saveConfig(phoenixDir, {
      ...config,
      llm: { provider: provider.name, model: provider.model },
    });
  }

  return provider;
}

/**
 * Create a Provider Pool for concurrent generation.
 * Each worker gets its own AgentSession for true parallelism.
 */
export async function createProviderPool(
  phoenixDir: string,
  concurrency: number = 3
): Promise<ProviderPool | null> {
  const config = loadConfig(phoenixDir);

  // Check for explicit env var override
  const envProvider = process.env.PHOENIX_LLM_PROVIDER;
  const envModel = process.env.PHOENIX_LLM_MODEL;

  // Determine preferred provider/model
  const preferredProvider = envProvider ?? config.llm?.provider;
  const preferredModel = envModel ?? config.llm?.model;

  // Create the pool
  const pool = new ProviderPool(phoenixDir, preferredProvider, preferredModel, concurrency);
  await pool.initialize();

  // Save preference if we detected it
  if (!config.llm) {
    saveConfig(phoenixDir, {
      ...config,
      llm: { provider: pool.name, model: pool.model },
    });
  }

  return pool;
}

/**
 * Create a CLI Pool for true process-parallel generation.
 * Uses separate pi CLI processes - no shared state, no serialization.
 */
export async function createCLIPoolForPhoenix(
  phoenixDir: string,
  concurrency: number = 4
): Promise<CLIPool | null> {
  const config = loadConfig(phoenixDir);

  // Check for explicit env var override
  const envProvider = process.env.PHOENIX_LLM_PROVIDER;
  const envModel = process.env.PHOENIX_LLM_MODEL;

  // Determine preferred provider/model
  const preferredProvider = envProvider ?? config.llm?.provider;
  const preferredModel = envModel ?? config.llm?.model;

  // Create CLI pool
  const pool = await createCLIPool(phoenixDir, preferredProvider, preferredModel, concurrency);

  // Save preference if we detected it
  if (pool && !config.llm) {
    saveConfig(phoenixDir, {
      ...config,
      llm: { provider: pool.name, model: pool.model },
    });
  }

  return pool;
}

/**
 * Create a Provider Pool for concurrent generation, or fall back to single provider.
 * Returns null if no provider is available.
 *
 * Set PHOENIX_CLI_POOL=1 to use CLI-based process pool instead of SDK pool.
 */
export async function resolveProviderOrPool(
  phoenixDir: string,
  concurrency: number = 3
): Promise<LLMProvider | null> {
  // Check if user wants CLI pool (process spawning)
  const useCLIPool = process.env.PHOENIX_CLI_POOL === '1' || process.env.PHOENIX_CLI_POOL === 'true';

  // For single IU or low concurrency, use single provider (lighter weight)
  if (concurrency <= 1 && !useCLIPool) {
    return resolveProvider(phoenixDir);
  }

  // Try CLI pool first if requested
  if (useCLIPool) {
    try {
      const pool = await createCLIPoolForPhoenix(phoenixDir, concurrency);
      if (pool) {
        console.log(`Using CLI pool (concurrency: ${concurrency})`);
        return pool;
      }
    } catch (err) {
      console.log(`CLI pool unavailable: ${err}, falling back to SDK`);
    }
  }

  // Try SDK pool
  try {
    const pool = await createProviderPool(phoenixDir, concurrency);
    return pool;
  } catch {
    // Fall back to single provider
    return resolveProvider(phoenixDir);
  }
}

/**
 * Describe which providers are available (for CLI help).
 */
export async function describeAvailability(): Promise<{
  available: string[];
  configured: string | null;
  hint: string;
}> {
  return describePiSDKAvailability();
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
function saveConfig(phoenixDir: string, config: PhoenixConfig): void {
  mkdirSync(phoenixDir, { recursive: true });
  writeFileSync(
    join(phoenixDir, 'config.json'),
    JSON.stringify(config, null, 2) + '\n',
    'utf8',
  );
}
