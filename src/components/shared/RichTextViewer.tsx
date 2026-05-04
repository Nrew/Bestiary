import React, { useMemo, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/components/ui/toast";
import { useAppStore, useMemoizedNameLookup } from "@/store/appStore";
import { useWikiLink } from "@/components/shared/wiki-link/WikiLinkProvider";
import { cn } from "@/lib/utils";
import type { ViewContext } from "@/types";
import { isViewContext } from "@/lib/type-guards";
import { escapeHtml, escapeHtmlAttribute, sanitizeHtml } from "@/lib/sanitize";

interface RichTextViewerProps {
  html: string;
  className?: string;
}

/**
 * Read-only renderer for the rich-text content authored in `RichTextEditor`.
 *
 * Lives in its own module (separate from `RichTextEditor`) so view-mode
 * pages do not pull TipTap/StarterKit (~130 KB gzip) into the main bundle.
 * The viewer only sanitizes HTML and rewrites `[[wiki-link]]` markers into
 * navigable spans; it never instantiates an editor.
 */
export const RichTextViewer: React.FC<RichTextViewerProps> = ({ html, className }) => {
  const nameLookup = useMemoizedNameLookup();
  const navigateToEntry = useAppStore((s) => s.navigateToEntry);
  const { showTooltip, hideTooltip } = useWikiLink();
  const toast = useToast();

  // Keep show/hide stable across re-renders without adding them to event handler deps
  const showTooltipRef = useRef(showTooltip);
  const hideTooltipRef = useRef(hideTooltip);
  useEffect(() => { showTooltipRef.current = showTooltip; hideTooltipRef.current = hideTooltip; }, [showTooltip, hideTooltip]);

  // Track which wiki-link span the cursor is currently over so onMouseOver
  // only calls showTooltip once on entry, not on every movement within it.
  const hoveredSpanRef = useRef<HTMLElement | null>(null);

  const processedHtml = useMemo(() => {
    if (!html) return "";
    const sanitized = sanitizeHtml(html);
    return sanitized.replace(/\[\[([^\]]+)\]\]/g, (_, name: string) => {
      const trimmed = name.trim();
      const display = escapeHtml(trimmed);
      const key = trimmed.toLowerCase();
      const item = nameLookup.get(key);
      if (item) {
        const ariaLabel = escapeHtmlAttribute(`${item.name} (${item.type})`);
        return `<span class="wiki-link wiki-link--found" data-wiki-id="${item.id}" data-wiki-type="${item.type}" tabindex="0" role="link" aria-label="${ariaLabel}">${display}</span>`;
      }
      const brokenLabel = escapeHtmlAttribute(`Broken link: ${trimmed}`);
      return `<span class="wiki-link wiki-link--broken" data-wiki-broken="true" role="link" aria-disabled="true" aria-label="${brokenLabel}">${display}</span>`;
    });
  }, [html, nameLookup]);

  const getWikiLinkData = (target: EventTarget | null): {
    element: HTMLElement;
    id: string;
    type: ViewContext;
  } | null => {
    if (!(target instanceof HTMLElement)) return null;
    const element = target.closest<HTMLElement>("[data-wiki-id]");
    const id = element?.dataset.wikiId;
    const type = element?.dataset.wikiType;
    if (!element || !id || !isViewContext(type)) return null;
    return { element, id, type };
  };

  const handleMouseOver = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const link = getWikiLinkData(e.target);
    const span = link?.element ?? null;
    if (span === hoveredSpanRef.current) return; // still inside the same span - do nothing
    const prev = hoveredSpanRef.current;
    hoveredSpanRef.current = span;
    // Moved off a wiki link; hide immediately without waiting for the async mouseleave.
    if (prev) hideTooltipRef.current();
    if (link) {
      showTooltipRef.current(link.id, link.type, link.element);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoveredSpanRef.current) hideTooltipRef.current();
    hoveredSpanRef.current = null;
  }, []);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    const link = getWikiLinkData(e.target);
    if (link) showTooltipRef.current(link.id, link.type, link.element);
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (getWikiLinkData(e.target)) {
      hideTooltipRef.current();
    }
  }, []);

  const activateWikiLinkTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    const foundLink = getWikiLinkData(target);
    if (foundLink) {
      // Clear browser selection so the selection anchor does not cause the
      // outer overflow-auto container to scroll-anchor on DOM mutation.
      window.getSelection()?.removeAllRanges();
      void navigateToEntry(foundLink.type, foundLink.id);
      return true;
    }
    if (target.closest("[data-wiki-broken]")) {
      toast.error("This link's target no longer exists in the bestiary.");
      return true;
    }
    return false;
  }, [navigateToEntry, toast]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (activateWikiLinkTarget(e.target)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [activateWikiLinkTarget]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      if (activateWikiLinkTarget(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, [activateWikiLinkTarget]);

  if (!processedHtml) return null;

  return (
    <div
      className={cn("prose dark:prose-invert max-w-none font-serif viewer-prose", className)}
      dangerouslySetInnerHTML={{ __html: processedHtml }}
      onClick={handleClick}
      onMouseOver={handleMouseOver}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
};
