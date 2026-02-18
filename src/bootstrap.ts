/**
 * Bootstrap State Machine
 *
 * Manages system lifecycle:
 *   BOOTSTRAP_COLD → BOOTSTRAP_WARMING → STEADY_STATE
 */

import type { DRateStatus } from './models/classification.js';
import { BootstrapState, DRateLevel } from './models/classification.js';

export class BootstrapStateMachine {
  private state: BootstrapState;
  private warmPassComplete: boolean = false;

  constructor(initialState: BootstrapState = BootstrapState.BOOTSTRAP_COLD) {
    this.state = initialState;
  }

  getState(): BootstrapState {
    return this.state;
  }

  /**
   * Signal that the warm pass (canonicalization + warm hashing) is complete.
   */
  markWarmPassComplete(): void {
    this.warmPassComplete = true;
    if (this.state === BootstrapState.BOOTSTRAP_COLD) {
      this.state = BootstrapState.BOOTSTRAP_WARMING;
    }
  }

  /**
   * Evaluate whether to transition to STEADY_STATE based on D-rate.
   */
  evaluateTransition(dRateStatus: DRateStatus): void {
    if (this.state === BootstrapState.BOOTSTRAP_WARMING) {
      // Need sufficient data and acceptable D-rate
      if (
        dRateStatus.total_count >= 10 &&
        (dRateStatus.level === DRateLevel.TARGET || dRateStatus.level === DRateLevel.ACCEPTABLE)
      ) {
        this.state = BootstrapState.STEADY_STATE;
      }
    }
  }

  /**
   * Check if D-rate alarms should be suppressed (during cold bootstrap).
   */
  shouldSuppressAlarms(): boolean {
    return this.state === BootstrapState.BOOTSTRAP_COLD;
  }

  /**
   * Check if severity should be downgraded (during warming).
   */
  shouldDowngradeSeverity(): boolean {
    return this.state === BootstrapState.BOOTSTRAP_WARMING;
  }

  /**
   * Serialize state for persistence.
   */
  toJSON(): { state: BootstrapState; warm_pass_complete: boolean } {
    return {
      state: this.state,
      warm_pass_complete: this.warmPassComplete,
    };
  }

  /**
   * Restore from serialized state.
   */
  static fromJSON(data: { state: BootstrapState; warm_pass_complete: boolean }): BootstrapStateMachine {
    const machine = new BootstrapStateMachine(data.state);
    machine.warmPassComplete = data.warm_pass_complete;
    return machine;
  }
}
