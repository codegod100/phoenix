/**
 * @phoenix-iu: b25d38068f5a68a7e72a54568159d1e595758e1fbc22e51d023dd441e230607a
 * @phoenix-name: State Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 0afc29d57dce415015bb17016b29f473f6492a31ac7fa7dcb3fa88b6c3f8b806
 * Requirement: localStorage key 'taskflow_tasks' shall be the single source of truth for all components
 * 
 * @phoenix-canon: 4a49ae7c4ceb6b5a1ebfdf188d51adfeba7b84eb3ee76a711cde2ce0dc75d236
 * Requirement: All components shall read from localStorage on every render with no in-memory caching
 * 
 * @phoenix-canon: 01e92e240085650ce79c8f892dd65cf90a6023cec27b6e279ff4db589f9ec4d1
 * Requirement: Write operations shall complete before triggering re-render using synchronous flow
 * 
 * @phoenix-canon: f937d4a27dd9744f3620c63370f1d3cc23b53a15aad4916c8a95bda3e119e24f
 * Requirement: State mutations shall include updated_at timestamp automatically
 * 
 * @phoenix-canon: bb1e6cc7b2c8067d47805331c0ddb0bcc4fd090bcfeb2d907b65476d657d7dfd
 * Requirement: Archived tasks shall retain all original data plus archived boolean and archived_at timestamp
 * 
 * State Domain - Risk Tier: high
 */

export const STORAGE_KEY = "taskflow_tasks";

/**
 * State change types
 */
export type StateChangeType = 
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ARCHIVE"
  | "RESTORE"
  | "BULK_DELETE"
  | "BULK_ARCHIVE"
  | "BULK_RESTORE";

export interface StateChangeEvent {
  type: StateChangeType;
  taskIds: string[];
  timestamp: string;
}

/**
 * Dispatch state change event
 * @phoenix-canon: 01e92e240085650ce79c8f892dd65cf90a6023cec27b6e279ff4db589f9ec4d1
 * @phoenix-canon: 5a52732aa411c4ba9de24b7dde1093ed95ccb949e55483c9ee62accff2138900
 */
export function dispatchStateChange(type: StateChangeType, taskIds: string[]): void {
  const event: StateChangeEvent = {
    type,
    taskIds,
    timestamp: new Date().toISOString()
  };
  
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("taskflow:statechange", { detail: event }));
  }
}

/**
 * Subscribe to state changes
 * @phoenix-canon: 4a49ae7c4ceb6b5a1ebfdf188d51adfeba7b84eb3ee76a711cde2ce0dc75d236
 */
export function subscribeToStateChanges(callback: (event: StateChangeEvent) => void): () => void {
  if (typeof window === "undefined") return () => {};
  
  const handler = (e: CustomEvent) => callback(e.detail as StateChangeEvent);
  window.addEventListener("taskflow:statechange", handler as EventListener);
  
  return () => {
    window.removeEventListener("taskflow:statechange", handler as EventListener);
  };
}

/**
 * Get storage key
 * @phoenix-canon: 0afc29d57dce415015bb17016b29f473f6492a31ac7fa7dcb3fa88b6c3f8b806
 */
export function getStorageKey(): string {
  return STORAGE_KEY;
}

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  return typeof localStorage !== "undefined";
}
