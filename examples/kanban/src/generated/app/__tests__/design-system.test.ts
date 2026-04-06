// Generated tests for Design System IU: 8d3ef5cc48c3b7630b398cbd74c0948f278a81b59dc569ddd3166378e62a22e5

import { expect, test, describe } from 'bun:test';
import { renderModal, renderInputField, designSystemStyles, DesignSystem, Theme } from '../designsystem.ui';

describe('renderModal', () => {
  test('creates modal with title and content', () => {
    const html = renderModal('Test Modal', '<p>Test content</p>');
    
    expect(html).toContain('modal-backdrop');
    expect(html).toContain('modal-container');
    expect(html).toContain('Test Modal');
    expect(html).toContain('Test content');
  });

  test('includes close button', () => {
    const html = renderModal('Test', '');
    
    expect(html).toContain('×');
    expect(html).toContain('modal-backdrop');
  });

  test('supports destructive variant', () => {
    const html = renderModal('Delete?', '<p>Are you sure?</p>', 'Delete', 'Cancel', true);
    
    expect(html).toContain('Delete');
    expect(html).toContain(Theme.colors.red); // destructive uses red
  });

  test('includes secondary button', () => {
    const html = renderModal('Test', '', 'Save', 'Cancel');
    
    expect(html).toContain('Cancel');
    expect(html).toContain('Save');
  });
});

describe('renderInputField', () => {
  test('creates input with visible label', () => {
    const html = renderInputField('Test Label', 'test-input', 'text', '', 'Enter value');
    
    expect(html).toContain('Test Label');
    expect(html).toContain('name="test-input"');
    expect(html).toContain('placeholder="Enter value"');
    expect(html).toContain('<input');
  });

  test('passes type parameter to input', () => {
    const html = renderInputField('Description', 'desc', 'textarea');
    
    expect(html).toContain('Description');
    expect(html).toContain('type="textarea"');
  });
});

describe('designSystemStyles', () => {
  test('includes Catppuccin Mocha colors', () => {
    expect(designSystemStyles).toContain('#181825'); // mantle
    expect(designSystemStyles).toContain('#89b4fa'); // blue accent
    expect(designSystemStyles).toContain('#f38ba8'); // pink destructive
    expect(designSystemStyles).toContain('#cdd6f4'); // text
  });

  test('includes CSS variables', () => {
    expect(designSystemStyles).toContain(':root');
    expect(designSystemStyles).toContain('--cat-base');
  });
});

describe('DesignSystem', () => {
  test('has card styling', () => {
    expect(DesignSystem.card.background).toBeDefined();
    expect(DesignSystem.card.borderRadius).toBeDefined();
  });

  test('has typography colors', () => {
    expect(DesignSystem.typography.primary).toBeDefined();
    expect(DesignSystem.typography.secondary).toBeDefined();
  });
});

// Phoenix traceability
export const _phoenix = {
  iu_id: '8d3ef5cc48c3b7630b398cbd74c0948f278a81b59dc569ddd3166378e62a22e5',
  name: 'Designsystem',
  risk_tier: 'medium'
} as const;
