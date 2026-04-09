/**
 * @phoenix-iu: 1b10421cf0b4c927ca339c223c9e2d9439707320ce17234c3001ec7c896a3cb7
 * @phoenix-name: Inline Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 56c320fc44633797ae3153f19cb1cb132c6e7095cdd82f0f0a80d350db28c9f4
 * Requirement: Each task card must have an edit button that replaces the card content with an edit form, not a modal dialog
 * 
 * @phoenix-canon: 11d42093d9e4ad83156a93fb917dd3fcc601d864266d651960ced28fdd73c215
 * Requirement: The edit form must appear in place of the task card content and contain pre-populated fields
 * 
 * @phoenix-canon: dad35101507fbcfc7dc8680f972f9940ab89b2130a8a9aa7cac5c5987b857186
 * Requirement: The card content must be wrapped in a card-content div that can be hidden via CSS display property
 * 
 * @phoenix-canon: ed55103ac8f56cdef2124b27ea6e9c33dbcedc0f6ebaf2bca425a8fa4bef3cb4
 * Requirement: The edit form must be a sibling element to the card-content div, not nested inside it
 * 
 * @phoenix-canon: 9b1a910870349540c9d01d0ba6347192a63d6141e89839bf9c00c59b177ae078
 * Requirement: Clicking edit must hide the card-content div and show the edit-form div using inline style display toggling
 * 
 * @phoenix-canon: 56c320fc44633797ae3153f19cb1cb132c6e7095cdd82f0f0a80d350db28c9f4
 * Requirement: Each task card must have an edit button
 * 
 * Inline Domain - Risk Tier: high
 */

import { Task, Priority, Status, updateTask } from "../app/store.js";

export type { Task, Priority, Status };

export interface InlineEditState {
  editingId: string | null;
  originalTask: Task | null;
}

/**
 * Toggle inline edit mode for a task card
 * @phoenix-canon: 9b1a910870349540c9d01d0ba6347192a63d6141e89839bf9c00c59b177ae078
 * @phoenix-canon: dad35101507fbcfc7dc8680f972f9940ab89b2130a8a9aa7cac5c5987b857186
 * @phoenix-canon: ed55103ac8f56cdef2124b27ea6e9c33dbcedc0f6ebaf2bca425a8fa4bef3cb4
 */
export function toggleInlineEdit(
  cardElement: HTMLElement,
  isEditing: boolean
): void {
  const contentDiv = cardElement.querySelector(".card-content") as HTMLElement;
  const editForm = cardElement.querySelector(".edit-form") as HTMLElement;
  
  if (contentDiv && editForm) {
    contentDiv.style.display = isEditing ? "none" : "block";
    editForm.style.display = isEditing ? "block" : "none";
  }
}

/**
 * Show edit form for a task
 * @phoenix-canon: 9b1a910870349540c9d01d0ba6347192a63d6141e89839bf9c00c59b177ae078
 */
export function showEditForm(cardElement: HTMLElement): void {
  toggleInlineEdit(cardElement, true);
}

/**
 * Hide edit form and show card content
 * @phoenix-canon: 9b1a910870349540c9d01d0ba6347192a63d6141e89839bf9c00c59b177ae078
 * @phoenix-canon: 0b7df6f4e1fe1d968a3559e7d07db3f21582f792f851d466e389164bf84d5f5b
 */
export function hideEditForm(cardElement: HTMLElement): void {
  toggleInlineEdit(cardElement, false);
}

/**
 * Save inline edits
 * @phoenix-canon: a731f6b43208397eaad60a9312cf10acd760afc578f3181cc364ed27e6235ae8
 * @phoenix-canon: 8ecb822028358db7eaf7d82456ff77cee5d77f187efec60dccfe05b17159c663
 */
export function saveInlineEdit(taskId: string, updates: Partial<Task>): Task {
  return updateTask(taskId, updates);
}

/**
 * Get edit form field configuration
 * @phoenix-canon: f2484cdfd8945abae50e8b306a557b69f720d0c3ee4ca9fd7f31635b2bfba3b7
 * @phoenix-canon: a536745291c224a7ee908f2f7672f69eff41d093e5df72ffe9e3baad822a1994
 */
export function getEditFormFields(): { name: string; type: string; label: string; autocomplete: string }[] {
  return [
    { name: "title", type: "text", label: "Title", autocomplete: "off" },
    { name: "description", type: "textarea", label: "Description", autocomplete: "off" },
    { name: "priority", type: "select", label: "Priority", autocomplete: "off" },
    { name: "status", type: "select", label: "Status", autocomplete: "off" },
    { name: "assignee", type: "text", label: "Assignee", autocomplete: "off" },
    { name: "deadline", type: "date", label: "Deadline", autocomplete: "off" }
  ];
}
