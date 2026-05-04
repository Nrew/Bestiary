import React from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, X } from "lucide-react";
import { useSidebarContext } from "./SidebarContext";

export const SidebarHeader = React.memo(() => {
  const { onClose } = useSidebarContext();

  return (
    <header
      className="shrink-0 flex items-center justify-between p-6 border-b border-rune/30"
      role="banner"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 glass-panel rounded-lg flex items-center justify-center border border-rune/30"
          aria-hidden="true"
        >
          <BookOpen className="w-5 h-5 text-rune" />
        </div>
        <div>
          <h2 className="text-xl font-bold font-display text-leather">Table of Contents</h2>
          <p className="text-sm text-muted-foreground font-serif italic">Navigate the archives</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-10 w-10 text-stone hover:bg-rune/10 hover:text-leather transition-colors"
        aria-label="Close table of contents"
        title="Close sidebar"
      >
        <X className="w-5 h-5" />
      </Button>
    </header>
  );
});

SidebarHeader.displayName = "SidebarHeader";
