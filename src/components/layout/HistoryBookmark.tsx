import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { getContextConfig } from "@/lib/context-config";
import { useAppStore, useNavBack } from "@/store/appStore";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";

export function HistoryBookmark() {
  const navBack = useNavBack();
  const entriesByContext = useAppStore((s) => s.data);
  const { goBack, goBackTo } = useNavigationGuard();
  const [open, setOpen] = React.useState(false);

  if (navBack.length === 0) return null;

  const items = navBack
    .map((entry, idx) => ({ ...entry, historyIndex: idx }))
    .reverse();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Button
          variant="ghostLeather"
          size="icon"
          onClick={(e) => {
            if (e.shiftKey || e.altKey) {
              setOpen((v) => !v);
              return;
            }
            void goBack();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setOpen((v) => !v);
          }}
          aria-label="Flip back one page (right-click for history)"
          aria-haspopup="menu"
          aria-expanded={open}
          title="Click: back · Right-click: history"
        >
          <Bookmark className="h-5 w-5" />
        </Button>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-72 p-0 bg-parchment border-rune/30",
          "shadow-[0_8px_24px_oklch(0%_0_0/0.25),0_0_0_1px_var(--color-rune-10)]",
        )}
      >
        <div className="border-b border-rune/20 px-3 py-2 font-display text-xs tracking-[0.2em] uppercase text-leather">
          Recent Codex Pages
        </div>
        <ul role="menu" className="max-h-80 overflow-y-auto py-1">
          {items.map((item) => {
            const config = getContextConfig(item.context);
            const name =
              entriesByContext[item.context].entries.get(item.id)?.name ??
              `${config.label} ${item.id.slice(0, 8)}`;
            return (
              <li key={`${item.context}:${item.id}:${item.historyIndex}`} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    void goBackTo(item.historyIndex);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-1.5 text-left font-serif text-sm text-ink",
                    "hover:bg-rune/10 focus:bg-rune/10 focus:outline-none",
                  )}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rune/50" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-xxs uppercase tracking-widest text-ink-muted">
                      {config.label}
                    </div>
                    <div className="truncate">{name}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
