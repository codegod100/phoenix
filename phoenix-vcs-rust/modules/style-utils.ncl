{
  id = "style-utils",
  name = "Style Utilities",
  version = "1.0.0",
  
  provides = ["styling", "css-utils"],
  needs = [],
  
  generation = {
    target = "typescript",
    exports = ["styles", "css", "theme"],
    
    vertices = [
      {
        type = "ClassDecl",
        name = "StyleUtils",
        code = m%"
          export class StyleUtils {
            static card(options = {}) {
              const { padding = '1.5rem', maxWidth = '500px', shadow = true } = options;
              return `
                background: white;
                border-radius: 12px;
                padding: ${padding};
                ${shadow ? 'box-shadow: 0 2px 8px rgba(0,0,0,0.1);' : ''}
                ${maxWidth ? `max-width: ${maxWidth};` : ''}
              `;
            }
            
            static button(options = {}) {
              const { 
                variant = 'primary', 
                size = 'medium' 
              } = options;
              
              const colors = {
                primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                danger: '#ff6b6b',
                success: '#48bb78'
              };
              
              const sizes = {
                small: '0.4rem 0.8rem',
                medium: '0.75rem 1.5rem',
                large: '1rem 2rem'
              };
              
              return `
                padding: ${sizes[size]};
                background: ${colors[variant]};
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: transform 0.1s, opacity 0.2s;
              `;
            }
            
            static input(options = {}) {
              return `
                flex: 1;
                padding: 0.75rem;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 1rem;
                outline: none;
                transition: border-color 0.2s;
              `;
            }
            
            static flex(options = {}) {
              const { gap = '0.5rem', align = 'center' } = options;
              return `
                display: flex;
                align-items: ${align};
                gap: ${gap};
              `;
            }
          }
          
          export const css = (strings, ...values) => 
            strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
          
          export const theme = {
            colors: {
              primary: '#667eea',
              secondary: '#764ba2',
              danger: '#ff6b6b',
              success: '#48bb78',
              text: '#333',
              muted: '#666',
              border: '#e0e0e0'
            },
            spacing: {
              xs: '0.25rem',
              sm: '0.5rem',
              md: '1rem',
              lg: '1.5rem',
              xl: '2rem'
            }
          };
        "%
      }
    ]
  }
}
