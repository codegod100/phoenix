#!/usr/bin/env node
/**
 * Phoenix UI Theory - Core Abstract Implementation
 * 
 * Mathematical foundation for declarative UI generation.
 * Language-agnostic theory that lenses to concrete implementations.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ============================================================================
// CATEGORY THEORY FOUNDATION
// ============================================================================

/**
 * Category: UI
 * Objects: States, Regions, Overlays, Views
 * Morphisms: visibility, render, transition, compose
 */
class UICategory {
  constructor(objects, morphisms) {
    this.objects = new Set(objects);
    this.morphisms = new Map(morphisms); // source -> {target: morphism}
  }

  // Check if morphism exists: f: a → b
  hasMorphism(a, b) {
    return this.morphisms.get(a)?.has(b) ?? false;
  }

  // Get morphism: f: a → b
  getMorphism(a, b) {
    return this.morphisms.get(a)?.get(b);
  }

  // Compose morphisms: g ∘ f where f: a → b, g: b → c
  compose(f, g) {
    // Returns h: a → c
    return (state) => g(f(state));
  }
}

/**
 * Functor: State → Layout
 * Maps each state to its visible regions
 */
class LayoutFunctor {
  constructor(visibilityMap) {
    // visibilityMap: Map(State, Map(Region, Bool))
    this.visibility = visibilityMap;
  }

  // F(s) = { r ∈ Region | visibility(s, r) = true }
  map(state) {
    const regions = this.visibility.get(state);
    if (!regions) return new Set();
    
    return new Set(
      Array.from(regions.entries())
        .filter(([_, visible]) => visible)
        .map(([region, _]) => region)
    );
  }

  // F(f: a → b): F(a) → F(b) - not used directly, state changes are discrete
  mapMorphism(transition) {
    return (layoutA) => {
      const stateB = transition.to;
      return this.map(stateB);
    };
  }
}

/**
 * Natural Transformation: Overlay lifting
 * η: L → L' where L' includes overlays
 */
class OverlayTransformation {
  constructor(overlayTriggers) {
    // overlayTriggers: Map(State, Set(Overlay))
    this.triggers = overlayTriggers;
  }

  // η_s: L(s) → L'(s)
  transform(state, baseLayout) {
    const overlays = this.triggers.get(state) ?? new Set();
    return {
      regions: baseLayout,
      overlays: overlays
    };
  }
}

// ============================================================================
// ALGEBRAIC SPECIFICATION
// ============================================================================

/**
 * Signature: UIΣ = (Sorts, Operations, Equations)
 */
class UISignature {
  constructor() {
    this.sorts = new Set(['State', 'Region', 'Overlay', 'Geometry', 'View', 'Event']);
    
    this.operations = new Map([
      ['visibility', { domain: ['State', 'Region'], codomain: 'Bool' }],
      ['geometry', { domain: ['Region'], codomain: 'Geometry' }],
      ['content', { domain: ['Region'], codomain: 'List Widget' }],
      ['trigger', { domain: ['State', 'Overlay'], codomain: 'Bool' }],
      ['present', { domain: ['Overlay'], codomain: 'PresentationMode' }],
      ['dismiss', { domain: ['Overlay'], codomain: 'Bool' }],
      ['transition', { domain: ['State', 'Event'], codomain: 'State' }],
      ['compose', { domain: ['Geometry', 'Geometry'], codomain: 'Geometry' }]
    ]);

    this.equations = [
      // Identity: empty region never visible
      {
        name: 'identity',
        check: (s, r) => r === null ? true : undefined
      },
      
      // Mutual exclusion: only one fullscreen overlay at a time
      {
        name: 'fullscreen_mutex',
        check: (state, overlays) => {
          const fullscreen = overlays.filter(o => o.presentation === 'FULLSCREEN');
          return fullscreen.length <= 1;
        }
      },
      
      // Overlay z-index: overlays always above regions
      {
        name: 'overlay_ontop',
        check: (regions, overlays) => {
          const maxRegionZ = Math.max(...regions.map(r => r.zIndex ?? 0));
          const minOverlayZ = Math.min(...overlays.map(o => o.zIndex ?? 1));
          return minOverlayZ > maxRegionZ;
        }
      },
      
      // State determinism: same event from same state leads to same next state
      {
        name: 'determinism',
        check: (transitions) => {
          const grouped = groupBy(transitions, t => `${t.from}:${t.event}`);
          return Object.values(grouped).every(group => group.length === 1);
        }
      }
    ];
  }
}

// ============================================================================
// AUL PARSER (Abstract UI Language)
// ============================================================================

class AULParser {
  parse(source) {
    const lines = source.split('\n');
    const result = {
      states: new Map(),
      regions: new Map(),
      overlays: new Map(),
      transitions: []
    };

    let current = null;
    let context = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('--')) continue;

