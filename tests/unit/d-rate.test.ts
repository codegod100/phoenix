import { describe, it, expect } from 'vitest';
import { DRateTracker } from '../../src/d-rate.js';
import { ChangeClass, DRateLevel } from '../../src/models/classification.js';

describe('DRateTracker', () => {
  it('reports TARGET for empty window', () => {
    const tracker = new DRateTracker();
    const status = tracker.getStatus();
    expect(status.rate).toBe(0);
    expect(status.level).toBe(DRateLevel.TARGET);
  });

  it('reports TARGET when no D classifications', () => {
    const tracker = new DRateTracker(10);
    for (let i = 0; i < 10; i++) {
      tracker.recordOne(ChangeClass.A);
    }
    const status = tracker.getStatus();
    expect(status.rate).toBe(0);
    expect(status.level).toBe(DRateLevel.TARGET);
  });

  it('reports TARGET for ≤5% D rate', () => {
    const tracker = new DRateTracker(100);
    for (let i = 0; i < 95; i++) tracker.recordOne(ChangeClass.A);
    for (let i = 0; i < 5; i++) tracker.recordOne(ChangeClass.D);
    const status = tracker.getStatus();
    expect(status.rate).toBe(0.05);
    expect(status.level).toBe(DRateLevel.TARGET);
  });

  it('reports ACCEPTABLE for 6-10% D rate', () => {
    const tracker = new DRateTracker(100);
    for (let i = 0; i < 92; i++) tracker.recordOne(ChangeClass.B);
    for (let i = 0; i < 8; i++) tracker.recordOne(ChangeClass.D);
    const status = tracker.getStatus();
    expect(status.rate).toBe(0.08);
    expect(status.level).toBe(DRateLevel.ACCEPTABLE);
  });

  it('reports WARNING for 11-15% D rate', () => {
    const tracker = new DRateTracker(100);
    for (let i = 0; i < 88; i++) tracker.recordOne(ChangeClass.C);
    for (let i = 0; i < 12; i++) tracker.recordOne(ChangeClass.D);
    const status = tracker.getStatus();
    expect(status.rate).toBe(0.12);
    expect(status.level).toBe(DRateLevel.WARNING);
  });

  it('reports ALARM for >15% D rate', () => {
    const tracker = new DRateTracker(100);
    for (let i = 0; i < 80; i++) tracker.recordOne(ChangeClass.A);
    for (let i = 0; i < 20; i++) tracker.recordOne(ChangeClass.D);
    const status = tracker.getStatus();
    expect(status.rate).toBe(0.20);
    expect(status.level).toBe(DRateLevel.ALARM);
  });

  it('respects rolling window size', () => {
    const tracker = new DRateTracker(10);
    // Fill window with D classifications
    for (let i = 0; i < 10; i++) tracker.recordOne(ChangeClass.D);
    expect(tracker.getStatus().rate).toBe(1.0);

    // Push out all D's with A's
    for (let i = 0; i < 10; i++) tracker.recordOne(ChangeClass.A);
    expect(tracker.getStatus().rate).toBe(0);
  });

  it('records batch classifications', () => {
    const tracker = new DRateTracker(10);
    const emptySignals = {
      norm_diff: 0, semhash_delta: false, context_cold_delta: false,
      term_ref_delta: 0, section_structure_delta: false, canon_impact: 0,
    };
    tracker.record([
      { change_class: ChangeClass.A, confidence: 1, signals: emptySignals },
      { change_class: ChangeClass.D, confidence: 0.3, signals: emptySignals },
    ]);
    const status = tracker.getStatus();
    expect(status.total_count).toBe(2);
    expect(status.d_count).toBe(1);
  });

  it('resets correctly', () => {
    const tracker = new DRateTracker(10);
    tracker.recordOne(ChangeClass.D);
    tracker.reset();
    expect(tracker.getStatus().total_count).toBe(0);
  });
});
