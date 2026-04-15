{
  id = "css-in-js",
  name = "CSS-in-JS Styles",
  version = "1.0.0",
  
  provides = ["styling", "css-modules"],
  needs = [],
  
  generation = {
    target = "typescript",
    exports = ["styled", "createGlobalStyle", "keyframes"],
    
    vertices = [
      {
        type = "ClassDecl",
        name = "StyledEngine",
        code = m%"
          // CSS-in-JS for Elena components
          // Generates scoped stylesheets at runtime
          
          const styleRegistry = new Map();
          let styleCounter = 0;
          
          export function styled(baseStyles = {}) {
            return function styles(strings, ...values) {
              const cssText = strings.reduce((acc, str, i) => 
                acc + str + (values[i] || ''), ''
              );
              
              // Generate unique class name
              const className = `s${++styleCounter}`;
              
              // Inject stylesheet if not already present
              if (!styleRegistry.has(className)) {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(`.${className} { ${cssText} }`);
                document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
                styleRegistry.set(className, sheet);
              }
              
              return className;
            };
          }
          
          export function createGlobalStyle(strings, ...values) {
            const cssText = strings.reduce((acc, str, i) => 
              acc + str + (values[i] || ''), ''
            );
            
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(cssText);
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
          }
          
          export function keyframes(strings, ...values) {
            const name = `animation${++styleCounter}`;
            const cssText = strings.reduce((acc, str, i) => 
              acc + str + (values[i] || ''), ''
            );
            
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(`@keyframes ${name} { ${cssText} }`);
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
            
            return name;
          }
          
          // Pre-built component styles
          export const preset = {
            card: styled()`
              background: white;
              border-radius: 12px;
              padding: 1.5rem;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            `,
            
            button: (variant = 'primary') => styled()`
              padding: 0.75rem 1.5rem;
              background: ${variant === 'primary' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : '#ff6b6b'};
              color: white;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
            `,
            
            input: styled()`
              flex: 1;
              padding: 0.75rem;
              border: 2px solid #e0e0e0;
              border-radius: 8px;
              font-size: 1rem;
            `
          };
        "%
      }
    ]
  }
}
