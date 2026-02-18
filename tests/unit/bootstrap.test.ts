import { describe, it, expect } from 'vitest';
import { BootstrapStateMachine } from '../../src/bootstrap.js';
import { BootstrapState, DRateLevel } from '../../src/models/classification.js';

describe('BootstrapStateMachine', () => {
  it('starts in BOOTSTRAP_COLD by default', () => {
    const machine = new BootstrapStateMachine();
    expect(machine.getState()).toBe(BootstrapState.BOOTSTRAP_COLD);
  });

  it('transitions COLD → WARMING on warm pass complete', () => {
    const machine = new BootstrapStateMachine();
    machine.markWarmPassComplete();
    expect(machine.getState()).toBe(BootstrapState.BOOTSTRAP_WARMING);
  });

  it('transitions WARMING → STEADY_STATE when D-rate is acceptable', () => {
    const machine = new BootstrapStateMachine();
    machine.markWarmPassComplete();
    machine.evaluateTransition({
      rate: 0.03,
      level: DRateLevel.TARGET,
      window_size: 100,
      d_count: 3,
      total_count: 100,
    });
    expect(machine.getState()).toBe(BootstrapState.STEADY_STATE);
  });

  it('stays WARMING when D-rate is too high', () => {
    const machine = new BootstrapStateMachine();
    machine.markWarmPassComplete();
    machine.evaluateTransition({
      rate: 0.20,
      level: DRateLevel.ALARM,
      window_size: 100,
      d_count: 20,
      total_count: 100,
    });
    expect(machine.getState()).toBe(BootstrapState.BOOTSTRAP_WARMING);
  });

  it('stays WARMING when insufficient data', () => {
    const machine = new BootstrapStateMachine();
    machine.markWarmPassComplete();
    machine.evaluateTransition({
      rate: 0,
      level: DRateLevel.TARGET,
      window_size: 100,
      d_count: 0,
      total_count: 5, // < 10 minimum
    });
    expect(machine.getState()).toBe(BootstrapState.BOOTSTRAP_WARMING);
  });

  it('suppresses alarms during COLD', () => {
    const machine = new BootstrapStateMachine();
    expect(machine.shouldSuppressAlarms()).toBe(true);
  });

  it('does not suppress alarms after COLD', () => {
    const machine = new BootstrapStateMachine();
    machine.markWarmPassComplete();
    expect(machine.shouldSuppressAlarms()).toBe(false);
  });

  it('downgrades severity during WARMING', () => {
    const machine = new BootstrapStateMachine();
    machine.markWarmPassComplete();
    expect(machine.shouldDowngradeSeverity()).toBe(true);
  });

  it('does not downgrade severity in STEADY_STATE', () => {
    const machine = new BootstrapStateMachine();
    machine.markWarmPassComplete();
    machine.evaluateTransition({
      rate: 0.02,
      level: DRateLevel.TARGET,
      window_size: 100,
      d_count: 2,
      total_count: 100,
    });
    expect(machine.shouldDowngradeSeverity()).toBe(false);
  });

  it('serializes and deserializes correctly', () => {
    const machine = new BootstrapStateMachine();
    machine.markWarmPassComplete();
    const json = machine.toJSON();
    const restored = BootstrapStateMachine.fromJSON(json);
    expect(restored.getState()).toBe(BootstrapState.BOOTSTRAP_WARMING);
  });
});
