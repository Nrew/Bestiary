import React from "react";
import { capitalize } from "@/lib/utils";
import { formatAbilityModifierDisplay } from "@/lib/theme";
import { ABILITY_SCORE_SHORT, DAMAGE_TYPE_LABELS } from "@/lib/dnd/constants";
import { formatChallengeRating, calculatePassivePerception } from "@/lib/dnd";
import { useStatusesMap } from "@/store/appStore";
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

/**
 * Derive passive Perception:
 * - If the entity has an explicit perception skill bonus stored, use that.
 * - Otherwise fall back to the raw Wisdom modifier (not proficient).
 * Formula: 10 + wisdom modifier + (proficiency bonus if proficient in Perception).
 */
function derivePassivePerception(data: Entity): number | null {
  const wisdom = data.statBlock?.wisdom;
  if (wisdom == null) return null;

  const perceptionBonus = data.skills?.perception;
  if (perceptionBonus !== undefined) {
    // explicit skill bonus already includes proficiency; passive = 10 + that bonus
    return 10 + perceptionBonus;
  }

  // No explicit skill entry: use wisdom modifier only (not proficient)
  const proficiency = data.proficiencyBonus ?? 0;
  return calculatePassivePerception(wisdom, proficiency, false);
}

export const StatBlockSection: React.FC<{ data: Entity }> = ({ data }) => {
  const { statBlock: stats, savingThrows, skills, damageResistances } = data;
  const conditionImmunityNames = useStatusImmunityNames(data.statusImmunities || []);
  const passivePerception = derivePassivePerception(data);

  if (!stats) return null;

  const customStats = stats.custom || {};
  const { custom: _custom, ...primaryStats } = stats;
  const hasPrimaryStat = Object.values(primaryStats).some(
    (val) => val !== null && val !== undefined
  );
  const hasCustomStat = Object.keys(customStats).length > 0;
  if (!hasPrimaryStat && !hasCustomStat) return null;

  return (
    <div className="stat-block space-y-4">
      <div className="flex items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-2">
          <Icon category="attribute" name="ac" size="sm" className="text-stone-600 dark:text-stone-400" />
          <span className="text-sm font-medium uppercase tracking-wide text-stone-600 dark:text-stone-400">AC</span>
          <span className="text-sm tabular-nums text-ink">{stats.armor ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon category="hp" name="full" size="sm" className="text-rose-800/70 dark:text-rose-400/70" />
          <span className="text-sm font-medium uppercase tracking-wide text-rose-800/70 dark:text-rose-400/70">HP</span>
          <span className="text-sm tabular-nums text-ink">{stats.hp ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon category="movement" name="walking" size="sm" className="text-amber-700/70 dark:text-amber-500/70" />
          <span className="text-sm font-medium uppercase tracking-wide text-amber-700/70 dark:text-amber-500/70">Speed</span>
          <span className="text-sm tabular-nums text-ink whitespace-nowrap">{stats.speed != null ? `${stats.speed} ft.` : "—"}</span>
        </div>
      </div>

      <hr className="stat-block-divider" />

      <div className="grid grid-cols-6 gap-y-2 text-center">
        <AbilityScore label="STR" score={stats.strength} />
        <AbilityScore label="DEX" score={stats.dexterity} />
        <AbilityScore label="CON" score={stats.constitution} />
        <AbilityScore label="INT" score={stats.intelligence} />
        <AbilityScore label="WIS" score={stats.wisdom} />
        <AbilityScore label="CHA" score={stats.charisma} />
      </div>

      <hr className="stat-block-divider" />

      <div className="space-y-2">
        {savingThrows && Object.keys(savingThrows).length > 0 && (
          <div>
            <span className="stat-block-property">Saving Throws</span>{" "}
            {Object.entries(savingThrows)
              .map(([attr, bonus]) => `${ABILITY_SCORE_SHORT[attr as Attribute]} ${bonus >= 0 ? '+' : ''}${bonus}`)
              .join(", ")}
          </div>
        )}

        {skills && Object.keys(skills).length > 0 && (
          <div>
            <span className="stat-block-property">Skills</span>{" "}
            {Object.entries(skills)
              .map(([skill, bonus]) => {
                const skillName = capitalize(skill.replace(/([A-Z])/g, " $1").trim());
                return `${skillName} ${bonus >= 0 ? '+' : ''}${bonus}`;
              })
              .join(", ")}
          </div>
        )}

        {passivePerception !== null && (
          <div>
            <span className="stat-block-property">Passive Perception</span>{" "}
            {passivePerception}
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

        {data.statusImmunities && data.statusImmunities.length > 0 && (
          <div>
            <span className="stat-block-property">Condition Immunities</span>{" "}
            {conditionImmunityNames.join(", ")}
          </div>
        )}
      </div>

      <hr className="stat-block-divider" />

      <div className="space-y-2">
        {/* Alignment is free-form text, not validated against the enum */}
        {data.alignment && data.alignment.trim() && (
          <div>
            <span className="stat-block-property">Alignment</span>{" "}
            {data.alignment}
          </div>
        )}

        {data.senses && data.senses.length > 0 && (
          <div>
            <span className="stat-block-property">Senses</span>{" "}
            {data.senses.join(", ")}
          </div>
        )}

        {data.languages && data.languages.length > 0 && (
          <div>
            <span className="stat-block-property">Languages</span>{" "}
            {data.languages.join(", ")}
          </div>
        )}

        {data.challengeRating !== null && data.challengeRating !== undefined && (
          <div>
            <span className="stat-block-property">Challenge</span>{" "}
            {formatChallengeRating(data.challengeRating)} ({data.experiencePoints?.toLocaleString() || 0} XP)
          </div>
        )}

        {data.proficiencyBonus !== null && data.proficiencyBonus !== undefined && (
          <div>
            <span className="stat-block-property">Proficiency Bonus</span>{" "}
            +{data.proficiencyBonus}
          </div>
        )}

        {data.legendaryActionsPerRound !== null && data.legendaryActionsPerRound !== undefined && data.legendaryActionsPerRound > 0 && (
          <div>
            <span className="stat-block-property">Legendary Actions</span>{" "}
            {data.legendaryActionsPerRound} per round
          </div>
        )}
      </div>

      {Object.keys(customStats).length > 0 && (
        <>
          <hr className="stat-block-divider" />
          <div className="space-y-1 font-serif text-sm">
            {Object.entries(customStats).map(([key, value]) => (
              <p key={key}>
                <span className="stat-block-property">
                  {capitalize(key.replace(/_/g, " "))}
                </span>{" "}
                <EntityLink value={value} />
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
