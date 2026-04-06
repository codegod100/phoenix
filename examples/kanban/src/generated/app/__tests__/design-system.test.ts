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
  expect(designSystemStyles).toContain('backdrop-filter');
  expect(designSystemStyles).toContain('modal-container');
  expect(designSystemStyles).toContain('modal-header');
});

test('designSystemStyles includes button variants', () => {
  expect(designSystemStyles).toContain('btn-primary');
  expect(designSystemStyles).toContain('btn-secondary');
  expect(designSystemStyles).toContain('btn-destructive');
});

// Phoenix metadata
export const _phoenix = {
  iu_id: 'fc4e93f9d3a4a19648eca9f01c566b88f3e1d3d13da5fd2e6fdfeead404bc0c7',
  name: 'Design System',
  risk_tier: 'medium',
  canon_ids: [
    '0b2afc1848d8c0d9a4f7c7da5e14226acf6226b10c3fbc209b3cc5db0171346f',
    '0b83f19af72e9f48745c0590665534e3979e914efc65c1db3a8e0ac68aa4334c',
    '112295381ecfb6e48e908fcf59b4e374c852961327e02f3792935a0622007f6e',
    '2078adf8c87194a670651eeca0feeb52ae159122461356cb25c5943970e86090',
    '2137e71c68a84e9f2e475268bfe2e7aad74a8318b8af22089d7fff5df0eaf637',
    '21e8d3c87d99488debdf7f74f7e2f80027c1a3cb699ccfc680771f684515f4a7',
    '2784474a2650d12d9b5560795c66627a4bf578574c64282118c29d241d86813d',
    '2be8ddc8ffff6e520c8c29e95cdb8f619c0f097d6dc97b2497b184cb9b7002b1',
    '303c7725532910ab5016fdcd30119946fdd82cddcd1669c9c34cd654debdb31a',
    '3e9509d9089ddeace896aa8a451291d48dfa0973fd5b1b44c67590823341e7e8',
    '45ffed136c2e2afa9a59efb80ed97d3fdbd407984bc6df23eecf37e396c82298',
    '48499a5a8a151d714195f2a3028c8ff99a9237fbcc26641bc0c73fc0f8283b3b',
    '49e24ce6b601a7a156e5cd52754e8e2a684f1c2cbde0f7020016851685abcee8',
    '5165b3a903cb9f8679ef44418be208712450b0b0d15ab9d8e85fce41a1628478',
    '67c762ffc807c0cb2aa0e05a9d1fc11303fdaa526b945e6590041819d8d25915',
    '699408b807d0065154f7ebb475b4df0c5c265b9a8bec3232fcf9fe937155954f',
    '72f8c48964bbfc47c32d086e1aba2a63736afe91d348987c9b9a4e7016d05577',
    '7cf35eed850f28393d2dfca26a38fa5b4c596890f2c53b6869a8e66e5948515f',
    '8f4e1758cfbb355cc2ee146af3e884054d7d75b2ae8a4d999d88018d980f8f00',
    '8fe6c5dc94f91f484329270981b59fadda944902ec87777ff0e05a25e0bddcb6',
    '905d132dfa83c81e511dc33e2228237b5b868e439afa312ac6cecfd6747433f1',
    '97141a2def12cd032b016875a88693265796774f87c9a873b1f3f83840781e25',
    '9f6b7ef6d437b194b28985492bb8828ea07b0ef1131e54c130eb64e1e999639f',
    'a009f6030e39855ea512bf698a56eb4c8f3b7eb64b18003dae3057ead1186309',
    'b6b6606e9161932046dbacc0531f0867cc4178416f245abc574d1c85834f7a25',
    'bca44fead9b0a6ed467b90cfe04ed2539ba84f8e9274b1d6ced0a662ba5a163d',
    'e1a3f056b44f114ee02e973d72f55677a9697fd89580ccfd6b5675a9ffa31ab5',
    'ea59ce8107d99883dcd49e1a3ef746929c11e4dec4a8f843ba43206675fb6ba0',
    'fba5023daba365b10641c593ebca672c5c66dfd125145a5972dc02378abe01b2',
    'fd152c3071d17af5c810f45bcc6eb801febe68e8251cdab7a28ec7b813e34404',
    'fee18b29e4ce68a341bc2fa31f344d8f49a025fdf2857ccf1978efb93fc507e2'
  ]
} as const;
