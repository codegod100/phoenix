/**
 * @phoenix-iu: fa4c83036ec9c9a9dc5d827a93eb8e8e6683bdb93cd99c0bd5a730ef789481e7
 * @phoenix-name: UI Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 93e81a349be59a7f7768fdc9ca00f49df78a974de9bb0c017cb29689ca6e4847
 * Requirement: The create form and task grid shall render side by side in a two-column layout on desktop
 * 
 * @phoenix-canon: 7f65243582eeec6211a30c259ffd69f8774ab863d0df9b45dd3a49f795f7fed0
 * Requirement: The create form and task grid module containers shall align at the exact same top edge
 * 
 * @phoenix-canon: a57321f9ffae57af24b007b4cb584a142bfd60e65075589f87c5e035f6eea7e9
 * Requirement: Both module headers with h2 titles shall have identical margin, padding, and line-height
 * 
 * @phoenix-canon: 06083503e7868530fa9d6a146f977275eade67e45630e0dd80eefd757f14ddc4
 * Requirement: On mobile, the create form shall stack above the task grid in a single column
 * 
 * @phoenix-canon: 10753d83edf291bf4519aee6f865a8feb8defeca5db14738580bbbecf8ce61e4
 * Requirement: Active tab shall show task cards with status badges and archived tasks shown with dimmed strikethrough badge
 * 
 * @phoenix-canon: 01e9f448f073ae4f14f69cd176d3ab4012c9bf8a9e51be1dc2adb501e0f1a0b2
 * Requirement: Active tab shall display done tasks in a separate section below active tasks with a Completed heading
 * 
 * @phoenix-canon: 024c1a2b29b16e53913282094b9876b54658ffa254171d6775b200169649d083
 * Requirement: Done tasks must render in the same grid layout as active tasks with same column widths, gaps, and responsive behavior
 * 
 * @phoenix-canon: 1551cfef5a8e5348ba15dacaf955633e49a8799ba9db1ba838d1348cb15d0fb7
 * Requirement: Archived tab shall show archived tasks with original status badge plus archived indicator
 * 
 * @phoenix-canon: ab0772dd32f29ad7bb891b86817d3c68fc79ae5a2c45f6794e61f033e9d97ac5
 * Requirement: Bulk action bar shall only appear when selectedIds length is greater than 0
 * 
 * @phoenix-canon: d6860f3b4f0a11d94d965bf9dfcc96f2f2980e292cc021ae024c9a45f9881def
 * Requirement: Bulk bar shall disable archive button when viewing archived tab and disable restore when viewing active tab
 * 
 * @phoenix-canon: a8da650f4f255b341651f39ae191bb923b6019187d737305b26d53174bde0116
 * Requirement: Confirmation modal shall overlay entire page with semi-transparent background
 * 
 * @phoenix-canon: 7ad31f6c3116a3245b688b4ae74d2937ceb18a7dc4d3e432bbb9e2bca118e430
 * Requirement: Modal confirm action shall execute callback then close modal
 * 
 * @phoenix-canon: 93833e524931c736679d585aa0c8d147102d55060646b3674918d050dac719ab
 * Requirement: Escape key shall cancel modal and click outside modal shall cancel
 * 
 * UI Domain - Risk Tier: high
 */

export interface LayoutConfig {
  createFormColumns: string;
  taskGridColumns: string;
  gap: string;
  breakpoint: string;
}

/**
 * Get responsive layout configuration
 * @phoenix-canon: 93e81a349be59a7f7768fdc9ca00f49df78a974de9bb0c017cb29689ca6e4847
 * @phoenix-canon: 06083503e7868530fa9d6a146f977275eade67e45630e0dd80eefd757f14ddc4
 */
export function getLayoutConfig(): { desktop: LayoutConfig; mobile: LayoutConfig } {
  return {
    desktop: {
      createFormColumns: "320px",
      taskGridColumns: "1fr",
      gap: "24px",
      breakpoint: "(min-width: 1025px)"
    },
    mobile: {
      createFormColumns: "1fr",
      taskGridColumns: "1fr",
      gap: "16px",
      breakpoint: "(max-width: 768px)"
    }
  };
}

/**
 * Get module header styles
 * @phoenix-canon: a57321f9ffae57af24b007b4cb584a142bfd60e65075589f87c5e035f6eea7e9
 * @phoenix-canon: 7f65243582eeec6211a30c259ffd69f8774ab863d0df9b45dd3a49f795f7fed0
 */
export function getModuleHeaderStyles(): string {
  return `
    margin: 0 0 16px 0;
    padding: 0;
    line-height: 1.3;
    font-size: 1.25rem;
    font-weight: 600;
  `;
}

/**
 * Get bulk action bar visibility
 * @phoenix-canon: ab0772dd32f29ad7bb891b86817d3c68fc79ae5a2c45f6794e61f033e9d97ac5
 */
export function shouldShowBulkBar(selectedCount: number): boolean {
  return selectedCount > 0;
}

/**
 * Get bulk action button states
 * @phoenix-canon: d6860f3b4f0a11d94d965bf9dfcc96f2f2980e292cc021ae024c9a45f9881def
 */
export function getBulkButtonStates(currentTab: "active" | "archived"): { archive: boolean; restore: boolean } {
  return {
    archive: currentTab === "active",
    restore: currentTab === "archived"
  };
}

/**
 * Get modal overlay styles
 * @phoenix-canon: a8da650f4f255b341651f39ae191bb923b6019187d737305b26d53174bde0116
 */
export function getModalOverlayStyles(): string {
  return `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(17, 17, 27, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
}

/**
 * Handle escape key for modal cancellation
 * @phoenix-canon: 93833e524931c736679d585aa0c8d147102d55060646b3674918d050dac719ab
 */
export function handleModalEscape(event: KeyboardEvent, onCancel: () => void): void {
  if (event.key === "Escape") {
    onCancel();
  }
}
