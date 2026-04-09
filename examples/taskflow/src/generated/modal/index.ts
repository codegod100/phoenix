/**
 * @phoenix-iu: e0fdf2ac458f57d61ad4fe13b6a3be679fdd2fcd31b9237fa0cb2d6d50c84085
 * @phoenix-name: Modal Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 0fcd31ba2080926c3dda3dda53f4c2af5b68916c3812975d265c9f66efc3cf03
 * Requirement: The modal shall have 24px internal padding to reduce overall height
 * 
 * @phoenix-canon: 395c7bc1288d60bee73add79a9237c959d6e1a64c01111e1f508ddfa1edb75da
 * Requirement: The modal shall have NO overflow-y scrolling enabled - all content must fit naturally
 * 
 * @phoenix-canon: 5c212153a1ffd3dd57f085eaf8fe049ce963f763f37be1369b60de2112a5b009
 * Requirement: The create/edit modal dialog must fit within the viewport without requiring vertical scroll on 1080p
 * 
 * @phoenix-canon: de80ad85153501dce164739dd9883025675e7103428c424a6678f24452546df2
 * Requirement: The modal shall have a maximum width of 800px to accommodate form fields comfortably
 * 
 * @phoenix-canon: debbb758555928d4db912869626579ae1da0b5618ad7c9420add2a77384d4759
 * Requirement: The modal shall use 95% of viewport width on mobile devices
 * 
 * @phoenix-canon: 619c94741ca3b11236958b276752ff590af3d4722456b9299ceb82aa8e910e88
 * Requirement: Assignee and Deadline fields shall render side-by-side in a two-column grid layout
 * 
 * @phoenix-canon: 954cf4092081abcd20a7f52aa9c1ec11c0f4a4ecf1cbcf0e38772076846f29bc
 * Requirement: Status and Priority fields shall render side-by-side in a two-column grid layout
 * 
 * @phoenix-canon: d9ecce2e6f7f1eeb888fceb6546c5254af614d14ab2756ef4fa8855392f222c3
 * Requirement: The Description textarea shall use 2 rows maximum (not 3) to reduce height
 * 
 * @phoenix-canon: d9f092d708b285051795a497231c6c734244708f5dc1762157bd7c8924457ca3
 * Requirement: Form field margins shall be 12px (not 16px) between groups to reduce overall height
 * 
 * @phoenix-canon: 90ee4a23b51c2c1663357bef179083841a99c8abc7b3b89f5a92b34ca2fa1bcc
 * Requirement: Form labels shall have minimal 2px margin-bottom to reduce spacing
 * 
 * @phoenix-canon: fe95f87a26098233c2c922ca99c4d6bd8337ba08886bac19f03a9d87305cd7cc
 * Requirement: Input padding shall be compact (6px vertical) to reduce field heights
 * 
 * @phoenix-canon: 8cebf2b058433012aaed4e42b48410f92078bbad5386e1960130d20b51f7add3
 * Requirement: When the modal opens, the Title input field shall receive immediate focus for rapid data entry
 * 
 * @phoenix-canon: 987ca469857be4de06f969a4bc6b73d1b938bba46f774111aed03795cfe45716
 * Requirement: The Title input shall use autofocus attribute or JavaScript .focus() call in the openModal() function
 * 
 * @phoenix-canon: 98ba0fabf9fa320cb727d429f629e5209d0c07d9765a2ae9ff4d94a0d24e06c9
 * Requirement: Pressing the Enter key while in any form field shall submit the form and save the task
 * 
 * @phoenix-canon: 15db98bfbb1bce143846e2a0c429ead2d2ce31cf1bcbcc163463d850b25e48e9
 * Constraint: All modal form inputs must use autocomplete="off" attribute to disable browser autocomplete
 * 
 * Modal Domain - Risk Tier: high
 */

/**
 * Modal configuration
 * @phoenix-canon: de80ad85153501dce164739dd9883025675e7103428c424a6678f24452546df2
 * @phoenix-canon: debbb758555928d4db912869626579ae1da0b5618ad7c9420add2a77384d4759
 * @phoenix-canon: 0fcd31ba2080926c3dda3dda53f4c2af5b68916c3812975d265c9f66efc3cf03
 */
export function getModalConfig(): { maxWidth: string; mobileWidth: string; padding: string } {
  return {
    maxWidth: "800px",
    mobileWidth: "95%",
    padding: "24px"
  };
}

/**
 * Get compact form styles
 * @phoenix-canon: d9f092d708b285051795a497231c6c734244708f5dc1762157bd7c8924457ca3
 * @phoenix-canon: 90ee4a23b51c2c1663357bef179083841a99c8abc7b3b89f5a92b34ca2fa1bcc
 * @phoenix-canon: fe95f87a26098233c2c922ca99c4d6bd8337ba08886bac19f03a9d87305cd7cc
 * @phoenix-canon: d9ecce2e6f7f1eeb888fceb6546c5254af614d14ab2756ef4fa8855392f222c3
 */
export function getCompactFormStyles(): string {
  return `
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; margin-bottom: 2px; font-size: 0.85rem; color: var(--ctp-subtext0); }
    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 6px 10px;
    }
    .form-group textarea { rows: 2; min-height: 50px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  `;
}

/**
 * Get two-column layout for Status/Priority and Assignee/Deadline
 * @phoenix-canon: 954cf4092081abcd20a7f52aa9c1ec11c0f4a4ecf1cbcf0e38772076846f29bc
 * @phoenix-canon: 619c94741ca3b11236958b276752ff590af3d4722456b9299ceb82aa8e910e88
 */
export function getTwoColumnFields(): { row1: string[]; row2: string[] } {
  return {
    row1: ["status", "priority"],
    row2: ["assignee", "deadline"]
  };
}

/**
 * Focus title input on modal open
 * @phoenix-canon: 8cebf2b058433012aaed4e42b48410f92078bbad5386e1960130d20b51f7add3
 * @phoenix-canon: 987ca469857be4de06f969a4bc6b73d1b938bba46f774111aed03795cfe45716
 */
export function focusTitleInput(modalElement: HTMLElement): void {
  const titleInput = modalElement.querySelector('input[name="title"]') as HTMLInputElement;
  if (titleInput) {
    titleInput.focus();
  }
}

/**
 * Get form inputs with autocomplete=off
 * @phoenix-canon: 15db98bfbb1bce143846e2a0c429ead2d2ce31cf1bcbcc163463d850b25e48e9
 */
export function getFormInputsWithAutocompleteOff(): string[] {
  return ["title", "description", "assignee", "tags"];
}

/**
 * Handle Enter key to submit form
 * @phoenix-canon: 98ba0fabf9fa320cb727d429f629e5209d0c07d9765a2ae9ff4d94a0d24e06c9
 */
export function setupEnterKeySubmit(formElement: HTMLElement, onSubmit: () => void): void {
  formElement.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target as HTMLElement).tagName.match(/TEXTAREA/i)) {
      e.preventDefault();
      onSubmit();
    }
  });
}
