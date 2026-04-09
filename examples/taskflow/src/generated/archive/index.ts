/**
 * @phoenix-iu: fc1780770cf0e4875acfd0c016e8bb347bead2ba1f254b36d6c01057f4ae2844
 * @phoenix-name: Archive Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 81f910f80ba0c36bbe1f7fd8ee46d8cb43b6de784fc47718dfcb5460866e9bdd
 * Requirement: Archived tasks must be viewable via a separate Archived Tasks tab or filter
 * 
 * @phoenix-canon: 78f83d3cedc0462173adb8da727f867add0bad05a5d45efe2668ecca909164c0
 * Requirement: Switching between Active and Archived views must update the task list without a full page reload
 * 
 * @phoenix-canon: 79afe2985ea41923390bc2ff99a204f85d53ea666938103ecc3d6876a04ef244
 * Requirement: Archived tasks must be queryable separately and restorable to active status
 * 
 * @phoenix-canon: 0bfbf4eb8ef7052518e82aed8af3be904c9b78e05cf76ed64507298dcab5a301
 * Requirement: Users must be able to archive completed tasks to hide from active views but retain data
 * 
 * @phoenix-canon: 1cedce764142f7d8e0d2e01c0dbc6fca0c9b28d615770a15dac414e831c81b08
 * Requirement: Archived status must be visually indicated on the task card status badge with a muted or dim appearance
 * 
 * @phoenix-canon: 9cc63176bbc98e1ab3ad8be9a913b9f6b451c4473068156613f0a61a694ace0c
 * Requirement: Archived tasks must display an archived status badge when viewing the Active tab with dimmed style
 * 
 * @phoenix-canon: 0bbf6f693cec8cd4af0edfd28f8a8d27483d02a5887592084fbf87962caf1452
 * Requirement: When viewing the Archived tab, tasks show their original status with an archived indicator overlay
 * 
 * @phoenix-canon: dfcddaf1235efd740d25575a63bc5f2af99a3acd2859b9ec5ae7df397d8300df
 * Requirement: Archived tasks must be displayed in the same grid layout as active tasks
 * 
 * @phoenix-canon: 0dfbaefa54a56b657cabf062b67fa3dbba792cdca641f5c4c28f69198b76cd7f
 * Requirement: Archived task cards must have a restore button to reactivate them
 * 
 * Archive Domain - Risk Tier: high
 */

import {
  Task,
  getArchivedTasks,
  archiveTask,
  restoreTask
} from "../app/store.js";

/**
 * View archived tasks
 * @phoenix-canon: 81f910f80ba0c36bbe1f7fd8ee46d8cb43b6de784fc47718dfcb5460866e9bdd
 * @phoenix-canon: 79afe2985ea41923390bc2ff99a204f85d53ea666938103ecc3d6876a04ef244
 */
export async function viewTasks(): Promise<Task[]> {
  return getArchivedTasks();
}

/**
 * Query archived tasks (alias for viewTasks)
 */
export async function queryTasks(): Promise<Task[]> {
  return getArchivedTasks();
}

/**
 * Archive a task
 * @phoenix-canon: 0bfbf4eb8ef7052518e82aed8af3be904c9b78e05cf76ed64507298dcab5a301
 * @phoenix-canon: 62e720747aa357d97884ac5b9d7300f6bcb1f695223ed125f147b16fdc669a59
 */
export async function archive(taskId: string): Promise<Task> {
  return archiveTask(taskId);
}

/**
 * Restore an archived task
 * @phoenix-canon: 0dfbaefa54a56b657cabf062b67fa3dbba792cdca641f5c4c28f69198b76cd7f
 * @phoenix-canon: a16f8174b5e546da5f9783ee31240db9732bd7a4643c977fe540a017b0824cc0
 */
export function restore(taskId: string): Task {
  return restoreTask(taskId);
}

/**
 * Check if a task is archived
 */
export function isArchived(task: Task): boolean {
  return task.archived;
}

/**
 * Get archived status display
 * @phoenix-canon: 1cedce764142f7d8e0d2e01c0dbc6fca0c9b28d615770a15dac414e831c81b08
 * @phoenix-canon: 894211f4ec8a7d51cc0951a9c45d3b1efb6817e90587121e99bed051a67895bc
 */
export function getArchivedDisplay(): { label: string; color: string; cssClass: string } {
  return {
    label: "Archived",
    color: "#585b70",
    cssClass: "status-archived"
  };
}
