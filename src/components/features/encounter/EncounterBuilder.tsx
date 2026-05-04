import React, { useState, useMemo, useCallback, useRef, useEffect, useId, startTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as Dialog from "@radix-ui/react-dialog";
import { Swords, Plus, X, Users, ChevronDown, Shield } from "lucide-react";
import { slideUpVariants, staggerContainerVariants, contentVariants } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirm } from "@/hooks/useConfirm";
import { entityApi } from "@/lib/api";
import {
  calculateEncounterDifficulty,
  getMonsterXP,
  type EncounterDifficulty,
  type EncounterResult,
  formatChallengeRating,
} from "@/lib/dnd";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types";


interface MonsterEntry {
  /** Roster key, not the entity ID; the same entity can appear multiple times. */
  key: string;
  entityId: string;
  name: string;
  cr: number | null;
}


const MAX_PARTY_SIZE = 8;

const DIFFICULTY_COLORS: Record<EncounterDifficulty, string> = {
  trivial: "text-muted-foreground",
  easy:    "text-jade",
  medium:  "text-yellow-500",
  hard:    "text-orange-500",
  deadly:  "text-destructive",
};

const DIFFICULTY_LABELS: Record<EncounterDifficulty, string> = {
  trivial: "Trivial",
  easy:    "Easy",
  medium:  "Medium",
  hard:    "Hard",
  deadly:  "Deadly",
};

const DIFFICULTY_BG: Record<EncounterDifficulty, string> = {
  trivial: "bg-muted/60 text-muted-foreground border-border",
  easy:    "bg-jade/10 text-jade border-jade/30",
  medium:  "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  hard:    "bg-orange-500/10 text-orange-600 border-orange-500/30",
  deadly:  "bg-destructive/10 text-destructive border-destructive/30",
};

const LEVEL_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);


