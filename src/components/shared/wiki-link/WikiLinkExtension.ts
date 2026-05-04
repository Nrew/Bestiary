import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { ViewContext } from "@/types";
import { isViewContext } from "@/lib/type-guards";

export type WikiLinkItem = { id: string; name: string; type: ViewContext };
export type NameLookupMap = Map<string, WikiLinkItem>;

export type NameLookupAccessor = NameLookupMap | { current: NameLookupMap };

/** Transaction meta: recompute wiki-link decorations when the name lookup map changes without a doc edit. */
export const WIKI_LINK_LOOKUP_REFRESH = "wikiLinkLookupRefresh";

export interface WikiLinkOptions {
  onLinkHover: (id: string, type: ViewContext, element: HTMLElement) => void;
  onLinkClick: (id: string, type: ViewContext) => void;
  onBrokenLinkClick?: () => void;
  onSuggestionChange?: (query: string | null, coords: { top: number; left: number } | null) => void;
  nameLookup: NameLookupAccessor;
}

function getLinkData(element: Element): { id: string; type: ViewContext } | null {
  const id = element instanceof HTMLElement ? element.dataset.id : undefined;
  const type = element instanceof HTMLElement ? element.dataset.type : undefined;
  if (!id || !isViewContext(type)) return null;
  return { id, type };
}

function resolveLookup(accessor: NameLookupAccessor): NameLookupMap {
  if (accessor instanceof Map) return accessor;
  return accessor.current;
}

// Each [[name]] token is split into three non-overlapping inline decorations:
// bracket `[[`, content, bracket `]]`. ProseMirror does not allow a single
// decoration to carry different specs across sub-ranges, so the brackets (styled
// with wiki-link-bracket) must be separate from the content span (which carries
// the ARIA attributes and the wikiLink spec consumed by event handlers).
function findWikiLinks(doc: ProseMirrorNode, nameLookup: NameLookupMap): DecorationSet {
  const decorations: Decoration[] = [];
  const linkRegex = /\[\[([^\]]+)\]\]/g;

  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (!node.isText || !node.text) return;

    let match;
    while ((match = linkRegex.exec(node.text)) !== null) {
      const rawText = match[1].trim();
      const linkText = rawText.toLowerCase();
      const item = nameLookup.get(linkText);
      const from = pos + match.index;
      const to = from + match[0].length;
      const linkContentFrom = from + 2;
      const linkContentTo = to - 2;

      decorations.push(
        Decoration.inline(from, linkContentFrom, {
          class: "wiki-link-bracket",
        })
      );

      const ariaLabel = item
        ? `${item.name} (${item.type})`
        : `Broken link: ${rawText}`;
      const linkAttrs: Record<string, string> = {
        class: `wiki-link ${item ? "wiki-link--found" : "wiki-link--broken"}`,
        "data-id": item?.id || "",
        "data-type": item?.type || "unknown",
        role: "link",
        tabindex: "0",
        "aria-label": ariaLabel,
      };
      if (!item) {
        linkAttrs["aria-disabled"] = "true";
      }
      decorations.push(
        Decoration.inline(
          linkContentFrom,
          linkContentTo,
          linkAttrs,
          {
            wikiLink: item ? { id: item.id, type: item.type } : { id: "", type: "unknown" as const },
          }
        )
      );

      decorations.push(
        Decoration.inline(linkContentTo, to, {
          class: "wiki-link-bracket",
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const WikiLinkExtension = Extension.create<WikiLinkOptions>({
  name: "wikiLink",

  addOptions() {
    return {
      onLinkHover: () => {},
      onLinkClick: () => {},
      onSuggestionChange: undefined,
      nameLookup: new Map(),
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key: new PluginKey("wikiLinkSuggestion"),
        view() {
          return {
            update(view) {
              const { state } = view;
              const { selection } = state;

              if (!selection.empty) {
                options.onSuggestionChange?.(null, null);
                return;
              }

              const { $from } = selection;
              const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\0");
              const openIdx = textBefore.lastIndexOf("[[");

              if (openIdx === -1) {
                options.onSuggestionChange?.(null, null);
                return;
              }

              const afterOpen = textBefore.slice(openIdx + 2);
              if (afterOpen.includes("]]")) {
                options.onSuggestionChange?.(null, null);
                return;
              }

              const coords = view.coordsAtPos($from.pos);
              options.onSuggestionChange?.(afterOpen, { top: coords.bottom, left: coords.left });
            },
          };
        },
      }),
      new Plugin({
        key: new PluginKey("wikiLink"),
        state: {
          // Resolve lookup at apply-time so ref-backed maps refresh without recreating the extension.
          init: (_, { doc }) => findWikiLinks(doc, resolveLookup(options.nameLookup)),
          apply: (tr, old) => {
            if (tr.docChanged || tr.getMeta(WIKI_LINK_LOOKUP_REFRESH)) {
              return findWikiLinks(tr.doc, resolveLookup(options.nameLookup));
            }
            return old;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick(_view, _pos, event) {
            if (!(event.target instanceof HTMLElement)) return false;
            const linkEl = event.target.closest(".wiki-link");
            if (!linkEl) return false;

            event.preventDefault();
            event.stopPropagation();
            // Clear browser text selection to prevent the gray selection highlight
            // that ProseMirror applies to the clicked decoration span.
            window.getSelection()?.removeAllRanges();

            const linkData = getLinkData(linkEl);

            if (linkData) {
              options.onLinkClick?.(linkData.id, linkData.type);
            } else {
              options.onBrokenLinkClick?.();
            }
            return true;
          },
          handleDOMEvents: {
            keydown: (_view, event) => {
              if (event.key !== "Enter" && event.key !== " ") return false;
              const target = event.target;
              if (!(target instanceof HTMLElement)) return false;
              const linkEl = target.closest(".wiki-link");
              if (!linkEl) return false;

              event.preventDefault();
              event.stopPropagation();
              window.getSelection()?.removeAllRanges();

              const linkData = getLinkData(linkEl);
              if (linkData) {
                options.onLinkClick?.(linkData.id, linkData.type);
              } else {
                options.onBrokenLinkClick?.();
              }
              return true;
            },
            mouseover: (_view, event) => {
              if (!(event.target instanceof HTMLElement)) return false;

              const link = event.target.closest(".wiki-link");
              if (link) {
                const linkData = getLinkData(link);
                if (linkData && link instanceof HTMLElement) {
                  options.onLinkHover?.(linkData.id, linkData.type, link);
                }
                return false;
              }

              const bracket = event.target.closest(".wiki-link-bracket");
              if (bracket) {
                const next = bracket.nextElementSibling as HTMLElement | null;
                const prev = bracket.previousElementSibling as HTMLElement | null;
                const adjacent = next?.classList.contains("wiki-link") ? next
                                : prev?.classList.contains("wiki-link") ? prev
                                : null;
                if (adjacent) {
                  const linkData = getLinkData(adjacent);
                  if (linkData) {
                    options.onLinkHover?.(linkData.id, linkData.type, adjacent);
                  }
                }
              }

              return false;
            },
          },
        },
      }),
    ];
  },
});
