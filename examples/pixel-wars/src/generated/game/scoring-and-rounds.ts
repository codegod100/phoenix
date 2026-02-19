import { EventEmitter } from 'node:events';

export interface TeamScore {
  teamId: string;
  score: number;
  pixelsClaimed: number;
}

export interface RoundState {
  roundNumber: number;
  isActive: boolean;
  timeRemaining: number;
  duration: number;
  scores: Map<string, TeamScore>;
}

export interface RoundEndResult {
  roundNumber: number;
  finalScores: TeamScore[];
  winningTeam: TeamScore | null;
  duration: number;
}

export interface ScoringEvents {
  timeUpdate: (timeRemaining: number) => void;
  roundEnd: (result: RoundEndResult) => void;
  roundStart: (roundNumber: number) => void;
  scoreUpdate: (scores: TeamScore[]) => void;
}

export class ScoringSystem extends EventEmitter {
  private currentRound: RoundState;
  private roundTimer: NodeJS.Timeout | null = null;
  private broadcastTimer: NodeJS.Timeout | null = null;
  private newRoundTimer: NodeJS.Timeout | null = null;
  private readonly roundDuration: number;
  private readonly newRoundDelay: number = 10000;

  constructor(roundDurationMs: number = 300000) {
    super();
    this.roundDuration = roundDurationMs;
    this.currentRound = {
      roundNumber: 0,
      isActive: false,
      timeRemaining: 0,
      duration: roundDurationMs,
      scores: new Map()
    };
  }

  public startNewRound(): void {
    this.clearAllTimers();
    
    this.currentRound = {
      roundNumber: this.currentRound.roundNumber + 1,
      isActive: true,
      timeRemaining: this.roundDuration,
      duration: this.roundDuration,
      scores: new Map()
    };

    this.emit('roundStart', this.currentRound.roundNumber);
    this.startTimers();
  }

  public updateTeamScore(teamId: string, pixelsClaimed: number): void {
    if (!this.currentRound.isActive) return;

    const existingScore = this.currentRound.scores.get(teamId);
    const teamScore: TeamScore = {
      teamId,
      score: pixelsClaimed,
      pixelsClaimed
    };

    this.currentRound.scores.set(teamId, teamScore);
    this.emit('scoreUpdate', Array.from(this.currentRound.scores.values()));
  }

  public getCurrentRound(): RoundState {
    return { ...this.currentRound };
  }

  public isRoundActive(): boolean {
    return this.currentRound.isActive;
  }

  public getTimeRemaining(): number {
    return this.currentRound.timeRemaining;
  }

  public endRound(): void {
    if (!this.currentRound.isActive) return;

    this.clearAllTimers();
    this.currentRound.isActive = false;
    this.currentRound.timeRemaining = 0;

    const finalScores = Array.from(this.currentRound.scores.values())
      .sort((a, b) => b.score - a.score);

    const winningTeam = finalScores.length > 0 ? finalScores[0] : null;

    const result: RoundEndResult = {
      roundNumber: this.currentRound.roundNumber,
      finalScores,
      winningTeam,
      duration: this.currentRound.duration
    };

    this.emit('roundEnd', result);
    this.scheduleNewRound();
  }

  public stop(): void {
    this.clearAllTimers();
    this.currentRound.isActive = false;
  }

  private startTimers(): void {
    this.broadcastTimer = setInterval(() => {
      if (this.currentRound.isActive && this.currentRound.timeRemaining > 0) {
        this.currentRound.timeRemaining -= 1000;
        this.emit('timeUpdate', this.currentRound.timeRemaining);

        if (this.currentRound.timeRemaining <= 0) {
          this.endRound();
        }
      }
    }, 1000);
  }

  private scheduleNewRound(): void {
    this.newRoundTimer = setTimeout(() => {
      this.startNewRound();
    }, this.newRoundDelay);
  }

  private clearAllTimers(): void {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    if (this.newRoundTimer) {
      clearTimeout(this.newRoundTimer);
      this.newRoundTimer = null;
    }
  }
}

export function createScoringSystem(roundDurationMs?: number): ScoringSystem {
  return new ScoringSystem(roundDurationMs);
}

export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function calculateTeamRanking(scores: TeamScore[]): TeamScore[] {
  return [...scores].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.teamId.localeCompare(b.teamId);
  });
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '6713a6240993f5a4e289ac9af66e75624ca836131385994c5f7a1aa206ac7fee',
  name: 'Scoring and Rounds',
  risk_tier: 'medium',
  canon_ids: [4 as const],
} as const;