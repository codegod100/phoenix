/**
 * @phoenix-iu: a71840711883fbadc80665b28f2172f7a65a116dee522018b85b0f88d9b9c527
 * @phoenix-name: Create Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: 2e61381676836dee1acf7d2af57c6de6f850122c4c1c37a16893a4effbc91b95
 * Requirement: The page must include a form to create new tasks with fields for title, description, priority dropdown, and optional deadline date
 * 
 * @phoenix-canon: 65cf841d09b215abbd9d4e43ae8b39c6f4d3468fea5683981fde61359b33cc71
 * Constraint: The create form must validate that title is non-empty before submission
 * 
 * @phoenix-canon: 2cbb70950a51c496ab86595836fa293c8a9a6bc704915fe733a576a9d2390cdf
 * Constraint: Create form inputs must use autocomplete="off" attribute to disable browser autocomplete
 * 
 * @phoenix-canon: 2623171ed71406b752f533e36d98a51aaeae33debc89a4ba03d89cd6ed7f7713
 * Requirement: Form submit events shall validate input, write to localStorage, then call render functions
 * 
 * @phoenix-canon: 3b3b6ce2da6dcd2ad6576b630478b6e2bf372a5f9a5b8cc20224289d6822fe05
 * Requirement: The create form shall append new tasks to localStorage and trigger task grid re-render
 * 
 * Create Domain - Risk Tier: low
 */

import { createTask, Priority, Status, Task } from "../app/store.js";

export type { Priority, Status, Task };

export interface CreateTaskData {
  title: string;
  description: string;
  priority: Priority;
  status?: Status;
  assignee?: string;
  deadline?: string;
  tags?: string[];
}

/**
 * Create a new task with validation
 * @phoenix-canon: 2e61381676836dee1acf7d2af57c6de6f850122c4c1c37a16893a4effbc91b95
 * @phoenix-canon: 65cf841d09b215abbd9d4e43ae8b39c6f4d3468fea5683981fde61359b33cc71
 * @phoenix-canon: 2623171ed71406b752f533e36d98a51aaeae33debc89a4ba03d89cd6ed7f7713
 * @phoenix-canon: 3b3b6ce2da6dcd2ad6576b630478b6e2bf372a5f9a5b8cc20224289d6822fe05
 */
export function create(data: CreateTaskData): { success: boolean; task?: Task; error?: string } {
  // Validate title
  if (!data.title || data.title.trim() === "") {
    return { success: false, error: "Title is required" };
  }
  
  try {
    const task = createTask({
      title: data.title.trim(),
      description: data.description.trim(),
      priority: data.priority,
      status: data.status || "open",
      assignee: data.assignee?.trim() || undefined,
      deadline: data.deadline || undefined,
      tags: data.tags || []
    });
    
    return { success: true, task };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Get create form configuration
 * @phoenix-canon: 2e61381676836dee1acf7d2af57c6de6f850122c4c1c37a16893a4effbc91b95
 * @phoenix-canon: 2cbb70950a51c496ab86595836fa293c8a9a6bc704915fe733a576a9d2390cdf
 */
export function getCreateFormConfig(): {
  fields: { name: string; type: string; label: string; required: boolean; autocomplete: string }[];
  priorities: { value: Priority; label: string }[];
  statuses: { value: Status; label: string }[];
} {
  return {
    fields: [
      { name: "title", type: "text", label: "Title", required: true, autocomplete: "off" },
      { name: "description", type: "textarea", label: "Description", required: false, autocomplete: "off" },
      { name: "priority", type: "select", label: "Priority", required: true, autocomplete: "off" },
      { name: "assignee", type: "text", label: "Assignee", required: false, autocomplete: "off" },
      { name: "deadline", type: "date", label: "Deadline", required: false, autocomplete: "off" },
      { name: "tags", type: "text", label: "Tags (comma-separated)", required: false, autocomplete: "off" }
    ],
    priorities: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "critical", label: "Critical" }
    ],
    statuses: [
      { value: "open", label: "Open" },
      { value: "in_progress", label: "In Progress" },
      { value: "review", label: "Review" },
      { value: "done", label: "Done" }
    ]
  };
}
