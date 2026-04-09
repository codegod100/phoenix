/**
 * @phoenix-iu: 84d7fff4444e467ce261fbdafe6a926bf929dbfc01f9cdd0c49e8ed3dac7a77e
 * @phoenix-name: Page Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: e5812b6a584792edc9967face4977a6bda2ada84f731d38b55b3c49dd7e7d953
 * Requirement: The dashboard must render a complete HTML page with inline CSS and JavaScript
 * 
 * @phoenix-canon: 30d7c5acea649f28567d0b0bab67bf416b751712003faf6dae0add36ae400298
 * Requirement: The page must be encoded in UTF-8 with proper charset meta tag
 * 
 * @phoenix-canon: bf3ef52e9fb03378f76e12d2fde4d4af6be22c90abd90b9b5d6b6f9d6ac30f6f
 * Requirement: The page must include a viewport meta tag for responsive scaling
 * 
 * @phoenix-canon: d36869b76eb6ad786ca12371d8af3d24848b70e1a31dccc514d4e882d37c9975
 * Requirement: The page must display a compact header with the title "TaskFlow"
 * 
 * @phoenix-canon: 3b90fe0067a3d588c01a9d4a5ace94162874cdf14455ff6b93bfa97f6a618fc3
 * Requirement: The dashboard must use CSS custom properties for all Catppuccin colors
 * 
 * @phoenix-canon: aab62f8393294f551e2d98155d4ef2893025d963e051fcb203947a147a425d62
 * Requirement: The layout must be responsive with single column on mobile and multi-column grid on desktop
 * 
 * Page Domain - Risk Tier: high
 */

export interface PageMetadata {
  title: string;
  charset: string;
  viewport: string;
}

/**
 * Get page metadata
 * @phoenix-canon: 30d7c5acea649f28567d0b0bab67bf416b751712003faf6dae0add36ae400298
 * @phoenix-canon: bf3ef52e9fb03378f76e12d2fde4d4af6be22c90abd90b9b5d6b6f9d6ac30f6f
 * @phoenix-canon: d36869b76eb6ad786ca12371d8af3d24848b70e1a31dccc514d4e882d37c9975
 */
export function getPageMetadata(): PageMetadata {
  return {
    title: "TaskFlow",
    charset: "UTF-8",
    viewport: "width=device-width, initial-scale=1.0"
  };
}

/**
 * Get responsive breakpoints
 * @phoenix-canon: aab62f8393294f551e2d98155d4ef2893025d963e051fcb203947a147a425d62
 */
export function getResponsiveConfig(): { mobile: string; tablet: string; desktop: string } {
  return {
    mobile: "(max-width: 768px)",
    tablet: "(min-width: 769px) and (max-width: 1024px)",
    desktop: "(min-width: 1025px)"
  };
}
