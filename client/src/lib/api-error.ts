/**
 * Reads the error text an API response carried (`{ error: string }`) out of a
 * caught value. Returns undefined for anything that isn't shaped like that, so
 * callers fall back to their own message.
 */
export function apiErrorMessage(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined;
  const response = err.response;
  if (typeof response !== 'object' || response === null || !('data' in response)) return undefined;
  const data = response.data;
  if (typeof data !== 'object' || data === null || !('error' in data)) return undefined;
  return typeof data.error === 'string' ? data.error : undefined;
}

/** The `message` of a thrown Error, or undefined when the value isn't an Error. */
export function errorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}
