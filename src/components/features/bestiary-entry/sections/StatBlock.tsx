import React from "react";
import { capitalize } from "@/lib/utils";
import { formatAbilityModifierDisplay } from "@/lib/theme";
import { ABILITY_SCORE_SHORT, DAMAGE_TYPE_LABELS } from "@/lib/dnd/constants";
import { formatChallengeRating } from "@/lib/dnd";
import { useStatusesMap } from "@/store/appStore";
import { useComputedEntityStats } from "@/hooks/useComputedEntityStats";
import { EntityLink } from "@/components/shared/EntityLink";
import { Icon } from "@/components/shared";
import { statusApi } from "@/lib/api";
import type { Entity, Attribute } from "@/types";


const AbilityScore: React.FC<{ label: string; score?: number | null }> = ({
  label,
  score,
}) => (
  <div className="flex flex-col items-center">
    <div className="font-bold font-display text-sm text-ink">{label}</div>
    <div className="font-serif text-sm text-ink/80">
      {score ?? "—"} ({formatAbilityModifierDisplay(score)})
    </div>
  </div>
);

const STRUCTURED_STAT_KEYS = new Set([
  "hitdice",
  "armortype",
  "armornote",
  "burrowspeed",
  "climbspeed",
  "flyspeed",
  "swimspeed",
  "hoverspeed",
  "initiative",
  "initiativebonus",
]);

function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== "";
}

function formatFeet(value: number): string {
  return `${Number.isInteger(value) ? value : value.toLocaleString()} ft.`;
}

function formatBonus(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function formatCustomLabel(key: string): string {
  return capitalize(key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim());
}

function getCustomValue(
  customStats: Record<string, string | number>,
  key: string
): string | number | undefined {
  const direct = customStats[key];
  if (direct !== undefined) return direct;

  const normalizedKey = key.toLowerCase();
  const entry = Object.entries(customStats).find(
    ([customKey]) => customKey.toLowerCase() === normalizedKey
  );
  return entry?.[1];
}

function getCustomNumber(
  customStats: Record<string, string | number>,
  key: string
): number | null {
  const value = getCustomValue(customStats, key);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getCustomString(
  customStats: Record<string, string | number>,
  key: string
): string | null {
  const value = getCustomValue(customStats, key);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function formatSpeedLine(
  stats: Entity["statBlock"],
  customStats: Record<string, string | number>
): string | null {
  const movementModes: Array<[string | null, number | null | undefined]> = [
    [null, stats.speed],
    ["burrow", stats.burrowSpeed ?? getCustomNumber(customStats, "burrowSpeed")],
    ["climb", stats.climbSpeed ?? getCustomNumber(customStats, "climbSpeed")],
    ["fly", stats.flySpeed ?? getCustomNumber(customStats, "flySpeed")],
    ["swim", stats.swimSpeed ?? getCustomNumber(customStats, "swimSpeed")],
    ["hover", stats.hoverSpeed ?? getCustomNumber(customStats, "hoverSpeed")],
  ];

  const formattedModes = movementModes
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([label, value]) => {
      const speed = formatFeet(value as number);
      return label ? `${label} ${speed}` : speed;
    });

  return formattedModes.length > 0 ? formattedModes.join(", ") : null;
}

// Fetches missing status names from the API for IDs not yet in the store.
function useStatusImmunityNames(statusIds: string[]) {
  const statusesMap = useStatusesMap();
  const [resolvedNames, setResolvedNames] = React.useState<Map<string, string>>(new Map());
  const [loading, setLoading] = React.useState(false);

  // Tracked in a ref so resolvedNames stays out of deps and we avoid a fetch loop.
  const fetchedIdsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!statusIds || statusIds.length === 0) return;

    // Skip IDs already in the store or previously fetched (ref avoids dep cycle)
    const missingIds = statusIds.filter(
      (id) => !statusesMap.has(id) && !fetchedIdsRef.current.has(id)
    );

    if (missingIds.length === 0) return;

    // Mark before the async starts so concurrent effects skip these IDs.
    missingIds.forEach(id => fetchedIdsRef.current.add(id));
    setLoading(true);

    let isMounted = true;

    const fetchMissingNames = async () => {
      try {
        const results = await Promise.allSettled(
          missingIds.map((id) =>
            statusApi.getDetails(id).then((status) => ({ id, name: status.name }))
          )
        );

        if (!isMounted) return;

        const newNames = new Map<string, string>();
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            newNames.set(result.value.id, result.value.name);
          } else {
            newNames.set(missingIds[index], "Unknown Condition");
          }
        });

        setResolvedNames((prev) => {
          const next = new Map(prev);
          newNames.forEach((name, id) => next.set(id, name));
          return next;
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchMissingNames();

    return () => {
      isMounted = false;
    };
  }, [statusIds, statusesMap]);  // Removed resolvedNames from deps to prevent infinite loop

  const names = React.useMemo(() => {
    return statusIds.map((id) => {
      const status = statusesMap.get(id);
      if (status) return status.name;
      return resolvedNames.get(id) || (loading ? "Loading..." : "Unknown");
    });
  }, [statusIds, statusesMap, resolvedNames, loading]);

  return names;
}



