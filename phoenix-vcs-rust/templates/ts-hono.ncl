# TypeScript Hono Server Template
# Complete prompt as single string (parser-compatible)

{
  template_version = "2.0",
  template_name = "ts-hono",
  language = "typescript",
  framework = "hono",

  llm_prompt = m%"
You are a CODE GENERATOR ONLY. Output valid TypeScript code using HONO framework.

ABSOLUTE RULES - VIOLATION = INVALID OUTPUT:
1. NO explanations, NO markdown ```, NO reasoning
2. START with: // phoenix: iu_id = "{{iu_id}}"
3. FORBIDDEN: Multiple files or modules - ONLY ONE self-contained file
4. FORBIDDEN: Extra boilerplate (config, utils, models directories)
5. Generate EXACTLY what requirements specify - no creative additions
6. All code must be inline in a single file - no external references

TYPESCRIPT/HONO REQUIREMENTS:
7. MUST use strict TypeScript with proper type annotations
8. MUST import from 'hono' and 'hono/*' packages only
9. MUST define all types/interfaces inline - no external imports
10. MUST use Bun.runtime or Node.js compatible patterns
11. Use proper HTTP status codes (200, 201, 204, 400, 401, 404, 500)
12. Handle errors with try/catch and return proper JSON error responses
13. Use c.json() for responses, never raw return
14. Implement proper async/await for async operations
15. Use descriptive variable names with proper casing (camelCase for variables/functions, PascalCase for types)
16. Maximum line length: 100 characters

HONO FRAMEWORK RULES:
17. MUST import: import { Hono } from 'hono'
18. MUST create app: const app = new Hono()
19. MUST use proper route patterns: app.get(), app.post(), app.put(), app.patch(), app.delete()
20. MUST use proper parameter extraction: c.req.param('id'), c.req.query('key'), c.req.json()
21. MUST use proper context methods: c.json(data, status), c.text(), c.html()
22. MUST implement proper middleware with app.use()
23. MUST export app as default: export default app
24. Type all route handlers: app.get('/path', (c) => { ... }) with proper return types
25. Use Hono's built-in types: Context, MiddlewareHandler, Env
26. For auth, use Hono's bearerAuth or jwt middleware from 'hono/auth' or 'hono/jwt'
27. For CORS, import from 'hono/cors' and use cors({ origin: '*' })
28. For validation, use zod or 'hono/validator' with zValidator

ROUTE HANDLER PATTERNS:
29. GET /resource -> List all
30. GET /resource/:id -> Get one by ID
31. POST /resource -> Create new
32. PUT /resource/:id -> Full update
33. PATCH /resource/:id -> Partial update
34. DELETE /resource/:id -> Delete
35. Always return proper JSON structure: { data, error?, meta? }

MIDDLEWARE PATTERNS:
36. Logger: app.use(logger()) from 'hono/logger'
37. CORS: app.use(cors({ origin: '*', allowMethods: ['GET', 'POST'] }))
38. Auth: app.use('/protected', bearerAuth({ token: process.env.TOKEN }))
39. Rate limit: implement custom or use simple counter
40. Error handling: app.onError((err, c) => c.json({ error: err.message }, 500))

REQUIREMENTS TO IMPLEMENT:
{{requirements}}

Generate a complete Hono TypeScript server application. USE ONLY THESE PATTERNS:
1. All required imports from 'hono' packages
2. Type definitions for all data models
3. Proper route handlers with full type annotations
4. Error handling in all async operations
5. Middleware stack in correct order (logger -> cors -> auth -> routes)
6. Health check endpoint at GET /health
7. Export app as default
8. Bun.serve or app.fetch for runtime

OUTPUT ONLY RAW TYPESCRIPT CODE. NO MARKDOWN. NO EXPLANATIONS.
"%m,

  code_template = m%"
// phoenix: iu_id = "{{iu_id}}"

import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import type { Context } from 'hono';

// Types
interface HealthResponse {
  status: string;
  timestamp: string;
}

// Initialize Hono app
const app = new Hono();

// Middleware
app.use(logger());
app.use(cors({ 
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c: Context) => {
  const response: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
  return c.json(response, 200);
});

// Routes
app.get('/', (c: Context) => {
  return c.json({ message: '{{name}} API' }, 200);
});

// Error handling
app.onError((err: Error, c: Context) => {
  console.error('Error:', err);
  return c.json({ 
    error: 'Internal Server Error',
    message: err.message 
  }, 500);
});

// 404 handler
app.notFound((c: Context) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Export for Bun/Node
export default app;

// Bun serve (comment out for Node/Deno)
if (typeof Bun !== 'undefined') {
  Bun.serve({
    fetch: app.fetch,
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  });
}
"%m,

  package_json = {
    name = "{{name}}",
    version = "{{version}}",
    description = "{{description}}",
    type = "module",
    scripts = {
      dev = "bun run --hot index.ts",
      start = "bun run index.ts",
      build = "bun build index.ts --outdir ./dist",
      typecheck = "tsc --noEmit",
    },
    dependencies = {
      hono = "^4.0.0",
    },
    devDependencies = {
      "@types/bun" = "latest",
      typescript = "^5.3.0",
    },
  },

  tsconfig = {
    compilerOptions = {
      target = "ES2022",
      module = "ESNext",
      moduleResolution = "bundler",
      strict = true,
      esModuleInterop = true,
      skipLibCheck = true,
      forceConsistentCasingInFileNames = true,
      declaration = true,
      outDir = "./dist",
      rootDir = ".",
      resolveJsonModule = true,
      types = ["bun"],
    },
    include = ["*.ts", "src/**/*.ts"],
    exclude = ["node_modules", "dist"],
  },

  flake = {
    build_type = "bun",
    packages = ["bun", "nodejs"],
    scripts = {
      dev = "bun run --hot index.ts",
      start = "bun run index.ts",
    },
  },
}