      // State declaration
      const stateMatch = trimmed.match(/^state\s+(\w+):/);
      if (stateMatch) {
        current = { name: stateMatch[1], properties: {} };
        result.states.set(stateMatch[1], current);
        context = 'state';
        continue;
      }

      // Region declaration
      const regionMatch = trimmed.match(/^region\s+(\w+):/);
      if (regionMatch) {
        current = { 
          name: regionMatch[1], 
          geometry: {},
          visibility: new Map(),
          content: []
        };
        result.regions.set(regionMatch[1], current);
        context = 'region';
        continue;
      }

      // Overlay declaration
      const overlayMatch = trimmed.match(/^overlay\s+(\w+):/);
      if (overlayMatch) {
        current = {
          name: overlayMatch[1],
          trigger: null,
          presentation: 'MODAL',
          dismissable: true,
          content: [],
          backdrop: null
        };
        result.overlays.set(overlayMatch[1], current);
        context = 'overlay';
        continue;
      }

      // Transition declaration
      const transitionMatch = trimmed.match(/^transition\s+(\w+)\s*->\s*(\w+):/);
      if (transitionMatch) {
        current = {
          from: transitionMatch[1],
          to: transitionMatch[2],
          on: null,
          animation: 'INSTANT',
          duration: 0
        };
        result.transitions.push(current);
        context = 'transition';
        continue;
      }

      // Property parsing
      if (current && trimmed.includes(':')) {
        const [key, ...valueParts] = trimmed.split(':');
        const value = valueParts.join(':').trim();
        
        if (context === 'state') {
          current.properties[key.trim()] = value;
        } else if (context === 'region') {
          if (key.trim() === 'geometry') {
            current.geometry = this.parseGeometry(value);
          } else if (key.trim() === 'visibility') {
            // Multi-line visibility map
            context = 'visibility';
          } else if (key.trim() === 'content') {
            current.content = this.parseContent(value);
          }
        } else if (context === 'overlay') {
          current[key.trim()] = value;
        } else if (context === 'transition') {
          if (key.trim() === 'on') current.on = value;
          if (key.trim() === 'animation') current.animation = value;
          if (key.trim() === 'duration') current.duration = parseInt(value);
        }
      }

      // Visibility state mapping: "StateName: true/false"
      if (context === 'visibility' && trimmed.match(/^\w+:\s*(true|false)/)) {
        const [stateName, visible] = trimmed.split(':');
        current.visibility.set(stateName.trim(), visible.trim() === 'true');
      }
    }

    return result;
  }

  parseGeometry(value) {
    // Parse: DOCK_TOP(height: 1) or FILL or PERCENT(25)
    const match = value.match(/^(\w+)\(([^)]+)\)$/);
    if (match) {
      const type = match[1];
      const params = match[2].split(',').reduce((acc, param) => {
        const [k, v] = param.split(':').map(s => s.trim());
        acc[k] = isNaN(v) ? v : parseInt(v);
        return acc;
      }, {});
      return { type, ...params };
    }
    return { type: value };
  }

  parseContent(value) {
    // Parse: [Widget1, Widget2, Widget3]
    const match = value.match(/^\[([^\]]+)\]$/);
    if (match) {
      return match[1].split(',').map(s => s.trim());
    }
    return [];
  }
}

// ============================================================================
// THEORY LENS (Abstract to Concrete)
// ============================================================================

class TheoryLens {
  constructor(targetLanguage) {
    this.language = targetLanguage;
    this.mappings = this.loadMappings(targetLanguage);
  }

  loadMappings(lang) {
    // Load language-specific mappings
    const mappings = {
      textual: {
        'geometry.DOCK_TOP': 'textual.widgets.Header',
        'geometry.DOCK_BOTTOM': 'textual.widgets.Footer',
        'geometry.HORIZONTAL': 'textual.containers.Horizontal',
        'geometry.VERTICAL': 'textual.containers.Vertical',
        'geometry.FILL': { flex: 1 },
        'presentation.FULLSCREEN': { layer: 'overlay', dock: 'top', height: '100vh' },
        'presentation.MODAL': { layer: 'overlay' },
        'state.reactive': 'textual.reactive.reactive',
        'visibility.css': 'display: none/block based on class'
      },
      react: {
        'geometry.DOCK_TOP': 'position: fixed; top: 0',
        'geometry.DOCK_BOTTOM': 'position: fixed; bottom: 0',
        'geometry.HORIZONTAL': 'display: flex; flex-direction: row',
        'geometry.VERTICAL': 'display: flex; flex-direction: column',
        'geometry.FILL': 'flex: 1',
        'presentation.FULLSCREEN': 'position: fixed; inset: 0; z-index: 50',
        'presentation.MODAL': 'position: fixed; z-index: 40',
        'state.reactive': 'React.useState',
        'visibility.css': 'conditional rendering'
      }
    };
    
    return mappings[lang] || mappings.textual;
  }

