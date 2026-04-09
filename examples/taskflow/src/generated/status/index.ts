/**
 * @phoenix-iu: 9042fe4f437f6cc14ecb734ea5f25f7478a8725702d5fd517b429195384cfb2f
 * @phoenix-name: Status Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 1d9ff4151b5a5b10cca7d451c400e5c843b21190a8e405a30234cce11f4bfd7f
 * Requirement: The dashboard must include a compact status bar showing key metrics inline
 * 
 * @phoenix-canon: 06236ca2480f22d79e55d3897d1fbf1452c587f55bba58cc01d3ff00a514d21f
 * Requirement: The status bar must render as a single horizontal bar below the header
 * 
 * @phoenix-canon: e5d2dfbce7cc632a2f2993a8097ec1118b42a2d0418d1138e523de287898bd40
 * Requirement: The status bar must be visually compact with max 48px height and minimal padding
 * 
 * @phoenix-canon: 5e9d6248b4c495f8f5a2d27ca40ef82951bbf03e1dde46977b6f213f614dbcc2
 * Requirement: The status bar must be centered horizontally and only as wide as its content
 * 
 * @phoenix-canon: ec926319c637eac449d0d0a21080b837fd7ca932b1dda995915b466d0133af2f
 * Constraint: The status bar must not consume vertical space like the previous metric cards design
 * 
 * @phoenix-canon: e5d9fbf05dfb89e997652537e35e81c92ca4cd34307312b413f9a9aef43a7658
 * Requirement: The status bar must display total tasks count, completed count, overdue count, archived count, and completion rate percentage
 * 
 * @phoenix-canon: 3fbf0135a9600a387d7676561212c31b9e2b63702f681a449256338d58fac410
 * Requirement: Metrics must be displayed inline with simple separators such as bullet or pipe
 * 
 * @phoenix-canon: 8394b9997e084961310291dae157d88b4b21367769b8233c48ce6a01a9103521
 * Requirement: Format example is 12 tasks, 8 done, 2 overdue, 3 archived, 67% completion rate
 * 
 * @phoenix-canon: 8f060feffe64cbffad3795adf5a90b48d1c31c29c405dfb9d7eefe46b3802b00
 * Requirement: Use subtle text colors with primary metric values in ctp-text and labels in ctp-subtext0
 * 
 * @phoenix-canon: 23d13da966e4563b98584e737c0ae5f19dc6ee81176874eb3a697e85ead0e69a
 * Constraint: No emoji icons larger than the text itself, no card backgrounds, no hover effects
 * 
 * @phoenix-canon: 04863c16775d3737e0e987d41dbe4dae1b05795e9778fc80914ae6d33dddcde5
 * Requirement: Each card must have buttons for status transitions based on current status
 * 
 * @phoenix-canon: dc96fbc84d80cf0cfe1a8dc73708ba0ef09a6c20ab40c050757cdbb249a9c315
 * Requirement: Status badges must be color-coded with open=gray, in_progress=blue, review=purple, done=green
 * 
 * Status Domain - Risk Tier: high
 */

import { Status, getMetrics, transitionStatus, Task } from "../app/store.js";

export type { Status };

export interface StatusBarData {
  total: number;
  completed: number;
  overdue: number;
  archived: number;
  completionRate: number;
}

/**
 * Get status bar metrics
 * @phoenix-canon: e5d9fbf05dfb89e997652537e35e81c92ca4cd34307312b413f9a9aef43a7658
 */
export function getStatusBarData(): StatusBarData {
  const metrics = getMetrics();
  return {
    total: metrics.total,
    completed: metrics.completed,
    overdue: metrics.overdue,
    archived: metrics.archived,
    completionRate: metrics.completionRate
  };
}

/**
 * Format status bar text
 * @phoenix-canon: 8394b9997e084961310291dae157d88b4b21367769b8233c48ce6a01a9103521
 * @phoenix-canon: 3fbf0135a9600a387d7676561212c31b9e2b63702f681a449256338d58fac410
 */
export function formatStatusBar(data: StatusBarData): string {
  return `${data.total} tasks · ${data.completed} done · ${data.overdue} overdue · ${data.archived} archived · ${data.completionRate}% completion rate`;
}

/**
 * Get status display info
 * @phoenix-canon: dc96fbc84d80cf0cfe1a8dc73708ba0ef09a6c20ab40c050757cdbb249a9c315
 * @phoenix-canon: 894211f4ec8a7d51cc0951a9c45d3b1efb6817e90587121e99bed051a67895bc
 */
export function getStatusDisplay(status: Status): { label: string; color: string; cssClass: string } {
  const displays: Record<Status, { label: string; color: string; cssClass: string }> = {
    open: { label: "Open", color: "#6c7086", cssClass: "status-open" },
    in_progress: { label: "In Progress", color: "#89b4fa", cssClass: "status-in-progress" },
    review: { label: "Review", color: "#cba6f7", cssClass: "status-review" },
    done: { label: "Done", color: "#a6e3a1", cssClass: "status-done" }
  };
  return displays[status];
}

/**
 * Get valid next statuses for transitions
 * @phoenix-canon: 04863c16775d3737e0e987d41dbe4dae1b05795e9778fc80914ae6d33dddcde5
 */
export function getNextStatuses(status: Status): { value: Status; label: string }[] {
  const transitions: Record<Status, { value: Status; label: string }[]> = {
    open: [{ value: "in_progress", label: "Start" }],
    in_progress: [
      { value: "review", label: "Submit for Review" },
      { value: "open", label: "Back to Open" }
    ],
    review: [
      { value: "done", label: "Complete" },
      { value: "in_progress", label: "Back to Progress" }
    ],
    done: [{ value: "open", label: "Reopen" }]
  };
  return transitions[status];
}

/**
 * Execute status transition
 * @phoenix-canon: 04863c16775d3737e0e987d41dbe4dae1b05795e9778fc80914ae6d33dddcde5
 * @phoenix-canon: 3cabdbbabcf6cedcab4805c3ea9e684e7962022be4b42aaf2fb1b03e02839047
 */
export function transitionTaskStatus(taskId: string, newStatus: Status): Task {
  return transitionStatus(taskId, newStatus);
}

/**
 * Check if task can transition to a specific status
 */
export function canTransition(taskId: string, newStatus: Status): boolean {
  const { getTaskById } = require("../app/store.js");
  const task = getTaskById(taskId);
  if (!task) return false;
  
  const valid = {
    open: ["in_progress"],
    in_progress: ["review", "open"],
    review: ["done", "in_progress"],
    done: ["open"]
  };
  
  return (valid as Record<string, Status[]>)[task.status].includes(newStatus);
}
