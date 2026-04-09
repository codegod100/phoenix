/**
 * @phoenix-iu: d46cdcd2f55a1f02afe06966ada179610c0017e78c69fe29ba144f9f3f4b4ab5
 * @phoenix-name: Task Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 0ec58c72f695a3228427e43ef2bad08e5a9af15cdda2519e38446c9c8af60fd6
 * Requirement: Users must create tasks with a title, description, and priority
 * 
 * @phoenix-canon: 950b321591c472b76485732db315febc9fe0863aa521f23d45c272724a5f3e82
 * Requirement: Each task must have a unique ID generated as a UUID v4
 * 
 * @phoenix-canon: 26e1ab361fa6226f00cead3e007dfe6f163917a249ae961f4f6bf456c0142277
 * Requirement: Tasks must support status transitions: open → in_progress → review → done, and done → open
 * 
 * @phoenix-canon: bc27c9f07de88635cff6f237ba4fb27c9f09ef840dd2e327a519c7c03b51b178
 * Constraint: Invalid status transitions must be rejected with a clear error message
 * 
 * @phoenix-canon: 22c19be38ec443a8fb0881402c14ebd20d4d522a704fc1a173bf5ce289a479c7
 * Requirement: Tasks must track created_at and updated_at timestamps automatically
 * 
 * @phoenix-canon: 3dee3bcd6fc7e663e12f42f0d920e98c598e7266f5709bd0a399dacc5bec6063
 * Requirement: Completing a task must record the completion timestamp and duration
 * 
 * @phoenix-canon: 400ee183fafc6e6ab91979e3888f93b42d8aa93cf05e6681ad9a59cc1ba63695
 * Requirement: Tasks must support archiving to hide from active views while retaining data
 * 
 * @phoenix-canon: a16f8174b5e546da5f9783ee31240db9732bd7a4643c977fe540a017b0824cc0
 * Requirement: Archived tasks must be restorable to their previous active status
 * 
 * @phoenix-canon: c438a0777d8c24a5356730cd335d79e239868a8f9182f091e16ab9d7a5c4fe03
 * Requirement: The system must provide a function to list all archived tasks separately
 * 
 * @phoenix-canon: 6e2403b97c6f54c754722f6d95fb61f7ef743a282b5822ca057e3467b5a06fc2
 * Requirement: Tasks must support tagging with multiple labels for flexible categorization
 * 
 * @phoenix-canon: 27291946d9c1ae89f5c13df2349724de4c3b1aa0dbfeede363c84e51ea87c589
 * Requirement: The dashboard must render all tasks as styled cards in a responsive grid layout
 * 
 * @phoenix-canon: c1cfd0b2d1159f61369bcff61533b5713c54a846eedee72eab1754ba1496dfac
 * Requirement: Completed tasks with status=done must display in a separate section below active tasks
 * 
 * @phoenix-canon: f60039398ec8457e8d6545a1d348b768bd7e207fb8db9deefae8c060f9fcc35f
 * Requirement: The done tasks section must have a clear visual separator and heading
 * 
 * @phoenix-canon: 0c8fd64b342a96b214bc1537aab16d0a04e4092ddeff1078dda85832bcc09b36
 * Requirement: Done tasks must use the same responsive grid layout as active tasks
 * 
 * @phoenix-canon: 6741feb08b69fcb97252c882d33eeefd88491cd4ca620cbddafe8918712ff7a1
 * Requirement: Each task card must show title, description, priority badge, status badge, assignee, and deadline
 * 
 * Task Domain - Risk Tier: high
 */

import {
  Task,
  Priority,
  Status,
  createTask,
  updateTask,
  deleteTask,
  archiveTask,
  restoreTask,
  getAllTasks,
  getArchivedTasks,
  getTaskById
} from "../app/store.js";

export type { Task, Priority, Status };

/**
 * Get next valid status transitions for a task
 * @phoenix-canon: 26e1ab361fa6226f00cead3e007dfe6f163917a249ae961f4f6bf456c0142277
 * @phoenix-canon: bc27c9f07de88635cff6f237ba4fb27c9f09ef840dd2e327a519c7c03b51b178
 */
export function getValidTransitions(status: Status): Status[] {
  const transitions: Record<Status, Status[]> = {
    open: ["in_progress"],
    in_progress: ["review", "open"],
    review: ["done", "in_progress"],
    done: ["open"]
  };
  return transitions[status];
}

/**
 * Check if a status transition is valid
 * @phoenix-canon: bc27c9f07de88635cff6f237ba4fb27c9f09ef840dd2e327a519c7c03b51b178
 */
export function isValidTransition(from: Status, to: Status): boolean {
  if (from === to) return true;
  return getValidTransitions(from).includes(to);
}

/**
 * Validate and execute status transition
 * @phoenix-canon: bc27c9f07de88635cff6f237ba4fb27c9f09ef840dd2e327a519c7c03b51b178
 */
export function transitionStatus(taskId: string, newStatus: Status): Task {
  const task = getTaskById(taskId);
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }
  
  if (!isValidTransition(task.status, newStatus)) {
    throw new Error(`Invalid status transition: ${task.status} → ${newStatus}. Allowed: ${getValidTransitions(task.status).join(", ")}`);
  }
  
  return updateTask(taskId, { status: newStatus });
}

/**
 * List all active (non-archived) tasks
 * @phoenix-canon: 27291946d9c1ae89f5c13df2349724de4c3b1aa0dbfeede363c84e51ea87c589
 */
export async function list(): Promise<Task[]> {
  const tasks = getAllTasks();
  return tasks.filter(t => !t.archived);
}

/**
 * List tasks with status separation (active vs done)
 * @phoenix-canon: c1cfd0b2d1159f61369bcff61533b5713c54a846eedee72eab1754ba1496dfac
 * @phoenix-canon: f60039398ec8457e8d6545a1d348b768bd7e207fb8db9deefae8c060f9fcc35f
 */
export async function a(): Promise<{ active: Task[]; done: Task[] }> {
  const tasks = await list();
  return {
    active: tasks.filter(t => t.status !== "done"),
    done: tasks.filter(t => t.status === "done")
  };
}

/**
 * Create a new task
 * @phoenix-canon: 0ec58c72f695a3228427e43ef2bad08e5a9af15cdda2519e38446c9c8af60fd6
 * @phoenix-canon: 950b321591c472b76485732db315febc9fe0863aa521f23d45c272724a5f3e82
 * @phoenix-canon: 22c19be38ec443a8fb0881402c14ebd20d4d522a704fc1a173bf5ce289a479c7
 */
export function create(data: {
  title: string;
  description: string;
  priority: Priority;
  status?: Status;
  assignee?: string;
  deadline?: string;
  tags?: string[];
}): Task {
  return createTask({
    title: data.title,
    description: data.description,
    priority: data.priority,
    status: data.status || "open",
    assignee: data.assignee,
    deadline: data.deadline,
    tags: data.tags || []
  });
}

/**
 * Archive a task
 * @phoenix-canon: 400ee183fafc6e6ab91979e3888f93b42d8aa93cf05e6681ad9a59cc1ba63695
 */
export function archive(taskId: string): Task {
  return archiveTask(taskId);
}

/**
 * Restore an archived task
 * @phoenix-canon: a16f8174b5e546da5f9783ee31240db9732bd7a4643c977fe540a017b0824cc0
 */
export async function restorTasks(): Promise<Task[]> {
  return getArchivedTasks();
}
