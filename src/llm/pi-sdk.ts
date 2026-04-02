/**
 * Pi SDK Provider — uses pi's agent SDK for LLM calls.
 *
 * Replaces direct Anthropic/OpenAI API calls with pi SDK's createAgentSession.
 * This provides unified provider management, auth handling, and model selection.
 */

import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  type AgentSession,
  type AgentSessionEvent,
} from '@mariozechner/pi-coding-agent';
import type { Model, Api } from '@mariozechner/pi-ai';
import type { LLMProvider, GenerateOptions } from './provider.js';

/**
 * Pi SDK-based LLM provider.
 * Implements the LLMProvider interface using pi's AgentSession.
 */
export class PiSDKProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private session: AgentSession;
  private modelRegistry: ModelRegistry;
  private disposeSession: (() => void) | null = null;

  constructor(
    session: AgentSession,
    modelRegistry: ModelRegistry,
    providerName: string,
    modelId: string,
  ) {
    this.session = session;
    this.modelRegistry = modelRegistry;
    this.name = providerName;
    this.model = modelId;
  }

  /**
   * Generate a completion using pi SDK.
   * Collects all text deltas and returns the complete response.
   * Optional onChunk callback for streaming progress.
   */
  async generate(
    prompt: string,
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const chunks: string[] = [];
    let isComplete = false;
    let lastChunkTime = Date.now();

    const unsubscribe = this.session.subscribe((event: AgentSessionEvent) => {
      switch (event.type) {
        case 'message_update':
          if (event.assistantMessageEvent.type === 'text_delta') {
            const delta = event.assistantMessageEvent.delta;
            chunks.push(delta);
            lastChunkTime = Date.now();
            // Call streaming callback if provided
            if (onChunk) {
              try { onChunk(delta); } catch { /* ignore callback errors */ }
            }
          }
          break;
        case 'message_end':
        case 'agent_end':
          isComplete = true;
          break;
        case 'tool_execution_end':
          // Track tool results if needed
          break;
      }
    });

    try {
      // Send the prompt - pi handles system prompt via options internally
      // We need to include system prompt in the message for pi
      const fullPrompt = options?.system
        ? `${options.system}\n\n${prompt}`
        : prompt;

      const promptStart = Date.now();
      await this.session.prompt(fullPrompt);
      const promptTime = Date.now() - promptStart;

      // Wait for completion with timeout - adaptive polling
      const startTime = Date.now();
      const timeout = 300000; // 5 minutes max
      let stallTime = 0;

      while (!isComplete && Date.now() - startTime < timeout) {
        const elapsed = Date.now() - startTime;
        const sinceLastChunk = Date.now() - lastChunkTime;

        // Adaptive sleep: faster polling at start, slower after 30s of inactivity
        if (sinceLastChunk > 30000) {
          stallTime += 100;
          await new Promise(r => setTimeout(r, 100));
        } else if (sinceLastChunk > 10000) {
          await new Promise(r => setTimeout(r, 50));
        } else {
          await new Promise(r => setTimeout(r, 10)); // Fast polling when active
        }

        // Timeout if stalled for too long
        if (stallTime > 60000) {
          throw new Error('LLM generation stalled - no output for 60s');
        }
      }

      if (!isComplete) {
        throw new Error('LLM generation timeout after 5 minutes');
      }

      return chunks.join('');
    } finally {
      unsubscribe();
    }
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    if (this.disposeSession) {
      this.disposeSession();
    }
    this.session.dispose();
  }
}

/**
 * Create a PiSDKProvider from available credentials.
 * Returns null if no provider can be resolved.
 * 
 * @param phoenixDir - Phoenix project directory for auth storage
 * @param preferredProvider - Optional preferred provider name (e.g., 'anthropic')
 * @param preferredModel - Optional preferred model ID (e.g., 'claude-sonnet-4-20250514')
 */
export async function createPiSDKProvider(
  phoenixDir?: string,
  preferredProvider?: string,
  preferredModel?: string,
): Promise<PiSDKProvider | null> {
  // Use phoenixDir for auth storage if provided, otherwise default
  const agentDir = phoenixDir
    ? `${phoenixDir}/.pi-agent`
    : undefined;

  const authStorage = agentDir
    ? AuthStorage.create(agentDir)
    : AuthStorage.create();

  const modelRegistry = ModelRegistry.create(authStorage);

  // Get available models (those with valid API keys)
  const available: Model<Api>[] = await modelRegistry.getAvailable();

  if (available.length === 0) {
    return null;
  }

  let selectedModel: Model<Api> | undefined;

  // 1. Try preferred provider + model if specified
  if (preferredProvider && preferredModel) {
    selectedModel = available.find(
      m => m.provider === preferredProvider && m.id === preferredModel
    );
  }
  
  // 2. Try preferred provider only (any model)
  if (!selectedModel && preferredProvider) {
    selectedModel = available.find(m => m.provider === preferredProvider);
  }

  // 3. Fallback: prefer Anthropic, then OpenAI, then first available
  if (!selectedModel) {
    selectedModel = available.find(m => m.provider === 'anthropic');
  }
  if (!selectedModel) {
    selectedModel = available.find(m => m.provider === 'openai');
  }
  if (!selectedModel) {
    selectedModel = available[0];
  }

  // Create session with minimal tools (we only need generation, no file ops)
  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    authStorage,
    modelRegistry,
    model: selectedModel,
    thinkingLevel: 'off', // Use 'off' for deterministic code generation
    tools: [], // No tools needed for pure generation
  });

  return new PiSDKProvider(
    session,
    modelRegistry,
    selectedModel.provider,
    selectedModel.id,
  );
}

/**
 * Describe which providers are available via pi SDK.
 */
export async function describePiSDKAvailability(): Promise<{
  available: string[];
  configured: string | null;
  hint: string;
}> {
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  const available: Model<Api>[] = await modelRegistry.getAvailable();

  const providerNames = [...new Set(available.map(m => m.provider))];

  let hint: string;
  if (providerNames.length === 0) {
    hint = 'No LLM API keys found. Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable code generation. Falling back to stubs.';
  } else if (providerNames.length === 1) {
    hint = `Using ${providerNames[0]} (detected from env).`;
  } else {
    hint = `Multiple providers available: ${providerNames.join(', ')}. Using ${providerNames[0]}.`;
  }

  return {
    available: providerNames,
    configured: providerNames[0] || null,
    hint,
  };
}

/**
 * List all available models from pi SDK.
 */
export async function listAvailableModels(phoenixDir?: string): Promise<Array<{ provider: string; id: string; description?: string }>> {
  const agentDir = phoenixDir ? `${phoenixDir}/.pi-agent` : undefined;
  const authStorage = agentDir ? AuthStorage.create(agentDir) : AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  const available = await modelRegistry.getAvailable();
  
  return available.map(m => ({
    provider: m.provider,
    id: m.id,
    description: m.description,
  }));
}
