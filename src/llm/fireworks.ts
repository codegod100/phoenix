/**
 * Direct Fireworks API Provider — raw HTTP streaming, no CLI.
 *
 * Uses native fetch with streaming for long outputs.
 * Handles Fireworks API quirks (max_tokens > 4096 requires streaming).
 */

import type { LLMProvider, GenerateOptions } from './provider.js';

export class FireworksProvider implements LLMProvider {
  readonly name = 'fireworks';
  readonly model: string;
  private apiKey: string;
  private baseUrl = 'https://api.fireworks.ai/inference/v1/completions';

  constructor(model: string = 'accounts/fireworks/routers/kimi-k2p5-turbo') {
    this.model = model;
    const key = process.env.FIREWORKS_API_KEY || process.env.PHOENIX_FIREWORKS_KEY;
    if (!key) {
      throw new Error('FIREWORKS_API_KEY or PHOENIX_FIREWORKS_KEY env var required');
    }
    this.apiKey = key;
  }

  async generate(
    prompt: string,
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const maxTokens = options?.maxTokens ?? 4096;
    const temperature = options?.temperature ?? 0.1;
    const systemPrompt = options?.system ?? this.getSystemPrompt();

    // Fireworks REQUIRES streaming for max_tokens > 4096
    const useStreaming = maxTokens > 4096;

    // Combine system and user prompt for completions endpoint
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

    const body = {
      model: this.model.startsWith('accounts/') ? this.model : `accounts/fireworks/models/${this.model}`,
      prompt: fullPrompt,
      max_tokens: maxTokens,
      temperature: temperature,
      stream: useStreaming,
      reasoning_effort: 'low', // Minimize thinking for faster, cleaner output
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Fireworks] API Error:', response.status, error.slice(0, 500));
      throw new Error(`Fireworks API error: ${response.status} ${error.slice(0, 200)}`);
    }

    if (useStreaming) {
      return this.handleStreaming(response, onChunk);
    } else {
      const data = await response.json();
      return data.choices?.[0]?.text ?? '';
    }
  }

  private async handleStreaming(
    response: Response,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    let result = '';
    let buffer = '';
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process SSE lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6); // Remove 'data: ' prefix
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const text = parsed.choices?.[0]?.text ?? '';
          if (text) {
            result += text;
            onChunk?.(text);
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }

    // Process any remaining data
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const text = parsed.choices?.[0]?.text ?? '';
            if (text) result += text;
          } catch {
            // Ignore final parse errors
          }
        }
      }
    }

    return result;
  }

  private getSystemPrompt(): string {
    return [
      'You are an expert TypeScript code generator. Generate clean, production-ready code.',
      'Follow these rules strictly:',
      '- Use TypeScript with proper types',
      '- Use Hono framework for web APIs',
      '- Always escape backticks in template literals: use \\` not just `',
      '- Return only the code, no markdown fences',
      '- Ensure all SQL queries use correct column names from the schema'
    ].join('\n');
  }
}

/**
 * Create a direct Fireworks provider.
 */
export function createFireworksProvider(model?: string): FireworksProvider {
  return new FireworksProvider(model);
}
