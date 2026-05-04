import React from "react";
import { useEntitiesMap, useAppStore } from "@/store/appStore";
import { useWikiLink } from "@/components/shared/wiki-link/WikiLinkProvider";
import { entityApi } from "@/lib/api";
import { isNotFoundError } from "@/lib/errors";
import { getLogger } from "@/lib/logger";

const log = getLogger("EntityLink");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResolveState = "idle" | "loading" | "found" | "missing";

/**
 * Renders a string value. If it matches a UUID it tries to resolve the
 * corresponding entity name and renders it as a clickable link with a
 * hover preview tooltip via WikiLinkProvider.
 * Falls back to verbatim text if the entity cannot be found.
 */
export const EntityLink: React.FC<{ value: string | number }> = ({ value }) => {
  const strValue = String(value);
  const isUuid = UUID_REGEX.test(strValue);
  const entitiesMap = useEntitiesMap();
  const navigateToEntry = useAppStore((s) => s.navigateToEntry);
  const { showTooltip, hideTooltip } = useWikiLink();
  const [state, setState] = React.useState<ResolveState>("idle");
  const [entityName, setEntityName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isUuid || state !== "idle") return;
    const stored = entitiesMap.get(strValue);
    if (stored) {
      setEntityName(stored.name);
      setState("found");
      return;
    }
    setState("loading");
    let cancelled = false;
    entityApi
      .getDetails(strValue)
      .then((e) => { if (!cancelled) { setEntityName(e.name); setState("found"); } })
      .catch((err) => {
        if (cancelled) return;
        if (isNotFoundError(err)) {
          log.debug("entity not found for UUID field", strValue);
        } else {
          log.warn("failed to resolve entity UUID for display", strValue, err);
        }
        setState("missing");
      });
    return () => { cancelled = true; };
  // entitiesMap checked once on mount; omitted from deps intentionally
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strValue, isUuid, state]);

  if (!isUuid || state === "missing") return <span>{strValue}</span>;
  if (state === "idle" || state === "loading") return <span className="text-muted-foreground">…</span>;

  return (
    <span
      role="button"
      tabIndex={0}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        // Blur before unmount so browser does not scroll-anchor the outer
        // overflow container when this element is removed from the DOM.
        e.currentTarget.blur();
        window.getSelection()?.removeAllRanges();
        void navigateToEntry("entities", strValue);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.blur();
          window.getSelection()?.removeAllRanges();
          void navigateToEntry("entities", strValue);
        }
      }}
      onMouseEnter={(e) => showTooltip(strValue, "entities", e.currentTarget)}
      onMouseLeave={() => hideTooltip()}
      onFocus={(e) => showTooltip(strValue, "entities", e.currentTarget)}
      onBlur={() => hideTooltip()}
      className="wiki-link wiki-link--found text-sm"
    >
      {entityName}
    </span>
  );
};
