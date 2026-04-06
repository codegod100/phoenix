/**
 * PlayerManager - High Tier IU
 * Manages player connections, team assignment, and cooldown tracking
 * 
 * Generated from canonical nodes:
 * - team_assignment_logic
 * - player_tracking
 * - connection_limits
 * - paint_cooldown
 */

import { TeamColor, TEAM_COLORS } from './game-state.js';

export interface Player {
  id: string;
  team: TeamColor;
  lastPaintTime: number;
  totalPaints: number;
  connectedAt: number;
}

export const MAX_PLAYERS = 20;
export const PAINT_COOLDOWN_MS = 500;

export type PaintError = 'too_fast' | 'room_full' | null;

export class PlayerManager {
  private players = new Map<string, Player>();
  private teamAssignmentIndex = 0;

  generatePlayerId(): string {
    return Math.random().toString(16).slice(2, 8);
  }

  canAcceptPlayer(): boolean {
    return this.players.size < MAX_PLAYERS;
  }

  addPlayer(): { player: Player; error: PaintError } {
    if (!this.canAcceptPlayer()) {
      return { player: null as unknown as Player, error: 'room_full' };
    }

    const id = this.generatePlayerId();
    const team = this.assignTeam();
    
    const player: Player = {
      id,
      team,
      lastPaintTime: 0,
      totalPaints: 0,
      connectedAt: Date.now(),
    };

    this.players.set(id, player);
    return { player, error: null };
  }

  removePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (player) {
      this.players.delete(playerId);
      return true;
    }
    return false;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getTeamCounts(): Map<TeamColor, number> {
    const counts = new Map<TeamColor, number>();
    for (const color of TEAM_COLORS) {
      if (color) counts.set(color, 0);
    }
    
    for (const player of this.players.values()) {
      if (player.team) {
        const count = counts.get(player.team) || 0;
        counts.set(player.team, count + 1);
      }
    }
    
    return counts;
  }

  private assignTeam(): TeamColor {
    const counts = this.getTeamCounts();
    let minCount = Infinity;
    let selectedTeam: TeamColor = 'red';

    for (const [color, count] of counts) {
      if (color && count < minCount) {
        minCount = count;
        selectedTeam = color;
      }
    }

    return selectedTeam;
  }

  canPaint(playerId: string): { allowed: boolean; error: PaintError; remainingMs: number } {
    const player = this.players.get(playerId);
    if (!player) {
      return { allowed: false, error: null, remainingMs: 0 };
    }

    const now = Date.now();
    const elapsed = now - player.lastPaintTime;
    
    if (elapsed < PAINT_COOLDOWN_MS) {
      return {
        allowed: false,
        error: 'too_fast',
        remainingMs: PAINT_COOLDOWN_MS - elapsed,
      };
    }

    return { allowed: true, error: null, remainingMs: 0 };
  }

  recordPaint(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player) return false;

    player.lastPaintTime = Date.now();
    player.totalPaints++;
    return true;
  }

  getCooldownProgress(playerId: string): number {
    const player = this.players.get(playerId);
    if (!player) return 0;

    const now = Date.now();
    const elapsed = now - player.lastPaintTime;
    
    if (elapsed >= PAINT_COOLDOWN_MS) return 1;
    return elapsed / PAINT_COOLDOWN_MS;
  }

  cleanupDisconnected(maxAgeMs: number = 5000): string[] {
    const now = Date.now();
    const removed: string[] = [];
    
    for (const [id, player] of this.players) {
      // Note: In real implementation, this would check WebSocket connection state
      // For now, we rely on explicit removePlayer calls
    }
    
    return removed;
  }
}
