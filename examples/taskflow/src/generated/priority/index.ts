/**
 * @phoenix-iu: 7cce149b135824bc8b6f060046f0731ce1f983a325ed1d93b2271e736127e143
 * @phoenix-name: Priority Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: dbd7a98a77dd81992b3e976344356563f1c45bfe3b5ef93bb594ef85341ee436
 * Requirement: The system must report task count grouped by priority level
 * 
 * @phoenix-canon: 1e36aa90a520ec5fa214975a3b3162ce7cd1330d11209c95413de79ab2f1f0c9
 * Requirement: The system must report task count grouped by current status
 * 
 * @phoenix-canon: c302c6dc31cbe2f0c5e1878a9b5c5d2669dcca2dc6c99dfa85e2de40ded3f683
 * Requirement: Each breakdown must include percentage of total
 * 
 * @phoenix-canon: ed4b8264171a7006e90435b07d66972b0cdc3260b0daa15a4c356a4c694390ee
 * Definition: Priority critical is f38ba8 red, high is fab387 peach, medium is f9e2af yellow, low is a6e3a1 green
 * 
 * Priority Domain - Risk Tier: low
 */

import { Priority, getMetrics, getAllTasks } from "../app/store.js";

export interface PriorityBreakdown {
  critical: { count: number; percentage: number };
  high: { count: number; percentage: number };
  medium: { count: number; percentage: number };
  low: { count: number; percentage: number };
}

/**
 * Get priority breakdown with counts and percentages
 * @phoenix-canon: dbd7a98a77dd81992b3e976344356563f1c45bfe3b5ef93bb594ef85341ee436
 * @phoenix-canon: c302c6dc31cbe2f0c5e1878a9b5c5d2669dcca2dc6c99dfa85e2de40ded3f683
 */
export function getPriorityBreakdown(): PriorityBreakdown {
  const metrics = getMetrics();
  return metrics.priorityBreakdown as PriorityBreakdown;
}

/**
 * Get CSS color for priority
 * @phoenix-canon: ed4b8264171a7006e90435b07d66972b0cdc3260b0daa15a4c356a4c694390ee
 */
export function getPriorityColor(priority: Priority): string {
  const colors: Record<Priority, string> = {
    critical: "#f38ba8",
    high: "#fab387",
    medium: "#f9e2af",
    low: "#a6e3a1"
  };
  return colors[priority];
}

/**
 * Get CSS class for priority badge
 */
export function getPriorityClass(priority: Priority): string {
  return `priority-${priority}`;
}

/**
 * Priority order for sorting (critical first)
 */
export const priorityOrder: Record<Priority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};
