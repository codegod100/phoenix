#!/usr/bin/env node
/**
 * Phoenix Status - Unified VCS diagnostics
 * 
 * This skill uses phoenix-vcs-core for status checking.
 * 
 * Usage: node .pi/skills/phoenix-status/status.js [project-root]
 */

import { getVCSStatus, formatVCSStatus } from '../phoenix-vcs-core/lib/status.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

const projectRoot = resolve(process.argv[2] || '.');

console.log('🔍 Phoenix VCS Status');
console.log(`   Project: ${projectRoot}\n`);

try {
  const state = await getVCSStatus(projectRoot);
  console.log(formatVCSStatus(state));
  
  process.exit(state.status === 'HEALTHY' ? 0 : 1);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