  apply(theory) {
    return {
      regions: this.mapRegions(theory.regions),
      overlays: this.mapOverlays(theory.overlays),
      states: this.mapStates(theory.states),
      transitions: this.mapTransitions(theory.transitions),
      invariants: this.generateInvariants(theory)
    };
  }

  mapRegions(regions) {
    const result = [];
    for (const [name, region] of regions) {
      result.push({
        name,
        component: this.mappings[`geometry.${region.geometry.type}`] || 'Container',
        geometry: region.geometry,
        visibility: this.mapVisibility(region.visibility),
        content: region.content
      });
    }
    return result;
  }

  mapVisibility(visibilityMap) {
    // Map visibility to target language construct
    return Array.from(visibilityMap.entries()).map(([state, visible]) => ({
      state,
      visible,
      implementation: this.mappings['visibility.css']
    }));
  }

  mapOverlays(overlays) {
    const result = [];
    for (const [name, overlay] of overlays) {
      result.push({
        name,
        trigger: overlay.trigger,
        presentation: this.mappings[`presentation.${overlay.presentation}`] || { layer: 'overlay' },
        dismissable: overlay.dismissable,
        content: overlay.content,
        backdrop: overlay.backdrop
      });
    }
    return result;
  }

  mapStates(states) {
    return Array.from(states.keys()).map(name => ({
      name,
      enumValue: name.toUpperCase()
    }));
  }

  mapTransitions(transitions) {
    return transitions.map(t => ({
      from: t.from,
      to: t.to,
      event: t.on,
      animation: t.animation,
      duration: t.duration
    }));
  }

  generateInvariants(theory) {
    // Generate invariant checks from theory
    return [
      {
        name: 'fullscreen_mutex',
        check: (state) => {
          const overlays = theory.overlays.get(state) || [];
          const fullscreen = overlays.filter(o => o.presentation === 'FULLSCREEN');
          return fullscreen.length <= 1;
        }
      }
    ];
  }
}

// ============================================================================
// VALIDATORS
// ============================================================================

class InvariantValidator {
  constructor(invariants) {
    this.invariants = invariants;
  }

  validate(theory, state) {
    const results = [];
    for (const invariant of this.invariants) {
      const result = invariant.check(state);
      results.push({
        name: invariant.name,
        valid: result,
        message: result ? 'OK' : `Invariant violated: ${invariant.name}`
      });
    }
    return results;
  }
}

class CompletenessValidator {
  validate(theory) {
    const issues = [];
    
    // Check all states have at least one visible region or overlay
    for (const [stateName, _] of theory.states) {
      const visibleRegions = Array.from(theory.regions.values())
        .filter(r => r.visibility.get(stateName) === true);
      
      const triggeredOverlays = Array.from(theory.overlays.values())
        .filter(o => o.trigger === `state == ${stateName}`);
      
      if (visibleRegions.length === 0 && triggeredOverlays.length === 0) {
        issues.push(`State ${stateName} has no visible regions or overlays`);
      }
    }
    
    // Check all regions have geometry
    for (const [regionName, region] of theory.regions) {
      if (!region.geometry || !region.geometry.type) {
        issues.push(`Region ${regionName} missing geometry`);
      }
    }
    
    return issues;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export {
  UICategory,
  LayoutFunctor,
  OverlayTransformation,
  UISignature,
  AULParser,
  TheoryLens,
  InvariantValidator,
  CompletenessValidator
};

// CLI usage
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const projectPath = process.argv[2] || '.';
  const aulPath = `${projectPath}/spec/ui.aul`;
  
  if (!existsSync(aulPath)) {
    console.error(`No AUL file found at ${aulPath}`);
    process.exit(1);
  }
  
  const source = readFileSync(aulPath, 'utf-8');
  const parser = new AULParser();
  const theory = parser.parse(source);
  
  console.log('Parsed UI Theory:');
  console.log(`  States: ${theory.states.size}`);
  console.log(`  Regions: ${theory.regions.size}`);
  console.log(`  Overlays: ${theory.overlays.size}`);
  console.log(`  Transitions: ${theory.transitions.length}`);
  
  const completeness = new CompletenessValidator();
  const issues = completeness.validate(theory);
  
  if (issues.length > 0) {
    console.log('\nCompleteness Issues:');
    issues.forEach(i => console.log(`  - ${i}`));
  } else {
    console.log('\n✓ Theory is complete');
  }
}