export const StatBlockSection: React.FC<{ data: Entity }> = ({ data }) => {
  const { statBlock: stats, savingThrows, skills, damageResistances } = data;
  const statusImmunities = React.useMemo(
    () => data.statusImmunities ?? [],
    [data.statusImmunities]
  );
  const conditionImmunityNames = useStatusImmunityNames(statusImmunities);
  const computed = useComputedEntityStats(data);

  const filteredSenses = React.useMemo(() => {
    return (data.senses ?? []).filter(
      (s) => !s.toLowerCase().startsWith("passive ")
    );
  }, [data.senses]);

  const displayCustomEntries = React.useMemo(
    () =>
      Object.entries((data.statBlock?.custom) ?? {}).filter(
        ([key]) => !STRUCTURED_STAT_KEYS.has(key.toLowerCase())
      ),
    [data.statBlock?.custom],
  );

  if (!stats) return null;

  const customStats = stats.custom || {};
  const speedLine = formatSpeedLine(stats, customStats);
  const hitDice = stats.hitDice ?? getCustomString(customStats, "hitDice");
  const armorNote =
    stats.armorNote ??
    getCustomString(customStats, "armorNote") ??
    getCustomString(customStats, "armorType");
  const initiativeBonus =
    stats.initiativeBonus ??
    getCustomNumber(customStats, "initiativeBonus") ??
    getCustomNumber(customStats, "initiative");
  const hasAbilityScores = [
    stats.strength,
    stats.dexterity,
    stats.constitution,
    stats.intelligence,
    stats.wisdom,
    stats.charisma,
  ].some(isPresent);
  const hasCoreStats =
    isPresent(stats.armor) ||
    isPresent(stats.hp) ||
    Boolean(speedLine) ||
    isPresent(initiativeBonus);
  const hasCombatProfile =
    (savingThrows && Object.keys(savingThrows).length > 0) ||
    (skills && Object.keys(skills).length > 0) ||
    (damageResistances && damageResistances.length > 0) ||
    statusImmunities.length > 0;
  const hasSensesProfile =
    filteredSenses.length > 0 ||
    hasAbilityScores ||
    data.challengeRating != null ||
    Boolean(skills?.perception);
  const hasMetaProfile =
    hasSensesProfile ||
    (data.languages && data.languages.length > 0) ||
    Boolean(data.alignment?.trim()) ||
    (data.legendaryActionsPerRound !== null &&
      data.legendaryActionsPerRound !== undefined &&
      data.legendaryActionsPerRound > 0) ||
    displayCustomEntries.length > 0;

  if (!hasCoreStats && !hasAbilityScores && !hasCombatProfile && !hasMetaProfile) {
    return null;
  }

  const displayInitiative = initiativeBonus ?? computed.initiative;

  return (
    <div className="stat-block space-y-4">
      {hasCoreStats && (
        <div className="space-y-3">
          <div className="flex items-start justify-around px-1">
            {stats.hp != null && (
              <div className="flex flex-col items-center gap-0.5 text-center min-w-0">
                <div className="flex items-center gap-1">
                  <Icon category="hp" name="full" size="sm" className="text-rose-800/70 dark:text-rose-400/70 shrink-0" />
                  <span className="text-xs font-medium uppercase tracking-wide text-rose-800/70 dark:text-rose-400/70">HP</span>
                </div>
                <span className="text-base font-bold tabular-nums text-ink leading-none">{stats.hp}</span>
                {hitDice && <span className="text-[11px] text-ink/45 font-serif leading-none">{hitDice}</span>}
              </div>
            )}
            {stats.armor != null && (
              <div className="flex flex-col items-center gap-0.5 text-center min-w-0">
                <div className="flex items-center gap-1">
                  <Icon category="attribute" name="ac" size="sm" className="text-stone-600 dark:text-stone-400 shrink-0" />
                  <span className="text-xs font-medium uppercase tracking-wide text-stone-600 dark:text-stone-400">AC</span>
                </div>
                <span className="text-base font-bold tabular-nums text-ink leading-none">{stats.armor}</span>
                {armorNote && <span className="text-[11px] text-ink/45 font-serif leading-none">{armorNote}</span>}
              </div>
            )}
            {(hasAbilityScores || initiativeBonus != null) && (
              <div className="flex flex-col items-center gap-0.5 text-center min-w-0">
                <div className="flex items-center gap-1">
                  <Icon category="dice" name="d20" size="sm" className="text-rune/70 shrink-0" />
                  <span className="text-xs font-medium uppercase tracking-wide text-rune/70">Initiative</span>
                </div>
                <span className="text-base font-bold tabular-nums text-ink leading-none">
                  {formatBonus(displayInitiative)}
                </span>
                <span className="text-[11px] text-ink/45 font-serif leading-none">{10 + displayInitiative}</span>
              </div>
            )}
          </div>

          {speedLine && (
            <>
              <div className="h-px bg-rune/20 mx-2" />
              <div className="flex items-center justify-center gap-2 px-2">
                <Icon category="movement" name="walking" size="sm" className="text-amber-700/70 dark:text-amber-500/70 shrink-0" />
                <span className="text-sm font-medium uppercase tracking-wide text-amber-700/70 dark:text-amber-500/70">Speed</span>
                <span className="text-sm text-ink">{speedLine}</span>
              </div>
            </>
          )}
        </div>
      )}

      {hasCoreStats && <hr className="stat-block-divider" />}

      {hasAbilityScores && (
        <>
          <div className="grid grid-cols-6 gap-y-2 text-center">
            <AbilityScore label="STR" score={stats.strength} />
            <AbilityScore label="DEX" score={stats.dexterity} />
            <AbilityScore label="CON" score={stats.constitution} />
            <AbilityScore label="INT" score={stats.intelligence} />
            <AbilityScore label="WIS" score={stats.wisdom} />
            <AbilityScore label="CHA" score={stats.charisma} />
          </div>
          <hr className="stat-block-divider" />
        </>
      )}

      {hasCombatProfile && <div className="space-y-2">
        {savingThrows && Object.keys(savingThrows).length > 0 && (
          <div>
            <span className="stat-block-property">Saving Throws</span>{" "}
            {Object.entries(savingThrows)
              .map(([attr, bonus]) => `${ABILITY_SCORE_SHORT[attr as Attribute]} ${formatBonus(bonus)}`)
              .join(", ")}
          </div>
        )}
        {skills && Object.keys(skills).length > 0 && (
          <div>
            <span className="stat-block-property">Skills</span>{" "}
            {Object.entries(skills)
              .map(([skill, bonus]) => {
                const skillName = formatCustomLabel(skill);
                return `${skillName} ${formatBonus(bonus)}`;
              })
              .join(", ")}
          </div>
        )}
        {damageResistances && damageResistances.length > 0 && (
          <>
            {["vulnerable", "resistant", "immune"].map((level) => {
              const filtered = damageResistances.filter((r) => r.level === level);
              if (filtered.length === 0) return null;
              return (
                <div key={level}>
                  <span className="stat-block-property">
                    {level === "vulnerable" && "Vulnerabilities"}
                    {level === "resistant" && "Resistances"}
                    {level === "immune" && "Immunities"}
                  </span>{" "}
                  {filtered.map((r) => DAMAGE_TYPE_LABELS[r.damageType]).join(", ")}
                </div>
              );
            })}
          </>
        )}
        {statusImmunities.length > 0 && (
          <div>
            <span className="stat-block-property">Condition Immunities</span>{" "}
            {conditionImmunityNames.join(", ")}
          </div>
        )}
      </div>}

      {hasCombatProfile && hasMetaProfile && <hr className="stat-block-divider" />}
      <div className="space-y-2">
        {hasSensesProfile && (
          <div>
            <span className="stat-block-property">Senses</span>{" "}
            {[...filteredSenses, `passive Perception ${computed.passivePerception}`].join(", ")}
          </div>
        )}
        {data.languages && data.languages.length > 0 && (
          <div>
            <span className="stat-block-property">Languages</span>{" "}
            {data.languages.join(", ")}
          </div>
        )}
        {data.alignment && data.alignment.trim() && (
          <div>
            <span className="stat-block-property">Alignment</span>{" "}
            {data.alignment}
          </div>
        )}
        {data.challengeRating !== null && data.challengeRating !== undefined && (
          <div>
            <span className="stat-block-property">Challenge</span>{" "}
            {formatChallengeRating(data.challengeRating)} ({data.experiencePoints?.toLocaleString() ?? "—"} XP)
          </div>
        )}
        {data.challengeRating !== null && data.challengeRating !== undefined && (
          <div>
            <span className="stat-block-property">Proficiency Bonus</span>{" "}
            +{computed.proficiencyBonus}
          </div>
        )}
        {data.legendaryActionsPerRound !== null && data.legendaryActionsPerRound !== undefined && data.legendaryActionsPerRound > 0 && (
          <div>
            <span className="stat-block-property">Legendary Actions</span>{" "}
            {data.legendaryActionsPerRound} per round
          </div>
        )}
        {displayCustomEntries.map(([key, value]) => (
          <div key={key}>
            <span className="stat-block-property">
              {formatCustomLabel(key)}
            </span>{" "}
            <EntityLink value={value} />
          </div>
        ))}
      </div>
    </div>
  );
};
