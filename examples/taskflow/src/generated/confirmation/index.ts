/**
 * @phoenix-iu: 7bde30d9da55ca743d864a676fe373d504b50dca4598de3710c1705f2ccfd908
 * @phoenix-name: Confirmation Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: 796b4e363127435ffa54a5d186f8d4dd09fdda2877ce8880f5fec40d04e60587
 * Requirement: All confirmation dialogs must be custom modal overlays, not browser confirm or alert popups
 * 
 * @phoenix-canon: 12fb0edc1287a2f5f0e2542d08540a15133a389b11c319fca62ff187001cca20
 * Requirement: Deleting a task must require confirmation via a custom modal dialog, not browser confirm or alert
 * 
 * Confirmation Domain - Risk Tier: low
 */

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmClass?: string;
  isDanger?: boolean;
}

/**
 * Get delete confirmation options
 * @phoenix-canon: 796b4e363127435ffa54a5d186f8d4dd09fdda2877ce8880f5fec40d04e60587
 * @phoenix-canon: 12fb0edc1287a2f5f0e2542d08540a15133a389b11c319fca62ff187001cca20
 */
export function getDeleteConfirmationOptions(taskTitle: string): ConfirmationOptions {
  return {
    title: "Delete Task",
    message: `Are you sure you want to delete "${taskTitle}"? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    confirmClass: "btn-danger",
    isDanger: true
  };
}

/**
 * Get bulk delete confirmation options
 * @phoenix-canon: 796b4e363127435ffa54a5d186f8d4dd09fdda2877ce8880f5fec40d04e60587
 */
export function getBulkDeleteConfirmationOptions(count: number): ConfirmationOptions {
  return {
    title: "Delete Multiple Tasks",
    message: `Are you sure you want to delete ${count} selected tasks? This action cannot be undone.`,
    confirmText: "Delete All",
    cancelText: "Cancel",
    confirmClass: "btn-danger",
    isDanger: true
  };
}

/**
 * Get archive confirmation options
 */
export function getArchiveConfirmationOptions(taskTitle: string): ConfirmationOptions {
  return {
    title: "Archive Task",
    message: `Archive "${taskTitle}"? Archived tasks can be restored later.`,
    confirmText: "Archive",
    cancelText: "Cancel",
    confirmClass: "btn-secondary",
    isDanger: false
  };
}

/**
 * Get bulk archive confirmation options
 */
export function getBulkArchiveConfirmationOptions(count: number): ConfirmationOptions {
  return {
    title: "Archive Multiple Tasks",
    message: `Archive ${count} selected tasks?`,
    confirmText: "Archive All",
    cancelText: "Cancel",
    confirmClass: "btn-secondary",
    isDanger: false
  };
}
