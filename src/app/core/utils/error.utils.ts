/**
 * @fileoverview Shared error-handling utilities for feature stores.
 * Provides a consistent way to extract a human-readable message from any
 * thrown value, including Angular `HttpErrorResponse` objects.
 */
import { HttpErrorResponse } from '@angular/common/http';

/**
 * Extracts a user-readable error message from any thrown value.
 *
 * Priority order:
 * 1. `HttpErrorResponse` — uses the body `message` field, then `statusText`.
 * 2. `Error` — uses `Error.message`.
 * 3. Anything else — returns the provided fallback string.
 *
 * @param e - The caught value (typed `unknown` per strict catch).
 * @param fallback - Returned when no readable message can be extracted.
 * @returns A non-empty human-readable error string.
 */
export function extractErrorMessage(
  e: unknown,
  fallback = 'An unexpected error occurred',
): string {
  if (e instanceof HttpErrorResponse) {
    return (e.error as { message?: string })?.message ?? e.statusText ?? fallback;
  }
  if (e instanceof Error) {
    return e.message;
  }
  return fallback;
}
