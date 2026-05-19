import type { ZodIssue } from 'zod';

// Thrown by the API client when input fails validation — either via the
// shared-schema pre-parse before a request is sent, or via a 400 response
// body of shape `{ error: 'ValidationError', issues: [...] }` from the
// server. Both paths produce the same class so callers can render field
// errors without caring where the validation failed.
export class ValidationError extends Error {
  readonly issues: ZodIssue[];
  readonly source: 'client' | 'server';

  constructor(issues: ZodIssue[], source: 'client' | 'server' = 'client') {
    super('Validation failed');
    this.name = 'ValidationError';
    this.issues = issues;
    this.source = source;
  }

  // Look up the message for a specific top-level field path. Returns
  // undefined when no issue matches — callers can fall back to a toast
  // or render a generic error in that case.
  messageFor(field: string): string | undefined {
    return this.issues.find((issue) => issue.path[0] === field)?.message;
  }

  allMessages(): string[] {
    return this.issues.map((issue) => issue.message);
  }
}
