// Generated barrel export for TaskFlow dashboard
// Note: _phoenix exports are excluded from star exports to avoid naming conflicts

export type { Priority, Status, Task, AuditEntry, ArchivedTask } from './task-model.js';
export {
  generateUUID,
  createTask,
  canTransition,
  transitionStatus,
  assignTask,
  updateTask,
  archiveTask,
  restoreTask,
  isArchived,
  listArchived,
  listActive,
  searchTasks,
  filterTasks,
  sortTasks,
  isOverdue,
  listOverdue,
  validateDeadline,
} from './task-model.js';

export type { Metrics, PriorityBreakdown, StatusBreakdown, TeamPerformance } from './analytics.js';
export {
  calculateMetrics,
  getPriorityBreakdown,
  getStatusBreakdown,
  getTeamPerformance,
  getTopPerformer,
} from './analytics.js';

export { CATPPUCCIN_COLORS, PRIORITY_COLORS, STATUS_COLORS, generateCSS, renderDashboardPage } from './dashboard-page.js';

export {
  saveTasks,
  loadTasks,
  clearTasks,
  getNextStatuses,
  renderPriorityBadge,
  renderStatusBadge,
  isTaskOverdue,
  renderTaskCard,
  renderTaskGrid,
} from './dashboard-tasklist.js';

export { renderCreateForm, renderEditForm, setupInlineEditing } from './dashboard-edit.js';

export type { ViewMode } from './dashboard-archive.js';
export {
  renderArchiveTabs,
  renderArchivedStatusBadge,
  filterTasksByViewMode,
  renderArchiveView,
  setupArchiveHandlers,
} from './dashboard-archive.js';

export type { BulkSelection } from './dashboard-bulk.js';
export {
  createBulkSelection,
  toggleSelection,
  selectAll,
  clearSelection,
  isSelected,
  getSelectedCount,
  renderBulkActionBar,
  renderConfirmationModal,
  showModal,
  setupCheckboxHandlers,
  confirmDelete,
} from './dashboard-bulk.js';

export { renderStatusBar, renderCompactMetrics, renderAnalyticsBar } from './dashboard-analytics-bar.js';

// IU-9: Dashboard Integration - complete working dashboard
export { createIntegratedDashboard, IntegratedDashboard } from './dashboard-integration.js';
export type { DashboardConfig } from './dashboard-integration.js';

/** @internal Phoenix VCS traceability — aggregated exports. */
export const _phoenix_all = [
  { iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88', name: 'Task Domain Model' },
  { iu_id: 'a1b2c3d4e5f6789012345678abcdef9012345678', name: 'Analytics Engine' },
  { iu_id: 'b2c3d4e5f6789012345678abcdef901234567890', name: 'Dashboard Page & Theme' },
  { iu_id: 'c3d4e5f6789012345678abcdef90123456789012', name: 'Dashboard Task List' },
  { iu_id: 'd4e5f6789012345678abcdef9012345678901234', name: 'Dashboard Edit UI' },
  { iu_id: 'e5f6789012345678abcdef901234567890123456', name: 'Dashboard Archive UI' },
  { iu_id: 'f6789012345678abcdef90123456789012345678', name: 'Dashboard Bulk Operations' },
  { iu_id: '6789012345678abcdef9012345678901234567890', name: 'Dashboard Analytics Bar' },
] as const;
