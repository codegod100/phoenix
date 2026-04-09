/**
 * @phoenix-iu: 01d057d324fc5db4ffc40f3cec6b04ffc9833be7b622c00f6c649bc76cb9a0b5
 * @phoenix-name: Edit Domain
 * @phoenix-risk: MEDIUM
 */
/**
 * @phoenix-canon: a536745291c224a7ee908f2f7672f69eff41d093e5df72ffe9e3baad822a1994
 * Requirement: Users must be able to edit task properties including title, description, priority, deadline, and assignee
 * 
 * @phoenix-canon: 8ecb822028358db7eaf7d82456ff77cee5d77f187efec60dccfe05b17159c663
 * Requirement: Editing a task must update the updated_at timestamp automatically
 * 
 * @phoenix-canon: f2484cdfd8945abae50e8b306a557b69f720d0c3ee4ca9fd7f31635b2bfba3b7
 * Constraint: Form inputs must use autocomplete="off" attribute to disable browser autocomplete
 * 
 * @phoenix-canon: c3ae3e10e08be5758744246649d1bea7fdce031d31ac47369df8630f1a5de5e0
 * Requirement: The edit form must have save and cancel buttons with clear visual distinction
 * 
 * @phoenix-canon: 0b7df6f4e1fe1d968a3559e7d07db3f21582f792f851d466e389164bf84d5f5b
 * Requirement: Clicking cancel or saving must restore the task card view by hiding edit-form and showing card-content
 * 
 * Edit Domain - Risk Tier: medium
 */

import { Task, Priority, Status, updateTask } from "../app/store.js";

export type { Task, Priority, Status };

export interface EditData {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: Status;
  assignee?: string;
  deadline?: string;
  tags?: string[];
}

/**
 * Edit a task
 * @phoenix-canon: a536745291c224a7ee908f2f7672f69eff41d093e5df72ffe9e3baad822a1994
 * @phoenix-canon: 8ecb822028358db7eaf7d82456ff77cee5d77f187efec60dccfe05b17159c663
 */
export function edit(taskId: string, data: EditData): Task {
  return updateTask(taskId, data);
}

/**
 * Get edit form configuration with autocomplete=off
 * @phoenix-canon: f2484cdfd8945abae50e8b306a557b69f720d0c3ee4ca9fd7f31635b2bfba3b7
 */
export function getEditFormConfig(): {
  fields: { name: string; type: string; label: string; autocomplete: string }[];
  buttons: { name: string; label: string; class: string }[];
} {
  return {
    fields: [
      { name: "title", type: "text", label: "Title", autocomplete: "off" },
      { name: "description", type: "textarea", label: "Description", autocomplete: "off" },
      { name: "priority", type: "select", label: "Priority", autocomplete: "off" },
      { name: "status", type: "select", label: "Status", autocomplete: "off" },
      { name: "assignee", type: "text", label: "Assignee", autocomplete: "off" },
      { name: "deadline", type: "date", label: "Deadline", autocomplete: "off" }
    ],
    buttons: [
      { name: "save", label: "Save", class: "btn-success" },
      { name: "cancel", label: "Cancel", class: "btn-secondary" }
    ]
  };
}
