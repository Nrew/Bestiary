import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import { useLazyEntry } from "@/hooks/useLazyEntry";
import { WikiTooltipBody } from "./WikiTooltipBody";
import { CONTEXT_REGISTRY } from "@/lib/context-config";
import type { BestiaryEntry, ViewContext } from "@/types";

type FetchEntry = (type: ViewContext, id: string) => Promise<BestiaryEntry>;

interface WikiLinkContextType {
  showTooltip: (id: string, type: ViewContext, element: HTMLElement) => void;
  hideTooltip: () => void;
  fetchEntry: FetchEntry;
}

const WikiLinkContext = createContext<WikiLinkContextType | null>(null);

export const useWikiLink = () => {
  const context = useContext(WikiLinkContext);
  if (!context)
    throw new Error("useWikiLink must be used within a WikiLinkProvider");
  return context;
};

interface TooltipState {
  id: string;
  type: ViewContext;
  element: HTMLElement | null;
  position: { top: number; left: number } | null;
  showAbove: boolean;
}

const initialTooltipState: TooltipState = {
  id: "",
  type: "entities",
  element: null,
  position: null,
  showAbove: true,
};

const TooltipContent: React.FC<{ id: string; type: ViewContext; fetchEntry: FetchEntry }> = ({ id, type, fetchEntry }) => {
  const { data, isLoading } = useLazyEntry(type, id, fetchEntry, true);
  return <WikiTooltipBody data={data} type={type} isLoading={isLoading} />;
};

const TOOLTIP_DELAY  = 60;  // ms before showing tooltip
const HIDE_DELAY     = 100; // ms before hiding tooltip (allows moving to tooltip)
const TOOLTIP_HEIGHT = 120; // approximate height for viewport edge detection
const TOOLTIP_ID     = "wiki-link-preview-tooltip";

export const WikiLinkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tooltip, setTooltip] = useState<TooltipState>(initialTooltipState);
  const [isVisible, setIsVisible] = useState(false);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isHoveringTooltipRef = useRef(false);
  const activeTriggerRef = useRef<HTMLElement | null>(null);

  // Shared promise cache so multiple links to the same target share one IPC call.
  // Keys are `${type}:${id}`. Cleared when nameVersion changes (renames, deletes).
  const entryCacheRef = useRef(new Map<string, Promise<BestiaryEntry>>());
  const nameVersion = useAppStore((s) => s.nameVersion);
  useEffect(() => { entryCacheRef.current.clear(); }, [nameVersion]);

  const fetchEntry = useCallback<FetchEntry>((type, id) => {
    const key = `${type}:${id}`;
    let p = entryCacheRef.current.get(key);
    if (!p) {
      p = CONTEXT_REGISTRY[type].api.getDetails(id);
      entryCacheRef.current.set(key, p);
    }
    return p;
  }, []);

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  // Immediately dismiss tooltip on any navigation so it never bleeds onto the next entry.
  const selectedId = useAppStore((s) => s.selectedId);
  useEffect(() => {
    clearTimeouts();
    activeTriggerRef.current?.removeAttribute("aria-describedby");
    activeTriggerRef.current = null;
    setIsVisible(false);
    setTooltip(initialTooltipState);
    isHoveringTooltipRef.current = false;
  }, [selectedId, clearTimeouts]);

  const hideTooltip = useCallback(() => {
    clearTimeouts();
    hideTimeoutRef.current = setTimeout(() => {
      if (!isHoveringTooltipRef.current) {
        activeTriggerRef.current?.removeAttribute("aria-describedby");
        activeTriggerRef.current = null;
        setIsVisible(false);
        setTooltip(initialTooltipState);
      }
    }, HIDE_DELAY);
  }, [clearTimeouts]);

  const showTooltip = useCallback(
    (id: string, type: ViewContext, element: HTMLElement) => {
      clearTimeouts();
      if (activeTriggerRef.current && activeTriggerRef.current !== element) {
        activeTriggerRef.current.removeAttribute("aria-describedby");
      }
      element.setAttribute("aria-describedby", TOOLTIP_ID);
      activeTriggerRef.current = element;

      // Defer both the layout read and the state write to after the delay so
      // the hover event handler returns instantly (no forced reflow, no render).
      // React 18 batches the two setState calls inside the same setTimeout into
      // one render, so the tooltip appears in a single paint.
      showTimeoutRef.current = setTimeout(() => {
        if (activeTriggerRef.current !== element) return;
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const showAbove = rect.top > TOOLTIP_HEIGHT || rect.top > (viewportHeight - rect.bottom);
        const position = showAbove
          ? { top: rect.top - 8,    left: rect.left + rect.width / 2 }
          : { top: rect.bottom + 8, left: rect.left + rect.width / 2 };
        setTooltip({ id, type, element, position, showAbove });
        setIsVisible(true);
      }, TOOLTIP_DELAY);
    },
    [clearTimeouts]
  );

  // Track mouse leaving the trigger element
  useEffect(() => {
    const element = tooltip.element;
    if (!element) return;

    const handleMouseLeave = () => {
      hideTooltip();
    };

    element.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      element.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [tooltip.element, hideTooltip]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeTriggerRef.current?.removeAttribute("aria-describedby");
      activeTriggerRef.current = null;
      clearTimeouts();
    };
  }, [clearTimeouts]);

  const handleTooltipPointerEnter = () => {
    isHoveringTooltipRef.current = true;
    clearTimeouts();
  };

  const handleTooltipPointerLeave = () => {
    isHoveringTooltipRef.current = false;
    hideTooltip();
  };

  const tooltipPosition =
    isVisible && tooltip.position !== null && tooltip.id !== ""
      ? tooltip.position
      : null;

  const contextValue = React.useMemo(
    () => ({ showTooltip, hideTooltip, fetchEntry }),
    [showTooltip, hideTooltip, fetchEntry]
  );

  return (
    <WikiLinkContext.Provider value={contextValue}>
      {children}
      {tooltipPosition && (
        <div
          id={TOOLTIP_ID}
          ref={tooltipRef}
          role="tooltip"
          className="fixed z-50 w-72 rounded-lg border border-leather/20 bg-card/95 backdrop-blur-sm shadow-[0_8px_32px_oklch(18%_0.01_45/0.15),inset_0_1px_0_oklch(94%_0.02_75/0.6)] animate-in fade-in-0 zoom-in-95 overflow-hidden"
          style={{
            top:       tooltipPosition.top,
            left:      tooltipPosition.left,
            transform: tooltip.showAbove
              ? "translate(-50%, -100%)"
              : "translate(-50%, 0)",
          }}
          onPointerEnter={handleTooltipPointerEnter}
          onPointerLeave={handleTooltipPointerLeave}
        >
          <TooltipContent key={`${tooltip.type}:${tooltip.id}`} id={tooltip.id} type={tooltip.type} fetchEntry={fetchEntry} />
        </div>
      )}
    </WikiLinkContext.Provider>
  );
};
