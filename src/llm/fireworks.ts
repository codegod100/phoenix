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
  private baseUrl = 'https://api.fireworks.ai/inference/v1/chat/completions';

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
    const maxTokens = options?.maxTokens ?? 8192;
    const temperature = options?.temperature ?? 0.1;
    const systemPrompt = options?.system ?? this.getSystemPrompt();

    // Fireworks REQUIRES streaming for max_tokens > 4096
    const useStreaming = maxTokens > 4096;

    const body = {
      model: this.model.startsWith('accounts/') ? this.model : `accounts/fireworks/models/${this.model}`,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: temperature,
      stream: useStreaming,
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
      throw new Error(`Fireworks API error: ${response.status} ${error}`);
    }

    if (useStreaming) {
      return this.handleStreaming(response, onChunk);
    } else {
      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    }
  }

  private async handleStreaming(
    response: Response,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    let result = '';
    let buffer = ''; // Buffer for incomplete SSE lines
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Append to buffer and process lines
      buffer += decoder.decode(value, { stream: true });
      
      // Extract complete lines (those ending with \n)
      const lines: string[] = [];
      let lineEnd = buffer.indexOf('\n');
      while (lineEnd !== -1) {
        lines.push(buffer.slice(0, lineEnd));
        buffer = buffer.slice(lineEnd + 1);
        lineEnd = buffer.indexOf('\n');
      }

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content ?? '';
          if (content) {
            result += content;
            onChunk?.(content);
          }
        } catch (err) {
          // Log parse errors for debugging
          console.error(`[Fireworks] Failed to parse SSE data: ${data.slice(0, 100)}`);
        }
      }
    }

    // Process any remaining data in buffer
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ')) {
        const data = trimmed.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content ?? '';
            if (content) result += content;
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
      '- Always escape backticks in template literals: use \\\` not just `',
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
