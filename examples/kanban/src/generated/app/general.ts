// Generated from IU: General (97f2f449a624bb9a532a16148f008c7d6cfbb867a3a35896a5f976cd643ee880)
// Input and form design system

export const InputDesign = {
  // Background and border
  background: '#313244',
  border: '1px solid #45475a',
  borderFocus: '1px solid #89b4fa',
  borderRadius: '6px',
  padding: '8px 12px',
  
  // Text
  color: '#cdd6f4',
  fontSize: '14px',
  
  // Textarea specific
  textareaResize: 'vertical' as const,
  textareaMinHeight: '100px',
} as const;

export const LabelDesign = {
  color: '#a6adc8',
  fontSize: '12px',
  display: 'block',
  marginBottom: '4px',
} as const;

// Form layout constants
export const FormDesign = {
  labelSpacing: '16px',  // margin-bottom between label+input groups
  inputWidth: '100%',
  boxSizing: 'border-box' as const,
} as const;

// Helper to generate input style string
export function getInputStyle(): string {
  return `width:${FormDesign.inputWidth};background:${InputDesign.background};border:${InputDesign.border};color:${InputDesign.color};border-radius:${InputDesign.borderRadius};padding:${InputDesign.padding};box-sizing:${FormDesign.boxSizing};`;
}

export function getInputStyleFocus(): string {
  return `width:${FormDesign.inputWidth};background:${InputDesign.background};border:${InputDesign.borderFocus};color:${InputDesign.color};border-radius:${InputDesign.borderRadius};padding:${InputDesign.padding};box-sizing:${FormDesign.boxSizing};`;
}

// Helper to generate label style string  
export function getLabelStyle(): string {
  return `color:${LabelDesign.color};font-size:${LabelDesign.fontSize};display:${LabelDesign.display};margin-bottom:${LabelDesign.marginBottom};`;
}

// Phoenix traceability
export const _phoenix = {
  iu_id: '97f2f449a624bb9a532a16148f008c7d6cfbb867a3a35896a5f976cd643ee880',
  name: 'General',
  risk_tier: 'medium'
} as const;
