/**
 * Strip HTML tags from user input to prevent stored XSS.
 * Keeps the text content, removes all < > enclosed tags.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Validate that a date string parses to a valid Date.
 * Returns the Date or null if invalid.
 */
export function parseDate(input: string): Date | null {
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}
