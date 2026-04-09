#!/usr/bin/env node
/**
 * Phoenix UI Theory Lens: AUL → Textual (Python)
 * 
 * Transforms abstract UI theory to Textual TUI implementation.
 */

import { TheoryLens } from '../theory.js';

class TextualLens extends TheoryLens {
  constructor() {
    super('textual');
    this.imports = new Set([
      'from textual.app import App',
      'from textual.reactive import reactive',
      'from textual.containers import Horizontal, Vertical, Grid',
      'from textual.widgets import Header, Footer, Static, Button, Input, Label, ListView, ListItem'
    ]);
  }

  generate(theory) {
    const code = [];
    
    // Convert Maps to arrays for iteration
    const states = Array.from(theory.states?.values() || []);
    const regions = Array.from(theory.regions?.values() || []);
    const overlays = Array.from(theory.overlays?.values() || []);
    const transitions = theory.transitions || [];
    
    // Header
    code.push('"""');
    code.push('FreeQ Textual TUI - Generated from Phoenix UI Theory');
    code.push('DO NOT EDIT - Regenerate from spec/ui.aul');
    code.push('"""');
    code.push('');
    
    // Imports
    code.push(...this.imports);
    code.push('from enum import Enum');
    code.push('');
    
    // State enum
    code.push('class AppState(Enum):');
    for (const state of states) {
      code.push(`    ${state.name.toUpperCase()} = "${state.name}"`);
    }
    code.push('');
    
    // Region widgets
    for (const region of regions) {
      code.push(...this.generateRegionWidget(region));
      code.push('');
    }
    
    // Overlay widgets
    for (const overlay of overlays) {
      code.push(...this.generateOverlayWidget(overlay));
      code.push('');
    }
    
    // Main App
    code.push(...this.generateMainApp({ states, regions, overlays, transitions }));
    
    return code.join('\n');
  }

  generateRegionWidget(region) {
    const code = [];
    
    code.push(`class ${region.name}Widget(Static):`);
    code.push(`    """${region.name} region widget.`);
    code.push(`    `);
    code.push(`    Geometry: ${JSON.stringify(region.geometry)}`);
    code.push(`    """`);
    code.push(`    `);
    code.push(`    visible = reactive(True)`);
    code.push(`    `);
    code.push(`    def compose(self):`);
    
    if (region.content && region.content.length > 0) {
      for (const widget of region.content) {
        code.push(`        yield ${widget}()`);
      }
    } else {
      code.push(`        yield Static()  # Empty placeholder`);
    }
    
    code.push(`    `);
    code.push(`    def watch_visible(self, visible: bool):`);
    code.push(`        self.styles.display = "block" if visible else "none"`);
    
    return code;
  }

  generateOverlayWidget(overlay) {
    const code = [];
    
    // Parse presentation - could be string or object
    let isFullscreen = false;
    if (typeof overlay.presentation === 'string') {
      isFullscreen = overlay.presentation === 'FULLSCREEN';
    } else if (overlay.presentation) {
      isFullscreen = overlay.presentation.dock === 'top' || overlay.presentation.height === '100vh';
    }
    
    code.push(`class ${overlay.name}Widget(Static):`);
    code.push(`    """${overlay.name} overlay widget.`);
    code.push(`    `);
    code.push(`    Presentation: ${JSON.stringify(overlay.presentation)}`);
    code.push(`    """`);
    code.push(`    `);
    code.push(`    DEFAULT_CSS = """`);
    
    if (isFullscreen) {
      code.push(`    ${overlay.name}Widget {`);
      code.push(`        width: 100%;`);
      code.push(`        height: 100vh;`);
      code.push(`        layer: overlay;`);
      code.push(`        dock: top;`);
      code.push(`        background: $surface-darken-2;`);
      code.push(`        align: center middle;`);
      code.push(`    }`);
    } else {
      code.push(`    ${overlay.name}Widget {`);
      code.push(`        layer: overlay;`);
      code.push(`        display: none;`);
      code.push(`    }`);
      code.push(`    ${overlay.name}Widget.visible {`);
      code.push(`        display: block;`);
      code.push(`    }`);
    }
    
    code.push(`    """`);
    code.push(`    `);
    code.push(`    def compose(self):`);
    
    // Center content for fullscreen
    if (isFullscreen) {
      code.push(`        with Vertical():`);
      for (const widget of overlay.content || []) {
        code.push(`            yield ${widget}()`);
      }
    } else {
      for (const widget of overlay.content || []) {
        code.push(`        yield ${widget}()`);
      }
    }
    
    return code;
  }

