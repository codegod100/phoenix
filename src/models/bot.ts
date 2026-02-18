/**
 * Bot models for Freeq integration.
 */

export type BotName = 'SpecBot' | 'ImplBot' | 'PolicyBot';

export interface BotCommand {
  bot: BotName;
  action: string;
  args: Record<string, string>;
  raw: string;
}

export interface BotResponse {
  bot: BotName;
  action: string;
  mutating: boolean;
  /** For mutating commands: the confirmation ID */
  confirm_id?: string;
  /** Human-readable description of what will happen */
  intent?: string;
  /** The result (for read-only commands or after confirmation) */
  result?: unknown;
  message: string;
}
