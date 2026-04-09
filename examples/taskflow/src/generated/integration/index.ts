/**
 * @phoenix-iu: 379356eb108fd53b5842cafb023d0776f1cec812c8b561a0e8e41e124f789cc5
 * @phoenix-name: Integration Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 1195e2f9dc63ac5d4c567883d7d1f72eee36c83e62f22b6021c6ee86282a11a0
 * Constraint: No component shall render without reading current localStorage state
 * 
 * @phoenix-canon: 6bb5fa7fddac5915409456f80480000012d837e22ca38090ad136c062adb0114
 * Constraint: No state change shall occur without updating localStorage first
 * 
 * @phoenix-canon: 5a52732aa411c4ba9de24b7dde1093ed95ccb949e55483c9ee62accff2138900
 * Constraint: Re-renders shall be synchronous following state updates
 * 
 * @phoenix-canon: 4d3caa9e1a345c0e551eaaf06682564b7855ee091d8130fc60b36a547a33d655
 * Constraint: All event handlers shall be attached on initial page load
 * 
 * @phoenix-canon: 8a0318be073275b7b03837ad9569fbd7e9f51faaabed47a7c3a4301495af657d
 * Constraint: Components shall not have external dependencies with all data from localStorage
 * 
 * Integration Domain - Risk Tier: high
 */

import { getAllTasks, getMetrics } from "../app/store.js";

/**
 * Verify all integration invariants
 * @phoenix-canon: 1195e2f9dc63ac5d4c567883d7d1f72eee36c83e62f22b6021c6ee86282a11a0
 * @phoenix-canon: 8a0318be073275b7b03837ad9569fbd7e9f51faaabed47a7c3a4301495af657d
 */
export function verifyIntegrationInvariants(): { allPass: boolean; results: Record<string, boolean> } {
  const results: Record<string, boolean> = {
    localStorageAvailable: typeof localStorage !== "undefined",
    canReadTasks: (() => {
      try {
        getAllTasks();
        return true;
      } catch {
        return false;
      }
    })(),
    canReadMetrics: (() => {
      try {
        getMetrics();
        return true;
      } catch {
        return false;
      }
    })()
  };
  
  return {
    allPass: Object.values(results).every(v => v),
    results
  };
}

/**
 * Initialize the application
 * @phoenix-canon: 4d3caa9e1a345c0e551eaaf06682564b7855ee091d8130fc60b36a547a33d655
 */
export function initializeApp(): void {
  // Seed sample data if empty
  const { seedData } = require("../app/store.js");
  seedData();
}

/**
 * Check integration health
 */
export function checkIntegrationHealth(): { healthy: boolean; diagnostics: string[] } {
  const diagnostics: string[] = [];
  
  // Check localStorage
  if (typeof localStorage === "undefined") {
    diagnostics.push("ERROR: localStorage not available");
    return { healthy: false, diagnostics };
  }
  
  diagnostics.push("OK: localStorage available");
  
  // Check state reading
  try {
    const tasks = getAllTasks();
    diagnostics.push(`OK: Can read tasks (${tasks.length} found)`);
    
    const metrics = getMetrics();
    diagnostics.push(`OK: Can read metrics (${metrics.total} total)`);
  } catch (e) {
    diagnostics.push(`ERROR: Failed to read state: ${e}`);
    return { healthy: false, diagnostics };
  }
  
  return { healthy: true, diagnostics };
}
