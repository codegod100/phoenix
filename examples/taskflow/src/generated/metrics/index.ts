/**
 * @phoenix-iu: 29eaf5668c0afbf2b769208fd17f84ced496eb6a0f13e1e54df2d3691d300624
 * @phoenix-name: Metrics Domain
 * @phoenix-risk: MEDIUM
 */
/**
 * @phoenix-canon: 41e8bd3b97654fa7ed32b4b9b4b3f2c2b85ff61b3054cef2d0283d250a38d0c8
 * Requirement: The system must track total tasks created, completed, and overdue
 * 
 * @phoenix-canon: d069da158b6cd930e997377f90a2f96b40747e292b7480319cda3bfdae743933
 * Requirement: The system must calculate average task completion time in hours
 * 
 * @phoenix-canon: e25f9b8a3fb3c23808eccf3c5b8afbe7b53363ea50dce2a666694018c89f73cb
 * Requirement: The system must compute throughput as tasks completed per day over a rolling 7-day window
 * 
 * @phoenix-canon: eb443327a877b7e3a462059e94fdd85254b3bdd24e47614888e33a5872bceae2
 * Requirement: The system must track total tasks created, completed, overdue, and archived
 * 
 * @phoenix-canon: 6fd3cccffb2620775ce5c7a8dd4f5956d9288e863ec9850fc119e8ba2e799299
 * Constraint: Metrics must be computable from an array of task records with no database dependency
 * 
 * Metrics Domain - Risk Tier: medium
 */

import { getMetrics, Metrics, TeamMetrics, getTeamMetrics } from "../app/store.js";

/**
 * Compute metrics from task data
 * @phoenix-canon: 6fd3cccffb2620775ce5c7a8dd4f5956d9288e863ec9850fc119e8ba2e799299
 */
export function computMetrics(input: any): Metrics {
  const metrics = getMetrics();
  
  if (input?.includeTeam !== false) {
    return {
      ...metrics,
      team: getTeamMetrics()
    } as any;
  }
  
  return metrics;
}

/**
 * Get team performance metrics
 * @phoenix-canon: 21a8432fc76f29827f911a3f936b58245aff878ec7b933c5d72d0b448aafa2b9
 * @phoenix-canon: c384544cc22649f48f3a8a7d872f4a27a96933210dd8b83059732202ad41d2a1
 * @phoenix-canon: 7b890674e3dd62f5f8ce67daa3fbf08173ddfb23c8d6440645db9b01018fd0a5
 */
export function computTeamMetrics(): TeamMetrics {
  return getTeamMetrics();
}
