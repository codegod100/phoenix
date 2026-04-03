/**
 * CLI Pool — process-parallel LLM generation using pi CLI.
 *
 * Spawns separate pi CLI processes for true parallelism, bypassing
 * the SDK's internal session serialization. Each worker is fully isolated.
 */

import { $ } from 'bun';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { LLMProvider, GenerateOptions } from './provider.js';

interface QueuedTask {
  id: string;
  prompt: string;
  options?: GenerateOptions;
  onChunk?: (chunk: string) => void;
  resolve: (result: string) => void;
  reject: (err: Error) => void;
  startTime: number;
}

/**
 * Process pool for parallel LLM generation using pi CLI.
 * Each worker spawns a separate process - no shared state, no serialization.
 */
export class CLIPool implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private provider: string;
  private concurrency: number;
  private queue: QueuedTask[] = [];
  private activeWorkers = 0;
  private workerPromises: Promise<void>[] = [];
  private shutdownSignal = false;

  constructor(provider: string, model: string, concurrency: number = 4) {
    this.provider = provider;
    this.model = model;
    this.name = `${provider}-cli`;
    this.model = model;
    this.concurrency = concurrency;
  }

  /**
   * Generate using the CLI pool.
   * Queues the task and returns a promise that resolves when a worker picks it up.
   */
  async generate(
    prompt: string,
    options?: GenerateOptions,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    console.log(`[CLIPool] Queueing task (active: ${this.activeWorkers}, queue: ${this.queue.length})`);
    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        prompt,
        options,
        onChunk,
        resolve,
        reject,
        startTime: Date.now(),
      };

      this.queue.push(task);
      this.ensureWorkers();
    });
  }

  /**
   * Ensure we have the right number of workers running.
   */
  private ensureWorkers(): void {
    while (this.activeWorkers < Math.min(this.concurrency, this.queue.length)) {
      this.activeWorkers++;
      const workerPromise = this.workerLoop();
      this.workerPromises.push(workerPromise);
    }
  }

  /**
   * Worker loop - picks up tasks from queue and processes them.
   */
  private async workerLoop(): Promise<void> {
    while (!this.shutdownSignal) {
      const task = this.queue.shift();
      if (!task) {
        // No more tasks, exit worker
        break;
      }

      console.log(`[CLIPool] Worker picked up task ${task.id} (${Date.now() - task.startTime}ms queued)`);

      try {
        const result = await this.executeTask(task);
        task.resolve(result);
      } catch (err) {
        task.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }

    this.activeWorkers--;
  }

  /**
   * Execute a single task by spawning pi CLI.
   */
  private async executeTask(task: QueuedTask): Promise<string> {
    const tmpDir = await mkdtemp(join(tmpdir(), 'phoenix_cli_'));
    const promptFile = join(tmpDir, 'prompt.txt');

    try {
      // Write prompt to temp file
      await writeFile(promptFile, task.prompt, 'utf8');

      // Build pi CLI arguments
      const args: string[] = [
        '--print',
        '--provider', this.provider,
        '--model', this.model,
        '--no-session',      // Don't save session state
        '--thinking', 'off', // Faster, no thinking
        `@${promptFile}`,
      ];

      // Add system prompt if provided
      if (task.options?.system) {
        const systemFile = join(tmpDir, 'system.txt');
        await writeFile(systemFile, task.options.system, 'utf8');
        args.push('--system-prompt', `@${systemFile}`);
      }

      const startTime = Date.now();

      // Spawn pi CLI as separate process with timeout
      const timeoutMs = 300000; // 5 min
      const cliPromise = $`pi ${args}`;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`pi CLI timeout after ${timeoutMs}ms`)), timeoutMs)
      );
      const result = await Promise.race([cliPromise, timeoutPromise]);

      const elapsed = Date.now() - startTime;

      if (result.exitCode !== 0) {
        const stderr = result.stderr instanceof Buffer ? result.stderr.toString('utf8') : String(result.stderr);
        throw new Error(`pi CLI failed: ${stderr}`);
      }

      const output = result.stdout instanceof Buffer ? result.stdout.toString('utf8') : String(result.stdout);

      // Stream progress if callback provided (simulate by sending chunks)
      if (task.onChunk) {
        // Send the whole result as one "chunk" since CLI doesn't stream
        // For true streaming, we'd use --mode rpc, but that's more complex
        task.onChunk(output);
      }

      return output;
    } finally {
      // Cleanup temp dir
      try {
        await rm(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Generate multiple prompts in parallel and return all results.
   * More efficient than individual generate() calls - single batch spawn.
   */
  async generateBatch(
    prompts: Array<{ id: string; prompt: string; options?: GenerateOptions }>
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const startTime = Date.now();

    console.log(`[CLIPool] Spawning ${prompts.length} tasks with concurrency ${this.concurrency}`);

    // Create all tasks
    const tasks = prompts.map(p =>
      this.generate(p.prompt, p.options).then(
        result => ({ id: p.id, result, error: null }),
        error => ({ id: p.id, result: null as unknown as string, error })
      )
    );

    // Wait for all
    const settled = await Promise.allSettled(tasks);

    const elapsed = Date.now() - startTime;
    const successCount = settled.filter(s => s.status === 'fulfilled' && !s.value.error).length;
    console.log(`[CLIPool] Batch complete: ${successCount}/${prompts.length} succeeded in ${elapsed}ms`);

    // Collect results
    for (const outcome of settled) {
      if (outcome.status === 'fulfilled') {
        if (outcome.value.error) {
          throw new Error(`Task ${outcome.value.id} failed: ${outcome.value.error}`);
        }
        results.set(outcome.value.id, outcome.value.result);
      } else {
        throw outcome.reason;
      }
    }

    return results;
  }

  /**
   * Dispose the pool - stop accepting new tasks and wait for workers to finish.
   */
  async dispose(): Promise<void> {
    this.shutdownSignal = true;
    await Promise.all(this.workerPromises);
  }
}

/**
 * Create a CLI pool for the preferred provider.
 */
export async function createCLIPool(
  phoenixDir: string | undefined,
  preferredProvider: string | undefined,
  preferredModel: string | undefined,
  concurrency: number = 4
): Promise<CLIPool | null> {
  // For CLI pool, we don't need to initialize anything - just validate pi is available
  try {
    const result = await $`pi --version`.quiet();
    if (result.exitCode !== 0) {
      throw new Error('pi CLI not found');
    }
  } catch {
    return null;
  }

  // Determine provider and model
  const provider = preferredProvider ?? 'anthropic';
  const model = preferredModel ?? defaultModel(provider);

  return new CLIPool(provider, model, concurrency);
}

function defaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    anthropic: 'claude-sonnet-4-20250514',
    openai: 'gpt-4o',
    fireworks: 'accounts/fireworks/routers/kimi-k2p5-turbo',
    gemini: 'gemini-2.5-flash',
  };
  return defaults[provider] ?? 'gpt-4o';
}
