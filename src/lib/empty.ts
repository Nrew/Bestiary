/**
 * Emptiness predicates used to decide whether a view-mode section has anything
 * worth rendering. Keep these centralized so that "what counts as empty" is
 * one decision the codebase can audit, instead of dozens of ad-hoc checks.
 *
 * Conventions baked into these helpers:
 *   - Empty string, whitespace-only, and `null`/`undefined` are empty.
 *   - For rich text: TipTap-style placeholders such as `<p></p>` and
 *     `<p><br></p>` are empty. Tags with no text content are empty unless they
 *     are media tags (img/video/audio) which carry meaning by themselves.
 *   - Empty arrays and empty plain objects are empty.
 *   - Numeric 0 and boolean false are NOT empty; callers decide at the call
 *     site whether they are meaningful in context.
 */

/**
 * Returns true when the given HTML has any user-visible content. Strips tags
 * and common entities, then checks for non-whitespace text. Standalone media
 * elements (img/video/audio) count as content even when surrounding text is
 * empty.
 */
export function hasRichTextContent(
  html: string | null | undefined
): html is string {
  if (typeof html !== "string") return false;
  if (/<(img|video|audio)\b/i.test(html)) return true;
  const stripped = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();
  return stripped.length > 0;
}

/** True when the value is a string with at least one non-whitespace character. */
export function hasMeaningfulString(
  value: string | null | undefined
): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** True when the value is a non-empty array. */
export function hasItems<T>(arr: readonly T[] | null | undefined): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

/** True when the value is a plain object with at least one own enumerable key. */
export function hasObjectKeys(
  obj: Record<string, unknown> | null | undefined
): boolean {
  return obj !== null && obj !== undefined && Object.keys(obj).length > 0;
}