const XpBar: React.FC<{ result: EncounterResult }> = ({ result }) => {
  const { adjustedXp, thresholds } = result;
  const max = Math.max(thresholds.deadly * 1.3, adjustedXp * 1.1, 1);
  const pct = (val: number) =>
    `${Math.min(100, (val / max) * 100).toFixed(1)}%`;

  return (
    <div className="space-y-1.5">
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-jade/25"
          style={{ width: pct(thresholds.easy) }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-yellow-500/25"
          style={{ width: pct(thresholds.medium) }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-orange-500/25"
          style={{ width: pct(thresholds.hard) }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-destructive/25"
          style={{ width: pct(thresholds.deadly) }}
        />

        {(["easy", "medium", "hard", "deadly"] as const).map((tier) => (
          <div
            key={tier}
            className="absolute top-0 h-full w-px bg-background/50"
            style={{ left: pct(thresholds[tier]) }}
          />
        ))}

        {adjustedXp > 0 && (
          <div
            className="absolute top-0 h-full w-1 bg-foreground rounded-full shadow"
            style={{ left: pct(adjustedXp), transform: "translateX(-50%)" }}
          />
        )}
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground font-serif">
        <span className="text-jade">E</span>
        <span className="text-yellow-500">M</span>
        <span className="text-orange-500">H</span>
        <span className="text-destructive">D</span>
      </div>
    </div>
  );
};


interface MonsterSearchProps {
  onAdd: (entry: MonsterEntry) => void;
}

const MonsterSearch: React.FC<MonsterSearchProps> = ({ onAdd }) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Entity[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timeoutId = setTimeout(() => {
      entityApi.search(query, 50, 0)
        .then((entries) => {
          if (!cancelled) setResults(entries);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  const handleSelect = useCallback(
    (entity: Entity) => {
      onAdd({
        key: `${entity.id}-${Date.now()}-${Math.random()}`,
        entityId: entity.id,
        name: entity.name,
        cr: entity.challengeRating,
      });
      setQuery("");
      setOpen(false);
      inputRef.current?.focus();
    },
    [onAdd]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
      if (e.key === "ArrowDown" && results.length > 0) {
        e.preventDefault();
        setOpen(true);
        setActiveIndex((index) => Math.min(index + 1, results.length - 1));
      }
      if (e.key === "ArrowUp" && results.length > 0) {
        e.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
      }
      if (e.key === "Enter" && results.length > 0) {
        e.preventDefault();
        handleSelect(results[activeIndex] ?? results[0]);
      }
    },
    [activeIndex, results, handleSelect]
  );

  // Close on outside click
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={`${listboxId}-input`}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(e.target.value.trim().length > 0);
          }}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search bestiary by name…"
          aria-label="Search monsters"
          aria-autocomplete="list"
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && results.length > 0 ? `${listboxId}-${results[activeIndex]?.id}` : undefined}
          aria-expanded={open}
          role="combobox"
          className={cn(
            "input-codex w-full px-3 py-2 text-sm pr-8",
            "border border-input rounded-md bg-background",
            "placeholder:text-muted-foreground placeholder:font-serif placeholder:italic",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          )}
        />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      </div>

      {open && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Monster search results"
          className={cn(
            "absolute z-60 mt-1 w-full max-h-52 overflow-y-auto",
            "rounded-md border border-border bg-popover shadow-lg",
            "py-1"
          )}
        >
          {results.map((entity, index) => {
            const cr = entity.challengeRating;
            const crLabel = cr !== null ? `CR ${formatChallengeRating(cr)}` : "CR —";
            const xp = cr !== null ? getMonsterXP(cr) : 0;
            const isActive = index === activeIndex;
            return (
              <li
                id={`${listboxId}-${entity.id}`}
                key={entity.id}
                role="option"
                aria-selected={isActive}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  // mousedown prevents blur before click fires
                  e.preventDefault();
                  handleSelect(entity);
                }}
                className={cn(
                  "flex items-center justify-between px-3 py-1.5 cursor-pointer",
                  "text-sm text-popover-foreground",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent text-accent-foreground",
                  "transition-colors"
                )}
              >
                <span className="font-serif truncate">{entity.name}</span>
                <span className="ml-3 text-xs text-muted-foreground font-serif shrink-0">
                  {crLabel} · {xp.toLocaleString()} XP
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {open && query.trim().length > 0 && (isSearching || results.length === 0) && (
        <div className={cn(
          "absolute z-60 mt-1 w-full rounded-md border border-border bg-popover shadow-lg",
          "px-3 py-3 text-sm text-muted-foreground font-serif italic text-center"
        )}>
          {isSearching ? "Searching..." : <>No creatures found for &ldquo;{query}&rdquo;</>}
        </div>
      )}
    </div>
  );
};


export const EncounterBuilder: React.FC = () => {
  const [open, setOpen] = useState(false);

  const [partyLevels, setPartyLevels] = useState<number[]>([1, 1, 1, 1]);

  const [monsters, setMonsters] = useState<MonsterEntry[]>([]);

  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();


  const addCharacter = useCallback(() => {
    if (partyLevels.length >= MAX_PARTY_SIZE) return;
    setPartyLevels((prev) => [...prev, 1]);
  }, [partyLevels.length]);

  const removeCharacter = useCallback((index: number) => {
    setPartyLevels((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setCharacterLevel = useCallback((index: number, level: number) => {
    setPartyLevels((prev) => {
      const next = [...prev];
      next[index] = level;
      return next;
    });
  }, []);


  const addMonster = useCallback((entry: MonsterEntry) => {
    setMonsters((prev) => [...prev, entry]);
  }, []);

  const removeMonster = useCallback((key: string) => {
    setMonsters((prev) => prev.filter((m) => m.key !== key));
  }, []);


  const encounterResult = useMemo<EncounterResult | null>(() => {
    if (partyLevels.length === 0) return null;
    const monsterCRs = monsters.map((m) => m.cr);
    return calculateEncounterDifficulty(partyLevels, monsterCRs);
  }, [partyLevels, monsters]);


  const resetEncounter = useCallback(() => {
    setPartyLevels([1, 1, 1, 1]);
    setMonsters([]);
  }, []);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      // Use ConfirmDialog instead of window.confirm for proper a11y focus trapping.
      if (!o && monsters.length > 0) {
        void confirm({
          title: "Close the encounter builder?",
          description: "Your current encounter will be lost.",
          confirmLabel: "Discard & close",
          cancelLabel: "Keep editing",
          destructive: true,
        }).then((confirmed) => {
          if (!confirmed) return;
          setOpen(false);
          startTransition(resetEncounter);
        });
        return;
      }
      if (o) {
        // Mount the dialog content as a transition so the toolbar button press
        // registers instantly and the heavy portal render happens in the background.
        startTransition(() => { setOpen(true); });
      } else {
        setOpen(false);
        startTransition(resetEncounter);
      }
    },
    [monsters.length, confirm, resetEncounter]
  );


  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Encounter Builder"
          title="Encounter Builder"
          className="text-leather hover:text-leather hover:bg-leather/10"
        >
          <Swords className="w-5 h-5" />
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />

        <Dialog.Content
          className={cn(
            "fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-3xl",
            "max-h-[85vh] overflow-y-auto",
            "glass-panel rounded-xl shadow-2xl animate-slide-up focus:outline-none",
            "p-0"
          )}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-rune/20">
            <div className="flex items-center gap-3">
              <Swords className="w-5 h-5 text-leather shrink-0" />
              <Dialog.Title className="font-display text-xl font-bold text-foreground tracking-wide">
                Encounter Builder
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                Configure your party and monster roster to estimate encounter
                difficulty.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close encounter builder" className="shrink-0">
                <X className="w-4 h-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <section
                aria-labelledby="party-heading"
                className="rounded-lg border border-leather/20 p-4 space-y-3 bg-card/40"
              >
                <div className="flex items-center justify-between">
                  <h2
                    id="party-heading"
                    className="font-display text-sm font-semibold text-leather tracking-wider uppercase flex items-center gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    Party
                    <span className="font-serif normal-case text-muted-foreground text-xs ml-1">
                      ({partyLevels.length}/{MAX_PARTY_SIZE})
                    </span>
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCharacter}
                    disabled={partyLevels.length >= MAX_PARTY_SIZE}
                    className="h-7 px-2 text-xs gap-1 border-leather/30 hover:border-leather font-serif"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </Button>
                </div>

                {partyLevels.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-serif italic text-center py-4">
                    No adventurers yet.
                  </p>
                ) : (
                  <ul className="space-y-2" aria-label="Party members">
                    {partyLevels.map((level, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2"
                      >
                        <span className="text-xs text-muted-foreground font-serif w-5 text-right shrink-0">
                          {idx + 1}.
                        </span>
                        <select
                          value={level}
                          onChange={(e) => setCharacterLevel(idx, parseInt(e.target.value, 10))}
                          aria-label={`Character ${idx + 1} level`}
                          className="flex-1 h-8 px-2 text-sm font-serif rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                        >
                          {LEVEL_OPTIONS.map((lvl) => (
                            <option key={lvl} value={lvl}>Level {lvl}</option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCharacter(idx)}
                          aria-label={`Remove character ${idx + 1}`}
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                aria-labelledby="monsters-heading"
                className="rounded-lg border border-leather/20 p-4 space-y-3 bg-card/40"
              >
                <div className="flex items-center justify-between">
                  <h2
                    id="monsters-heading"
                    className="font-display text-sm font-semibold text-leather tracking-wider uppercase flex items-center gap-1.5"
                  >
                    <Shield className="w-4 h-4" />
                    Monsters
                    {monsters.length > 0 && (
                      <span className="font-serif normal-case text-muted-foreground text-xs ml-1">
                        ({monsters.length})
                      </span>
                    )}
                  </h2>
                </div>

                <MonsterSearch onAdd={addMonster} />

                {monsters.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-serif italic text-center py-3">
                    Search and add creatures above.
                  </p>
                ) : (
                  <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1" aria-label="Monster roster">
                    {monsters.map((monster) => {
                      const crLabel =
                        monster.cr !== null
                          ? `CR ${formatChallengeRating(monster.cr)}`
                          : "CR —";
                      const xp =
                        monster.cr !== null ? getMonsterXP(monster.cr) : 0;
                      return (
                        <li
                          key={monster.key}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2.5 py-1.5",
                            "bg-background/50 border border-border/60",
                            "text-sm"
                          )}
                        >
                          <span className="flex-1 font-serif truncate text-foreground">
                            {monster.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-serif shrink-0">
                            {crLabel}
                          </span>
                          <span className="text-xs text-muted-foreground font-serif shrink-0">
                            {xp.toLocaleString()} XP
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMonster(monster.key)}
                            aria-label={`Remove ${monster.name}`}
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <AnimatePresence mode="wait">
            {encounterResult ? (
              <motion.section
                key="result"
                aria-labelledby="results-heading"
                className="rounded-lg border border-rune/30 p-4 space-y-4 bg-card/30"
                variants={slideUpVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2
                    id="results-heading"
                    className="font-display text-sm font-semibold text-leather tracking-wider uppercase"
                  >
                    Encounter Result
                  </h2>

                  <Badge
                    className={cn(
                      "font-display text-xs tracking-wider px-3 py-0.5 border",
                      DIFFICULTY_BG[encounterResult.difficulty]
                    )}
                  >
                    {DIFFICULTY_LABELS[encounterResult.difficulty]}
                  </Badge>
                </div>

                <motion.div variants={staggerContainerVariants} initial="hidden" animate="visible">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <motion.div variants={contentVariants}>
                      <XpStat
                        label="Raw XP"
                        value={encounterResult.rawXp.toLocaleString()}
                        sub="before multiplier"
                      />
                    </motion.div>
                    <motion.div variants={contentVariants}>
                      <XpStat
                        label={`× ${encounterResult.multiplier} Multiplier`}
                        value={encounterResult.adjustedXp.toLocaleString()}
                        sub="adjusted XP"
                        highlight
                        difficulty={encounterResult.difficulty}
                      />
                    </motion.div>
                    <motion.div variants={contentVariants}>
                      <XpStat
                        label="Monsters"
                        value={String(monsters.length)}
                        sub={monsters.length === 1 ? "creature" : "creatures"}
                      />
                    </motion.div>
                    <motion.div variants={contentVariants}>
                      <XpStat
                        label="Party"
                        value={String(partyLevels.length)}
                        sub={partyLevels.length === 1 ? "adventurer" : "adventurers"}
                      />
                    </motion.div>
                  </div>
                </motion.div>

                <div>
                  <h3 className="font-display text-xs text-muted-foreground tracking-widest uppercase mb-2">
                    Party Thresholds
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    <ThresholdCell
                      label="Easy"
                      xp={encounterResult.thresholds.easy}
                      colorClass="text-jade"
                      active={encounterResult.difficulty === "easy"}
                    />
                    <ThresholdCell
                      label="Medium"
                      xp={encounterResult.thresholds.medium}
                      colorClass="text-yellow-500"
                      active={encounterResult.difficulty === "medium"}
                    />
                    <ThresholdCell
                      label="Hard"
                      xp={encounterResult.thresholds.hard}
                      colorClass="text-orange-500"
                      active={encounterResult.difficulty === "hard"}
                    />
                    <ThresholdCell
                      label="Deadly"
                      xp={encounterResult.thresholds.deadly}
                      colorClass="text-destructive"
                      active={encounterResult.difficulty === "deadly"}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-serif">
                      Adjusted XP:{" "}
                      <strong className={cn("font-semibold", DIFFICULTY_COLORS[encounterResult.difficulty])}>
                        {encounterResult.adjustedXp.toLocaleString()}
                      </strong>
                    </span>
                    <span className={cn("text-xs font-display font-semibold tracking-wider", DIFFICULTY_COLORS[encounterResult.difficulty])}>
                      {DIFFICULTY_LABELS[encounterResult.difficulty].toUpperCase()}
                    </span>
                  </div>
                  <XpBar result={encounterResult} />
                </div>
              </motion.section>
            ) : (
              <motion.div
                key="empty"
                variants={slideUpVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="rounded-lg border border-dashed border-border p-6 text-center"
              >
                <Swords className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground font-serif italic">
                  Add characters to your party to calculate encounter difficulty.
                </p>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        destructive={confirmState.destructive}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Dialog.Root>
  );
};


interface XpStatProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  difficulty?: EncounterDifficulty;
}

const XpStat: React.FC<XpStatProps> = ({ label, value, sub, highlight, difficulty }) => (
  <div className={cn(
    "rounded-md px-3 py-2 text-center space-y-0.5",
    highlight ? "bg-card/60 border border-rune/20" : "bg-card/30"
  )}>
    <div className={cn(
      "text-lg font-display font-bold leading-tight",
      highlight && difficulty
        ? DIFFICULTY_COLORS[difficulty]
        : "text-foreground"
    )}>
      {value}
    </div>
    <div className="text-[11px] font-display tracking-wider text-muted-foreground uppercase leading-tight">
      {label}
    </div>
    {sub && (
      <div className="text-[10px] font-serif text-muted-foreground/70 italic">
        {sub}
      </div>
    )}
  </div>
);

interface ThresholdCellProps {
  label: string;
  xp: number;
  colorClass: string;
  active: boolean;
}

const ThresholdCell: React.FC<ThresholdCellProps> = ({ label, xp, colorClass, active }) => (
  <div className={cn(
    "rounded-md px-2 py-1.5 text-center border transition-colors",
    active
      ? cn("border-current/30 bg-current/5", colorClass)
      : "border-border/50 bg-card/20"
  )}>
    <div className={cn("text-[11px] font-display tracking-wider uppercase", active ? colorClass : "text-muted-foreground")}>
      {label}
    </div>
    <div className={cn("text-sm font-semibold font-serif", active ? colorClass : "text-foreground/80")}>
      {xp.toLocaleString()}
    </div>
  </div>
);