  generateMainApp(theory) {
    const code = [];
    
    // Normalize data structures
    const regions = Array.isArray(theory.regions) ? theory.regions : Array.from(theory.regions?.values() || []);
    const overlays = Array.isArray(theory.overlays) ? theory.overlays : Array.from(theory.overlays?.values() || []);
    const transitions = theory.transitions || [];
    
    code.push(`class FreeQApp(App):`);
    code.push(`    """Main FreeQ TUI application.`);
    code.push(`    `);
    code.push(`    Generated from Phoenix UI Theory.`);
    code.push(`    """`);
    code.push(`    `);
    
    // Reactive state
    code.push(`    state = reactive(AppState.AUTHENTICATING)`);
    code.push(`    `);
    
    // CSS
    code.push(`    CSS = """`);
    code.push(`    FreeQApp {`);
    code.push(`        layout: vertical;`);
    code.push(`    }`);
    
    for (const region of regions) {
      const geom = region.geometry || {};
      code.push(`    `);
      code.push(`    #${region.name.toLowerCase()} {`);
      
      if (geom.type === 'DOCK_TOP') {
        code.push(`        dock: top;`);
        code.push(`        height: ${geom.height || 1};`);
      } else if (geom.type === 'DOCK_BOTTOM') {
        code.push(`        dock: bottom;`);
        code.push(`        height: ${geom.height || 1};`);
      } else if (geom.type === 'FILL') {
        code.push(`        height: 1fr;`);
      } else if (geom.type === 'PERCENT') {
        code.push(`        width: ${geom.percentage || 25}%;`);
      }
      
      code.push(`    }`);
    }
    
    code.push(`    """`);
    code.push(`    `);
    
    // Compose
    code.push(`    def compose(self):`);
    
    // Header (conditional)
    const headerRegion = regions.find(r => r.geometry?.type === 'DOCK_TOP');
    if (headerRegion) {
      code.push(`        # Header - hidden during auth`);
      code.push(`        yield Header(`);
      code.push(`            show_clock=True,`);
      code.push(`            classes="hidden" if self.state == AppState.AUTHENTICATING else ""`);
      code.push(`        )`);
    }
    
    // Main content area
    const mainRegions = regions.filter(r => r.geometry?.type !== 'DOCK_TOP' && r.geometry?.type !== 'DOCK_BOTTOM');
    
    if (mainRegions.length > 0) {
      code.push(`        `);
      code.push(`        # Main content area`);
      code.push(`        with Horizontal():`);
      
      for (const region of mainRegions) {
        code.push(`            yield ${region.name}Widget(`);
        code.push(`                id="${region.name.toLowerCase()}"`);
        code.push(`            )`);
      }
    }
    
    // Footer (conditional)
    const footerRegion = regions.find(r => r.geometry?.type === 'DOCK_BOTTOM');
    if (footerRegion) {
      code.push(`        `);
      code.push(`        # Footer - hidden during auth`);
      code.push(`        yield Footer(`);
      code.push(`            classes="hidden" if self.state == AppState.AUTHENTICATING else ""`);
      code.push(`        )`);
    }
    
    // Overlays
    code.push(`        `);
    code.push(`        # Overlays`);
    for (const overlay of overlays) {
      code.push(`        yield ${overlay.name}Widget(`);
      code.push(`            id="${overlay.name.toLowerCase()}"`);
      code.push(`        )`);
    }
    
    code.push(`    `);
    
    // Watch state
    code.push(`    def watch_state(self, state: AppState):`);
    code.push(`        """React to state changes."""`);
    code.push(`        `);
    code.push(`        # Update visibility based on state`);
    
    for (const region of regions) {
      // Handle both Map and Array for visibility
      let visibilityArray;
      if (region.visibility instanceof Map) {
        visibilityArray = Array.from(region.visibility.entries()).map(([s, v]) => ({ state: s, visible: v }));
      } else if (Array.isArray(region.visibility)) {
        visibilityArray = region.visibility;
      } else {
        visibilityArray = [];
      }
      
      const visibility = visibilityArray.find(v => v.state === 'Authenticating');
      if (visibility) {
        code.push(`        try:`);
        code.push(`            ${region.name.toLowerCase()} = self.query_one("#${region.name.toLowerCase()}")`);
        code.push(`            ${region.name.toLowerCase()}.visible = ${!visibility.visible}`);
        code.push(`        except NoMatches:`);
        code.push(`            pass`);
        code.push(`        `);
      }
    }
    
    // Transition handlers
    code.push(`    # State transition handlers`);
    for (const transition of transitions) {
      const eventName = transition.on || 'unknown';
      code.push(`    `);
      code.push(`    def on_${eventName.toLowerCase()}(self, event):`);
      code.push(`        """Handle ${eventName} event."""`);
      code.push(`        self.state = AppState.${transition.to.toUpperCase()}`);
    }
    
    return code;
  }
}

export { TextualLens };

// CLI
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const lens = new TextualLens();
  
  // Read theory from stdin or file
  const theoryPath = process.argv[2];
  if (theoryPath) {
    const { readFileSync } = await import('fs');
    const source = readFileSync(theoryPath, 'utf-8');
    
    const { AULParser } = await import('../theory.js');
    const parser = new AULParser();
    const theory = parser.parse(source);
    
    const code = lens.generate(theory);
    console.log(code);
  }
}
