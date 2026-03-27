/**
 * Architecture Registry — built-in architecture targets.
 */

import type { Architecture } from '../models/architecture.js';
import { sqliteWebApi } from './sqlite-web-api.js';

const ARCHITECTURES: Record<string, Architecture> = {
  'sqlite-web-api': sqliteWebApi,
};

export function getArchitecture(name: string): Architecture | null {
  return ARCHITECTURES[name] ?? null;
}

export function listArchitectures(): string[] {
  return Object.keys(ARCHITECTURES);
}
