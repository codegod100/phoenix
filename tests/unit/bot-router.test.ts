import { describe, it, expect } from 'vitest';
import { parseCommand, routeCommand, getAllCommands } from '../../src/bot-router.js';
import type { BotCommand } from '../../src/models/bot.js';

describe('parseCommand', () => {
  it('parses basic command', () => {
    const result = parseCommand('SpecBot: ingest spec/auth.md');
    expect('error' in result).toBe(false);
    const cmd = result as BotCommand;
    expect(cmd.bot).toBe('SpecBot');
    expect(cmd.action).toBe('ingest');
    expect(cmd.args['_']).toBe('spec/auth.md');
  });

  it('parses key=value args', () => {
    const result = parseCommand('ImplBot: regen iu=AuthIU');
    expect('error' in result).toBe(false);
    const cmd = result as BotCommand;
    expect(cmd.args['iu']).toBe('AuthIU');
  });

  it('parses no-arg commands', () => {
    const result = parseCommand('PolicyBot: status');
    expect('error' in result).toBe(false);
    const cmd = result as BotCommand;
    expect(cmd.bot).toBe('PolicyBot');
    expect(cmd.action).toBe('status');
  });

  it('rejects unknown bot', () => {
    const result = parseCommand('FakeBot: do something');
    expect('error' in result).toBe(true);
  });

  it('rejects unknown command', () => {
    const result = parseCommand('SpecBot: destroy everything');
    expect('error' in result).toBe(true);
  });

  it('rejects malformed input', () => {
    const result = parseCommand('not a command');
    expect('error' in result).toBe(true);
  });
});

describe('routeCommand', () => {
  it('returns confirmation for mutating commands', () => {
    const cmd: BotCommand = { bot: 'SpecBot', action: 'ingest', args: { _: 'spec/auth.md' }, raw: 'SpecBot: ingest spec/auth.md' };
    const resp = routeCommand(cmd);
    expect(resp.mutating).toBe(true);
    expect(resp.confirm_id).toBeTruthy();
    expect(resp.intent).toContain('spec/auth.md');
    expect(resp.message).toContain('confirm');
  });

  it('executes read-only commands immediately', () => {
    const cmd: BotCommand = { bot: 'PolicyBot', action: 'status', args: {}, raw: 'PolicyBot: status' };
    const resp = routeCommand(cmd);
    expect(resp.mutating).toBe(false);
    expect(resp.confirm_id).toBeUndefined();
  });

  it('handles help command', () => {
    const cmd: BotCommand = { bot: 'SpecBot', action: 'help', args: {}, raw: 'SpecBot: help' };
    const resp = routeCommand(cmd);
    expect(resp.message).toContain('SpecBot commands');
    expect(resp.result).toContain('ingest');
  });

  it('handles version command', () => {
    const cmd: BotCommand = { bot: 'ImplBot', action: 'version', args: {}, raw: 'ImplBot: version' };
    const resp = routeCommand(cmd);
    expect(resp.message).toContain('0.1.0');
  });
});

describe('getAllCommands', () => {
  it('returns commands for all three bots', () => {
    const cmds = getAllCommands();
    expect(cmds.SpecBot).toContain('ingest');
    expect(cmds.ImplBot).toContain('regen');
    expect(cmds.PolicyBot).toContain('status');
  });
});
