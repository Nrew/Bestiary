/**
 * Allowlist of safe HTML tags for rich text content.
 * Based on OWASP recommendations for user-generated content.
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'span',
]);

/**
 * Allowlist of safe attributes per tag.
 * Prevents XSS through event handlers or dangerous attributes.
 */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  'a': new Set(['href', 'title', 'data-type', 'data-id', 'data-name']),
  'span': new Set(['class', 'data-type', 'data-id', 'data-name', 'data-wiki-id', 'data-wiki-type', 'data-wiki-broken', 'tabindex', 'role']),
  '*': new Set(['class']),
};

const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const SINGLE_PARAGRAPH_PATTERN = /^<p>((?:(?!<\/?p\b)[\s\S])*)<\/p>$/i;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

export function stripSingleParagraphWrapper(html: string): string {
  const trimmed = html.trim();
  const match = trimmed.match(SINGLE_PARAGRAPH_PATTERN);
  return match ? match[1] : html;
}

/**
 * Rich text is an offline, local document surface. Scheme URLs are blocked so
 * pasted content cannot navigate the webview or expose local files.
 */
export function isAllowedRichTextHref(href: string): boolean {
  const value = href.trim();
  if (value === "") return false;
  return !URL_SCHEME_PATTERN.test(value);
}

/**
 * Defense-in-depth HTML sanitizer; TipTap sanitizes on its own but untrusted
 * HTML (e.g. pasted from external sources) passes through this layer too.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // DOMParser does not execute scripts, making it safe for untrusted HTML.
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const walker = document.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  const nodesToRemove: Node[] = [];

  let node = walker.nextNode();
  while (node) {
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      nodesToRemove.push(node);
      node = walker.nextNode();
      continue;
    }

    const attrs = Array.from(element.attributes);
    for (const attr of attrs) {
      const attrName = attr.name.toLowerCase();
      const tagAllowedAttrs = ALLOWED_ATTRS[tagName] || new Set();
      const globalAllowedAttrs = ALLOWED_ATTRS['*'] || new Set();

      if (!tagAllowedAttrs.has(attrName) && !globalAllowedAttrs.has(attrName)) {
        element.removeAttribute(attr.name);
        continue;
      }

      // href must reference a local document path, not an external scheme.
      if (attrName === 'href') {
        if (!isAllowedRichTextHref(attr.value)) {
          element.removeAttribute(attr.name);
        }
      }

      // Remove any event handlers that might have slipped through
      if (attrName.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    }

    node = walker.nextNode();
  }

  for (const nodeToRemove of nodesToRemove) {
    nodeToRemove.parentNode?.removeChild(nodeToRemove);
  }

  return doc.body.innerHTML;
}

export function sanitizeInlineHtml(html: string): string {
  return stripSingleParagraphWrapper(sanitizeHtml(html));
}
