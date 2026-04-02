/**
 * LLM Provider Resolution — uses pi SDK for unified provider management.
 *
 * Replaced native fetch-based providers with pi SDK's AuthStorage and ModelRegistry.
 */

import type { LLMConfig } from './provider.js';
import { PiSDKProvider, createPiSDKProvider, describePiSDKAvailability } from './pi-sdk.js';
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
