import React, { useEffect, useCallback, useMemo } from "react";
import { useItem, useAppStore } from "@/store/appStore";
import { Icon } from "@/components/shared/Icon";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useWikiLink } from "@/components/shared/wiki-link/WikiLinkProvider";
import { RARITY_LABELS } from "@/lib/dnd/constants";
import type { Entity, LootDrop, Rarity } from "@/types";

const RARITY_DOT_CLASS: Record<Rarity, string> = {
  common:    "bg-stone/60",
  uncommon:  "bg-jade/70",
  rare:      "bg-sapphire/70",
  veryRare:  "bg-violet/70",
  legendary: "bg-rune/70",
  mythic:    "bg-copper/70",
  unique:    "bg-wine/70",
};

const LootRow: React.FC<{ loot: LootDrop }> = ({ loot }) => {
  const item = useItem(loot.itemId);
  const { navigateToEntry } = useNavigationGuard();
  const { showTooltip, hideTooltip } = useWikiLink();

  const handleNavigateToItem = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    await navigateToEntry("items", loot.itemId);
  }, [navigateToEntry, loot.itemId]);

  if (!item) {
    return (
      <div className="flex items-center gap-3 py-3 border-b border-rune/15 last:border-0">
        <span className="flex-1 text-sm text-destructive/70">
          Unknown item
          <span className="ml-2 text-xs text-muted-foreground">(ID: {loot.itemId.slice(0, 8)}...)</span>
        </span>
      </div>
    );
  }

  const chancePercent = loot.dropChance * 100;

  return (
    <div className="group flex items-center gap-3 py-3 border-b border-rune/15 last:border-0 -mx-5 px-5 transition-colors hover:bg-rune/4 rounded-sm">
      <Icon
        category="item"
        name={item.type}
        size="sm"
        className="shrink-0 text-foreground/35"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(event) => { void handleNavigateToItem(event); }}
        onMouseEnter={(e) => showTooltip(loot.itemId, "items", e.currentTarget)}
        onMouseLeave={() => hideTooltip()}
        className="flex-1 min-w-0 font-display font-bold text-primary text-left hover:underline underline-offset-2 cursor-pointer transition-colors hover:text-primary/80 truncate"
        title={`View ${item.name} in Items`}
      >
        {item.name}
        {loot.quantity !== "1" && (
          <span className="ml-1.5 text-xs font-sans text-ink/40 font-normal">×{loot.quantity}</span>
        )}
      </button>
      <div className="shrink-0 flex items-center gap-3">
        {item.rarity && (
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${RARITY_DOT_CLASS[item.rarity]}`}
            title={RARITY_LABELS[item.rarity]}
          />
        )}
        <div className="w-20 h-1.5 rounded-full bg-ink/8 overflow-hidden" title={`${chancePercent.toFixed(0)}% drop chance`}>
          <div
            className="h-full rounded-full bg-leather/50 transition-all"
            style={{ width: `${chancePercent}%` }}
          />
        </div>
        <span className="text-sm tabular-nums text-ink/55 w-8 text-right">
          {chancePercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export const LootSection: React.FC<{ data: Entity }> = ({ data }) => {
  const inventory = useMemo(() => data.inventory || [], [data.inventory]);
  const ensureItemsLoaded = useAppStore((s) => s.ensureItemsLoaded);

  useEffect(() => {
    if (inventory.length > 0) {
      const itemIds = inventory.map(loot => loot.itemId).filter(Boolean);
      void ensureItemsLoaded(itemIds);
    }
  }, [inventory, ensureItemsLoaded]);

  if (inventory.length === 0) {
    return null;
  }

  return (
    <section>
      <header className="flex flex-col items-center text-center">
        <Icon category="item" name="loot" size="xl" className="text-primary/50" />
        <h2 className="font-display text-3xl text-primary">Loot Table</h2>
      </header>
      <div className="stone-plate mt-4 py-1">
        {inventory.map((loot, index) => (
          <LootRow key={`${loot.itemId}-${index}`} loot={loot} />
        ))}
      </div>
    </section>
  );
};
