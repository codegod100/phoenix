import { Hono } from 'hono';
import { z } from 'zod';

const router = new Hono();

// Global error handler middleware
router.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// Middleware to handle invalid JSON
router.use('*', async (c, next) => {
  if (c.req.method === 'POST' || c.req.method === 'PUT' || c.req.method === 'PATCH') {
    const contentType = c.req.header('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        await c.req.json();
      } catch (error) {
        return c.json({ error: 'Invalid JSON in request body' }, 400);
      }
    }
  }
  await next();
});

// Helper function to format Zod validation errors
export function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map(issue => {
    const path = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
    return `${issue.message}${path}`;
  });
  return issues.join(', ');
}

// Helper function to handle validation failures
export function handleValidationError(result: z.SafeParseError<any>) {
  return { error: formatValidationError(result.error) };
}

// Helper function to create standardized error responses
export function createErrorResponse(message: string, status: number = 400) {
  return { error: message };
}

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '1c24c3f052838c88bb9df110ee8d74cace83ad14ca7788e1dea362979cc526b9',
  name: 'Error Handling',
  risk_tier: 'low',
  canon_ids: [3 as const],
} as const;