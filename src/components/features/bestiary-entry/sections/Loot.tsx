import React, { useEffect, useCallback, useMemo } from "react";
import { useItem, useAppStore } from "@/store/appStore";
import { Icon } from "@/components/shared/Icon";
import { Badge } from "@/components/ui/badge";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useWikiLink } from "@/components/shared/wiki-link/WikiLinkProvider";
import { getRarityClassName } from "@/lib/theme";
import { RARITY_LABELS } from "@/lib/dnd/constants";
import type { Entity, LootDrop } from "@/types";
import { OrnamentalDivider } from "@/components/shared/ornaments";

const LootItem: React.FC<{ loot: LootDrop }> = ({ loot }) => {
  const item = useItem(loot.itemId);
  const { navigateToEntry } = useNavigationGuard();
  const { showTooltip, hideTooltip } = useWikiLink();

  const handleNavigateToItem = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    await navigateToEntry("items", loot.itemId);
  }, [navigateToEntry, loot.itemId]);

  if (!item) {
    return (
      <div className="flex items-center gap-2 p-2 rounded border border-destructive/30 bg-destructive/5">
        <span className="text-destructive/70 text-sm">Unknown item</span>
        <span className="text-muted-foreground text-xs">(ID: {loot.itemId.slice(0, 8)}...)</span>
      </div>
    );
  }

  return (
    <div className="stone-plate relative p-4 overflow-hidden">
      {item.rarity && (
        <Badge
          variant="outline"
          className={`${getRarityClassName(item.rarity)} absolute top-2 right-2 text-xs font-sans backdrop-blur-sm`}>
          {RARITY_LABELS[item.rarity]}
        </Badge>
      )}
      <div className="text-center">
        <Icon
          category="item"
          name={item.type}
          size="lg"
          className="mx-auto mb-2 text-foreground/50"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(event) => {
            void handleNavigateToItem(event);
          }}
          onMouseEnter={(e) => showTooltip(loot.itemId, "items", e.currentTarget)}
          onMouseLeave={() => hideTooltip()}
          className="font-display font-bold text-lg text-primary hover:underline underline-offset-2 cursor-pointer transition-colors hover:text-primary/80"
          title={`View ${item.name} in Items`}
        >
          {item.name}
        </button>
        <div className="text-sm text-muted-foreground font-sans mt-2 space-x-4">
          <span>Qty: {loot.quantity}</span>
          <span>Chance: {(loot.dropChance * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};

export const LootSection: React.FC<{ data: Entity }> = ({ data }) => {
  const inventory = useMemo(() => data.inventory || [], [data.inventory]);
  const ensureItemsLoaded = useAppStore((s) => s.ensureItemsLoaded);

  // Ensure all referenced items are loaded when viewing loot
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
        <OrnamentalDivider />
      </header>
      <div className="grid grid-cols-1 gap-4 mt-4">
        {inventory.map((loot, index) => (
          <LootItem key={`${loot.itemId}-${index}`} loot={loot} />
        ))}
      </div>
    </section>
  );
};
