import React, { useEffect, useCallback, useMemo, useState, useRef } from "react";
import { useItem, useAppStore } from "@/store/appStore";
import { Icon } from "@/components/shared/Icon";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { useWikiLink } from "@/components/shared/wiki-link/WikiLinkProvider";
import { RARITY_LABELS } from "@/lib/dnd/constants";
import { cn } from "@/lib/utils";
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

type RollResult = { dropped: boolean; roll: number };
type RollAnimationStyle = React.CSSProperties & Record<`--loot-${string}`, string>;
type RollAnimation = {
  key: number;
  durationMs: number;
  style: RollAnimationStyle;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const rollLootTable = (inventory: LootDrop[]): RollResult[] =>
  inventory.map((loot) => {
    const rolled = Math.floor(Math.random() * 100) + 1;
    return { dropped: rolled > 100 - loot.dropChance * 100, roll: rolled };
  });

const buildRollAnimation = (
  results: RollResult[],
  inventory: LootDrop[],
  key: number
): RollAnimation => {
  const rollTotal = results.reduce((total, result) => total + result.roll, 0);
  const droppedCount = results.filter((result) => result.dropped).length;
  const bestWinMargin = results.reduce((best, result, index) => {
    const chance = (inventory[index]?.dropChance ?? 0) * 100;
    return Math.max(best, chance - result.roll);
  }, 0);

  const seed = rollTotal + droppedCount * 41 + inventory.length * 17;
  const direction = seed % 2 === 0 ? 1 : -1;
  const intensity = clamp(0.9 + droppedCount * 0.09 + Math.max(bestWinMargin, 0) / 180, 0.9, 1.28);
  const durationMs = 760 + (seed % 180) + Math.round(intensity * 90);
  const finalTilt = direction * ((seed % 15) - 7);

  return {
    key,
    durationMs,
    style: {
      "--loot-roll-duration": `${durationMs}ms`,
      "--loot-glow-opacity": droppedCount > 0 ? "0.54" : "0.28",
      "--loot-glow-scale": `${1.28 + droppedCount * 0.12}`,
      "--loot-roll-x-0": `${direction * -(2 + (seed % 2))}px`,
      "--loot-roll-y-0": `${(seed % 2) - 1}px`,
      "--loot-roll-r-0": `${direction * -(18 + (seed % 18))}deg`,
      "--loot-roll-s-0": `${0.88 + intensity * 0.04}`,
      "--loot-roll-x-1": `${direction * (1 + (seed % 3))}px`,
      "--loot-roll-y-1": `${-(1 + (seed % 2))}px`,
      "--loot-roll-r-1": `${direction * (48 + (seed % 42))}deg`,
      "--loot-roll-s-1": `${1.02 + intensity * 0.07}`,
      "--loot-roll-x-2": `${direction * -(1 + (seed % 2))}px`,
      "--loot-roll-y-2": `${seed % 2}px`,
      "--loot-roll-r-2": `${direction * (132 + (seed % 52))}deg`,
      "--loot-roll-s-2": `${0.94 + intensity * 0.03}`,
      "--loot-roll-x-3": `${direction * (seed % 2)}px`,
      "--loot-roll-y-3": `${-(seed % 2)}px`,
      "--loot-roll-r-3": `${direction * (236 + (seed % 64))}deg`,
      "--loot-roll-s-3": `${0.98 + intensity * 0.04}`,
      "--loot-roll-x-4": "0px",
      "--loot-roll-y-4": "0px",
      "--loot-roll-r-4": `${direction * (318 + (seed % 28))}deg`,
      "--loot-roll-s-4": `${0.99 + intensity * 0.01}`,
      "--loot-roll-r-final": `${direction * 360 + finalTilt}deg`,
    },
  };
};

const LootRollButton: React.FC<{
  isRolling: boolean;
  hasResults: boolean;
  animation?: RollAnimation | null;
  onRoll: () => void;
}> = ({ isRolling, hasResults, animation, onRoll }) => (
  <button
    type="button"
    onClick={onRoll}
    disabled={isRolling}
    aria-busy={isRolling}
    className="group flex items-center gap-2 rounded-full border border-rune/50 bg-rune/5 px-4 py-1.5 text-sm font-serif text-ink/70 transition-colors hover:bg-rune/10 hover:border-rune/80 hover:text-ink/90 disabled:cursor-default disabled:hover:bg-rune/5"
    style={animation?.style}
  >
    <span className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-full border border-rune/20 bg-parchment/60">
      <span className={cn(
        "absolute inset-1 rounded-full bg-rune/15 opacity-0",
        isRolling && "animate-loot-die-glow"
      )} />
      <Icon
        key={animation?.key ?? "idle"}
        category="dice"
        name="d20"
        size="sm"
        className={cn(
          "relative text-primary/65 transition-transform duration-200",
          isRolling ? "animate-loot-die-roll" : "group-hover:rotate-12"
        )}
        aria-hidden="true"
      />
    </span>
    {isRolling ? "Rolling..." : hasResults ? "Roll Again" : "Roll Loot"}
  </button>
);

const LootRow = React.memo<{
  loot: LootDrop;
  result?: RollResult;
  revealIndex: number;
}>(({ loot, result, revealIndex }) => {
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
  const dropped = result?.dropped;
  const hasResult = result !== undefined;

  return (
    <div className={cn(
      "group flex items-center gap-3 py-3 border-b border-rune/15 last:border-0 -mx-5 px-5 rounded-sm transition-all duration-300",
      !hasResult && "hover:bg-rune/4",
      hasResult && dropped && "bg-jade/15 border-l-2 border-jade/50",
      hasResult && !dropped && "opacity-40",
    )}>
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
        {hasResult ? (
          <span className={cn(
            "text-xs font-sans font-medium w-16 text-right animate-loot-result",
            dropped ? "text-jade" : "text-ink/40"
          )}
          style={{ animationDelay: `${Math.min(revealIndex, 8) * 35}ms` }}>
            {dropped ? "Dropped" : `Rolled ${result.roll}`}
          </span>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
});

LootRow.displayName = "LootRow";

type LootRowWithKey = LootDrop & { _rowKey: string };

export const LootSection: React.FC<{ data: Entity }> = ({ data }) => {
  const inventory = useMemo(() => data.inventory ?? [], [data.inventory]);
  const rows = useMemo<LootRowWithKey[]>(
    () => inventory.map((item, i) => ({ ...item, _rowKey: `${item.itemId}-${i}` })),
    [inventory]
  );
  const ensureItemsLoaded = useAppStore((s) => s.ensureItemsLoaded);
  const [results, setResults] = useState<RollResult[] | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [rollAnimation, setRollAnimation] = useState<RollAnimation | null>(null);
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationKeyRef = useRef(0);
  const pendingResultsRef = useRef<RollResult[] | null>(null);

  const clearRollTimers = useCallback(() => {
    if (rollTimerRef.current) {
      clearTimeout(rollTimerRef.current);
      rollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (inventory.length > 0) {
      const itemIds = inventory.map(loot => loot.itemId).filter(Boolean);
      void ensureItemsLoaded(itemIds);
    }
  }, [inventory, ensureItemsLoaded]);

  useEffect(() => {
    clearRollTimers();
    setResults(null);
    setIsRolling(false);
    setRollAnimation(null);
    pendingResultsRef.current = null;
  }, [clearRollTimers, data.id, inventory]);

  useEffect(() => {
    return clearRollTimers;
  }, [clearRollTimers]);

  const roll = useCallback(() => {
    if (isRolling) return;
    const nextResults = rollLootTable(inventory);
    const nextAnimation = buildRollAnimation(nextResults, inventory, animationKeyRef.current + 1);
    animationKeyRef.current = nextAnimation.key;
    pendingResultsRef.current = nextResults;

    clearRollTimers();
    setIsRolling(true);
    setResults(null);
    setRollAnimation(nextAnimation);
    rollTimerRef.current = setTimeout(() => {
      clearRollTimers();
      setResults(pendingResultsRef.current);
      pendingResultsRef.current = null;
      setIsRolling(false);
    }, nextAnimation.durationMs);
  }, [clearRollTimers, inventory, isRolling]);

  if (inventory.length === 0) return null;

  const droppedCount = results
    ? results.filter(r => r.dropped).length
    : null;

  return (
    <section>
      <header className="flex flex-col items-center text-center gap-2">
        <Icon category="item" name="loot" size="xl" className="text-primary/50" />
        <h2 className="font-display text-3xl text-primary">Loot Table</h2>
        <LootRollButton
          isRolling={isRolling}
          hasResults={results !== null}
          animation={rollAnimation}
          onRoll={roll}
        />
        {droppedCount !== null && (
          <p className="text-xs font-serif text-ink/50">
            {droppedCount === 0
              ? "Nothing dropped"
              : droppedCount === inventory.length
              ? "Everything dropped"
              : `${droppedCount} of ${inventory.length} items dropped`}
          </p>
        )}
      </header>
      <div className="stone-plate mt-4 py-1">
        {rows.map((loot, index) => (
          <LootRow
            key={loot._rowKey}
            loot={loot}
            result={results?.[index]}
            revealIndex={index}
          />
        ))}
      </div>
    </section>
  );
};
