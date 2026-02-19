import { EventEmitter } from 'node:events';

export interface Player {
  id: string;
  teamColor: 'red' | 'blue';
  cellsPainted: number;
  connectionTime: number;
}

export interface RoomState {
  players: Map<string, Player>;
  redTeamCells: number;
  blueTeamCells: number;
  maxPlayers: number;
}

export interface RoomEvents {
  player_joined: (player: Player) => void;
  player_left: (playerId: string) => void;
  cells_updated: (playerId: string, newCount: number) => void;
  room_full: (playerId: string) => void;
}

export class GameRoom extends EventEmitter {
  private state: RoomState;

  constructor() {
    super();
    this.state = {
      players: new Map(),
      redTeamCells: 0,
      blueTeamCells: 0,
      maxPlayers: 20,
    };
  }

  public addPlayer(playerId: string): Player | null {
    if (this.state.players.size >= this.state.maxPlayers) {
      this.emit('room_full', playerId);
      return null;
    }

    if (this.state.players.has(playerId)) {
      return this.state.players.get(playerId)!;
    }

    const teamColor = this.assignTeamColor();
    const player: Player = {
      id: playerId,
      teamColor,
      cellsPainted: 0,
      connectionTime: Date.now(),
    };

    this.state.players.set(playerId, player);
    this.emit('player_joined', player);
    return player;
  }

  public removePlayer(playerId: string): boolean {
    const player = this.state.players.get(playerId);
    if (!player) {
      return false;
    }

    this.state.players.delete(playerId);
    
    // Update team totals
    if (player.teamColor === 'red') {
      this.state.redTeamCells -= player.cellsPainted;
    } else {
      this.state.blueTeamCells -= player.cellsPainted;
    }

    this.emit('player_left', playerId);
    return true;
  }

  public updatePlayerCells(playerId: string, newCellCount: number): boolean {
    const player = this.state.players.get(playerId);
    if (!player) {
      return false;
    }

    const oldCount = player.cellsPainted;
    const difference = newCellCount - oldCount;

    player.cellsPainted = newCellCount;

    // Update team totals
    if (player.teamColor === 'red') {
      this.state.redTeamCells += difference;
    } else {
      this.state.blueTeamCells += difference;
    }

    this.emit('cells_updated', playerId, newCellCount);
    return true;
  }

  public getPlayer(playerId: string): Player | undefined {
    return this.state.players.get(playerId);
  }

  public getPlayerCount(): number {
    return this.state.players.size;
  }

  public getTeamCounts(): { red: number; blue: number } {
    return {
      red: this.state.redTeamCells,
      blue: this.state.blueTeamCells,
    };
  }

  public getAllPlayers(): Player[] {
    return Array.from(this.state.players.values());
  }

  public isFull(): boolean {
    return this.state.players.size >= this.state.maxPlayers;
  }

  private assignTeamColor(): 'red' | 'blue' {
    let redCount = 0;
    let blueCount = 0;

    for (const player of this.state.players.values()) {
      if (player.teamColor === 'red') {
        redCount++;
      } else {
        blueCount++;
      }
    }

    return redCount <= blueCount ? 'red' : 'blue';
  }
}

export const globalRoom = new GameRoom();

export function joinGlobalRoom(playerId: string): { success: boolean; player?: Player; error?: string } {
  if (globalRoom.isFull()) {
    return {
      success: false,
      error: 'room_full',
    };
  }

  const player = globalRoom.addPlayer(playerId);
  if (!player) {
    return {
      success: false,
      error: 'room_full',
    };
  }

  return {
    success: true,
    player,
  };
}

export function leaveGlobalRoom(playerId: string): boolean {
  return globalRoom.removePlayer(playerId);
}

export function updatePlayerProgress(playerId: string, cellsPainted: number): boolean {
  return globalRoom.updatePlayerCells(playerId, cellsPainted);
}

export function getRoomStats(): {
  playerCount: number;
  maxPlayers: number;
  teamCounts: { red: number; blue: number };
} {
  return {
    playerCount: globalRoom.getPlayerCount(),
    maxPlayers: 20,
    teamCounts: globalRoom.getTeamCounts(),
  };
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '7c35bfefd6f339577c02cbc4ac3445367375ff8cd6c1a8843b0bd336c4c4bd51',
  name: 'Rooms',
  risk_tier: 'high',
  canon_ids: [3 as const],
} as const;