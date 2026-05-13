import { escapeHtml } from "@/lib/sanitize";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { AlertTriangle } from "lucide-react";
import type { Entity, Ability } from "@/types";
import type { EntityAbilities } from "@/hooks/useEntityAbilities";

// WeakMap keyed on ability identity: the store creates new ability objects
// when content changes, so stale entries are GC-collected automatically.
// Survives navigation, no manual invalidation, no test reset needed.
const abilityHtmlCache = new WeakMap<Ability, string>();

export function buildAbilityHtml(name: string, description: string): string {
  const content = description.replace(/^<p>/, "").replace(/<\/p>\s*$/, "");
  return `<p><strong><em>${escapeHtml(name)}.</em></strong> ${content}</p>`;
}

function getAbilityHtml(ability: Ability): string {
  let html = abilityHtmlCache.get(ability);
  if (html === undefined) {
    html = buildAbilityHtml(ability.name, ability.description);
    abilityHtmlCache.set(ability, html);
  }
  return html;
}

function AbilityGroup({ abilities, header }: { abilities: Ability[]; header?: string }) {
  if (abilities.length === 0) return null;
  return (
    <div className="space-y-2">
      {header && <h3 className="codex-section-heading text-base tracking-widest mt-2">{header}</h3>}
      {abilities.map((ability) => (
        <AbilityText key={ability.id} ability={ability} />
      ))}
    </div>
  );
}

function SpecialAbilityGroup({ abilities, header, badge }: { abilities: Ability[]; header: string; badge?: string }) {
  if (abilities.length === 0) return null;
  return (
    <div className="space-y-3">
      <hr className="stat-block-divider" />
      <div className="flex flex-col items-center gap-0.5">
        <h3 className="codex-section-heading text-base tracking-widest">{header}</h3>
        {badge && (
          <span className="text-2xs font-serif uppercase tracking-widest text-ink/40">{badge}</span>
        )}
      </div>
      <div className="space-y-2">
        {abilities.map((ability) => (
          <AbilityText key={ability.id} ability={ability} />
        ))}
      </div>
    </div>
  );
}

export function AbilityText({ ability }: { ability: Ability }) {
  return <RichTextViewer html={getAbilityHtml(ability)} className="text-base" />;
}

export function AbilitiesSection({ data, abilities }: { data: Entity; abilities: EntityAbilities }) {
  if (!data.abilityIds?.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <AbilityGroup abilities={abilities.traits} />
      <AbilityGroup abilities={abilities.actions} header="Actions" />
      <AbilityGroup abilities={abilities.bonusActions} header="Bonus Actions" />
      <AbilityGroup abilities={abilities.reactions} header="Reactions" />
      <SpecialAbilityGroup
        abilities={abilities.legendaryActions}
        header="Legendary Actions"
        badge={
          data.legendaryActionsPerRound != null && data.legendaryActionsPerRound > 0
            ? `${data.legendaryActionsPerRound} per round`
            : undefined
        }
      />
      <SpecialAbilityGroup
        abilities={abilities.mythicActions}
        header="Mythic Actions"
      />
      {abilities.missingIds.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive/60" />
          {abilities.missingIds.length === 1
            ? "One linked ability could not be loaded."
            : `${abilities.missingIds.length} linked abilities could not be loaded.`}
        </div>
      )}
    </div>
  );
}
