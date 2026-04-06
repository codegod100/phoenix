// Test for Design System IU
import { expect, test } from 'bun:test';
import { renderModal, renderInputField, designSystemStyles } from '../design-system.ui.js';

test('renderModal creates modal with title and content', () => {
  const html = renderModal({
    title: 'Test Modal',
    content: '<p>Test content</p>',
    primaryAction: { label: 'OK', onClick: () => {} }
  });
  
  expect(html).toContain('modal-backdrop');
  expect(html).toContain('modal-container');
  expect(html).toContain('Test Modal');
  expect(html).toContain('Test content');
  expect(html).toContain('btn-primary');
});

test('renderModal includes close button', () => {
  const html = renderModal({
    title: 'Test',
    content: ''
  });
  
  expect(html).toContain('modal-close');
  expect(html).toContain('×');
});

test('renderModal supports destructive variant', () => {
  const html = renderModal({
    title: 'Delete?',
    content: '<p>Are you sure?</p>',
    primaryAction: { label: 'Delete', onClick: () => {}, variant: 'destructive' }
  });
  
  expect(html).toContain('btn-destructive');
});

test('renderModal includes secondary button when provided', () => {
  const html = renderModal({
    title: 'Test',
    content: '',
    primaryAction: { label: 'Save', onClick: () => {} },
    secondaryAction: { label: 'Cancel', onClick: () => {} }
  });
  
  expect(html).toContain('btn-secondary');
  expect(html).toContain('Cancel');
});

test('renderInputField creates input with visible label', () => {
  const html = renderInputField({
    id: 'test-input',
    label: 'Test Label',
    type: 'text',
    placeholder: 'Enter value'
  });
  
  expect(html).toContain('input-group');
  expect(html).toContain('input-label');
  expect(html).toContain('Test Label');
  expect(html).toContain('id="test-input"');
  expect(html).toContain('input-field');
});

test('renderInputField creates textarea when type is textarea', () => {
  const html = renderInputField({
    id: 'test-area',
    label: 'Description',
    type: 'textarea'
  });
  
  expect(html).toContain('<textarea');
  expect(html).toContain('</textarea>');
});

test('designSystemStyles includes Catppuccin Mocha colors', () => {
  expect(designSystemStyles).toContain('#181825'); // mantle
  expect(designSystemStyles).toContain('#89b4fa'); // blue accent
  expect(designSystemStyles).toContain('#f38ba8'); // pink destructive
  expect(designSystemStyles).toContain('#cdd6f4'); // text
});

test('designSystemStyles includes modal styles', () => {
  expect(designSystemStyles).toContain('modal-backdrop');

// Phoenix traceability
export const _phoenix = {
  iu_id: '8d3ef5cc48c3b7630b398cbd74c0948f278a81b59dc569ddd3166378e62a22e5',
  name: 'Designsystem',
  risk_tier: 'medium'
} as const;
