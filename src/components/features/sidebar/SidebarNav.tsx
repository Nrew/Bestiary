import React, { useCallback } from "react";
import { OrnamentalDivider } from "@/components/shared/ornaments";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useSidebarContext } from "./SidebarContext";
import { CONTEXT_CONFIG } from "./constants";
import { typedKeys } from "@/lib/type-utils";
import type { ViewContext } from "@/types";

export const SidebarNav = React.memo(() => {
  const { currentContext } = useSidebarContext();
  const { changeContext } = useNavigationGuard();

  const handleContextChange = useCallback(async (context: ViewContext) => {
    if (context === currentContext) return;

    await changeContext(context);
  }, [changeContext, currentContext]);

  const renderContextButton = useCallback((context: ViewContext) => {
    const config = CONTEXT_CONFIG[context];
    const isActive = currentContext === context;

    return (
      <Button
        key={context}
        variant="ghost"
        onClick={() => {
          void handleContextChange(context);
        }}
        className={cn(
          "w-full h-20 flex-col gap-2 border rounded-lg transition-all duration-200 font-serif",
          "hover:scale-105 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-rune",
          isActive
            ? "border-rune/50 bg-rune/10 text-foreground font-semibold shadow-md"
            : "border-stone/30 hover:border-rune/40 hover:bg-rune/5 glass-panel"
        )}
        aria-label={`${isActive ? "Current section:" : "Switch to"} ${config.label}`}
        aria-current={isActive ? "page" : undefined}
      >
        <config.icon
          className={cn(
            "w-5 h-5 transition-colors",
            isActive ? config.color : "text-muted-foreground"
          )}
          aria-hidden="true"
        />
        <span className="text-sm">{config.label}</span>
      </Button>
    );
  }, [currentContext, handleContextChange]);

  return (
    <nav
      className="p-6 border-b border-rune/20"
      role="navigation"
      aria-label="Bestiary sections"
    >
      <div className="text-center mb-4">
        <h3 className="font-display text-base text-leather mb-2">
          Choose Section
        </h3>
        <div
          className="w-16 h-px bg-linear-to-r from-rune to-leather mx-auto"
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-2 gap-3" aria-label="Section selection">
        {typedKeys(CONTEXT_CONFIG).map(renderContextButton)}
      </div>

      <OrnamentalDivider variant="medieval" />
      <div className="text-center">
        <p
          className="text-sm text-muted-foreground font-serif italic"
          aria-live="polite"
          aria-label={`Currently viewing: ${CONTEXT_CONFIG[currentContext].description}`}
        >
          {CONTEXT_CONFIG[currentContext].description}
        </p>
      </div>
    </nav>
  );
});

SidebarNav.displayName = 'SidebarNav';
