// Generated index for Kanban Board app

export { initDatabase, registerMigrations, seedDefaultColumns } from './database';
export { getBoard, createCard, updateCard, moveCard, deleteCard, createColumn, renameColumn, moveColumn, deleteColumn } from './api';
export { BoardComponent } from './board';
export { CardComponent, DragState } from './card.ui';
export { renderPage } from './ui.ui';
export { DesignSystem, Theme, renderModal, renderInputField, designSystemStyles } from './designsystem.ui';
export { InputDesign, LabelDesign, FormDesign, getInputStyle, getLabelStyle } from './general';

// Phoenix traceability
export const _phoenix = {
  iu_id: '8d3ef5cc48c3b7630b398cbd74c0948f278a81b59dc569ddd3166378e62a22e5',
  name: 'Designsystem',
  risk_tier: 'medium'
} as const;
