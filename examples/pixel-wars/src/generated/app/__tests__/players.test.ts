import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlayerManager, MAX_PLAYERS, PAINT_COOLDOWN_MS } from '../players.js';

describe('PlayerManager', () => {
  let manager: PlayerManager;

  beforeEach(() => {
    manager = new PlayerManager();
    vi.useFakeTimers();
  });

  it('should generate unique 6-character hex player IDs', () => {
    const id1 = manager.generatePlayerId();
    const id2 = manager.generatePlayerId();
    
    expect(id1).toHaveLength(6);
    expect(id2).toHaveLength(6);
    expect(id1).not.toBe(id2);
    expect(/^[0-9a-f]{6}$/.test(id1)).toBe(true);
  });

  it('should accept players up to MAX_PLAYERS', () => {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      expect(manager.canAcceptPlayer()).toBe(true);
      const { error } = manager.addPlayer();
      expect(error).toBeNull();
    }
    
    expect(manager.canAcceptPlayer()).toBe(false);
  });

  it('should reject player when room is full', () => {
    for (let i = 0; i < MAX_PLAYERS; i++) {
      manager.addPlayer();
    }
    
    const { error } = manager.addPlayer();
    expect(error).toBe('room_full');
  });

  it('should assign teams round-robin', () => {
    const teams: string[] = [];
    for (let i = 0; i < 8; i++) {
      const { player } = manager.addPlayer();
      teams.push(player.team!);
    }
    
    // Should cycle through all 4 teams twice
    expect(teams.slice(0, 4)).toEqual(['red', 'blue', 'green', 'yellow']);
    expect(teams.slice(4, 8)).toEqual(['red', 'blue', 'green', 'yellow']);
  });

  it('should balance teams when players join at different times', () => {
    // Add 3 players
    const { player: p1 } = manager.addPlayer();
    const { player: p2 } = manager.addPlayer();
    const { player: p3 } = manager.addPlayer();
    
    expect(p1.team).toBe('red');
    expect(p2.team).toBe('blue');
    expect(p3.team).toBe('green');
    
    // Remove one player
    manager.removePlayer(p2.id);
    
    // New player should fill the gap (blue has fewest)
    const { player: p4 } = manager.addPlayer();
    expect(p4.team).toBe('blue');
  });

  it('should track player count', () => {
    const { player: p1 } = manager.addPlayer();
    manager.addPlayer();
    
    expect(manager.getPlayerCount()).toBe(2);
    
    manager.removePlayer(p1.id);
    expect(manager.getPlayerCount()).toBe(1);
  });

  it('should enforce 500ms paint cooldown', () => {
    const { player } = manager.addPlayer();
    
    // First paint should be allowed
    expect(manager.canPaint(player.id).allowed).toBe(true);
    
    // Record paint
    manager.recordPaint(player.id);
    
    // Immediate second paint should be rejected
    const cooldown = manager.canPaint(player.id);
    expect(cooldown.allowed).toBe(false);
    expect(cooldown.error).toBe('too_fast');
    expect(cooldown.remainingMs).toBeGreaterThan(0);
  });

  it('should allow paint after cooldown expires', () => {
    const { player } = manager.addPlayer();
    
    manager.recordPaint(player.id);
    
    // Advance time past cooldown
    vi.advanceTimersByTime(PAINT_COOLDOWN_MS + 10);
    
    expect(manager.canPaint(player.id).allowed).toBe(true);
  });

  it('should track paint cooldown progress', () => {
    const { player } = manager.addPlayer();
    
    expect(manager.getCooldownProgress(player.id)).toBe(1);
    
    manager.recordPaint(player.id);
    expect(manager.getCooldownProgress(player.id)).toBe(0);
    
    vi.advanceTimersByTime(PAINT_COOLDOWN_MS / 2);
    expect(manager.getCooldownProgress(player.id)).toBe(0.5);
  });

  it('should track total paints per player', () => {
    const { player } = manager.addPlayer();
    
    manager.recordPaint(player.id);
    manager.recordPaint(player.id);
    
    const updated = manager.getPlayer(player.id);
    expect(updated?.totalPaints).toBe(2);
  });
});
