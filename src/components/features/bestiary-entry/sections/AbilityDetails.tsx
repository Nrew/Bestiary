import React from "react";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { useAppStore } from "@/store/appStore";
import { useWikiLink } from "@/components/shared/wiki-link/WikiLinkProvider";
import {
  ABILITY_TYPE_LABELS,
  ABILITY_SCORE_LABELS,
  AOE_SHAPE_LABELS,
  DAMAGE_TYPE_LABELS,
} from "@/lib/dnd/constants";
import { hasRichTextContent } from "@/lib/empty";
import { formatStatValue, formatValue } from "@/lib/dnd/format-utils";
import { formatLabel } from "@/lib/utils";
import type { Ability, AbilityEffect, ViewContext } from "@/types";
import { useReferencedEntryName } from "@/hooks/useReferencedEntryName";

type EffectLinkContext = Extract<ViewContext, "entities" | "statuses">;

const EntryLink: React.FC<{
  id: string;
  type: EffectLinkContext;
  onNavigate: (id: string, type: EffectLinkContext) => void;
}> = ({ id, type, onNavigate }) => {
  const { status, name } = useReferencedEntryName(type, id);
  const { showTooltip, hideTooltip } = useWikiLink();
  const isFound = status === "found";

  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => {
        e.currentTarget.blur();
        onNavigate(id, type);
      }}
      onMouseEnter={(e) => { if (id) showTooltip(id, type, e.currentTarget); }}
      onMouseLeave={() => hideTooltip()}
      className={`wiki-link text-sm ${isFound ? "wiki-link--found" : "wiki-link--broken"}`}
    >
      {isFound ? name : "…"}
    </button>
  );
};

interface EffectDisplayProps {
  effect: AbilityEffect;
  onNavigate: (id: string, type: EffectLinkContext) => void;
}

const EffectDisplay: React.FC<EffectDisplayProps> = ({
  effect,
  onNavigate,
}) => {
  switch (effect.type) {
    case "damage":
      return (
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="font-mono">
            {effect.formula}
          </Badge>
          <span>{DAMAGE_TYPE_LABELS[effect.damageType]} damage</span>
        </div>
      );

    case "heal":
      return (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-600 font-mono">
            {effect.formula}
          </Badge>
          <span>healing</span>
        </div>
      );

    case "applyStatus": {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Apply</span>
            <EntryLink id={effect.statusId} type="statuses" onNavigate={onNavigate} />
            <span>for {effect.duration}</span>
          </div>
          {effect.savingThrow && (
            <div className="text-xs text-muted-foreground ml-4">
              DC {effect.savingThrow.dc} {ABILITY_SCORE_LABELS[effect.savingThrow.attribute]} save
            </div>
          )}
        </div>
      );
    }

    case "modifyStat":
      return (
        <div className="flex items-center gap-2">
          <span>Modify {ABILITY_SCORE_LABELS[effect.attribute]}</span>
          <Badge variant="outline">{formatStatValue(effect.value)}</Badge>
          <span>for {effect.durationRounds} rounds</span>
        </div>
      );

    case "summon": {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          <span>Summon {effect.quantity}</span>
          <EntryLink id={effect.entityId} type="entities" onNavigate={onNavigate} />
        </div>
      );
    }

    case "transform": {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span>Transform into</span>
            <EntryLink id={effect.targetEntityId} type="entities" onNavigate={onNavigate} />
            <span>for {effect.duration}</span>
          </div>
          {effect.revertOnDeath && (
            <div className="text-xs text-muted-foreground ml-4">Reverts when reduced to 0 HP</div>
          )}
        </div>
      );
    }

    case "move":
      return (
        <div className="flex items-center gap-2">
          <span>
            Move {effect.distance} ft. {effect.direction}
          </span>
        </div>
      );

    case "areaOfEffect":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span>
              {effect.range} ft. {AOE_SHAPE_LABELS[effect.shape]}
            </span>
          </div>
          {effect.effects.length > 0 && (
            <div className="ml-4 space-y-1 border-l-2 border-muted pl-3">
              {effect.effects.map((subEffect, i) => (
                <EffectDisplay
                  key={i}
                  effect={subEffect}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      );

    case "custom":
      return (
        <div className="space-y-2">
          <p>{effect.description}</p>
          {Object.keys(effect.data ?? {}).length > 0 && (
            <div className="text-xs text-muted-foreground space-y-1 ml-2">
              {Object.entries(effect.data).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium">{formatLabel(key)}:</span>
                  <span>{formatValue(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    default:
      return <span className="text-muted-foreground">Unknown effect</span>;
  }
};

export const AbilityDetailsSection: React.FC<{ data: Ability }> = ({ data }) => {
  const hasTarget = data.target !== null;
  const hasComponents = data.components !== null;

  return (
    <div className="space-y-6">
      <div className="stone-plate">
        <h3 className="font-display text-lg mb-3 text-primary text-center">
          Ability Details
        </h3>
        <div className="space-y-2 text-sm font-serif">
          <div className="flex justify-between">
            <strong className="text-foreground/70">Type</strong>
            <Badge variant="outline">{ABILITY_TYPE_LABELS[data.type]}</Badge>
          </div>
          {data.castingTime && (
            <div className="flex justify-between">
              <strong className="text-foreground/70">Casting Time</strong>
              <span>{data.castingTime}</span>
            </div>
          )}
          {data.recharge && (
            <div className="flex justify-between">
              <strong className="text-foreground/70">Recharge</strong>
              <span>{data.recharge}</span>
            </div>
          )}
          {data.requiresConcentration && (
            <div className="flex justify-between">
              <strong className="text-foreground/70">Concentration</strong>
              <Badge variant="secondary">Required</Badge>
            </div>
          )}
        </div>
      </div>

      {hasTarget && data.target && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Targeting
          </h3>
          <div className="space-y-2 text-sm font-serif">
            {data.target.type === "selfTarget" && (
              <div className="text-center">Self</div>
            )}
            {data.target.type === "target" && (
              <>
                <div className="flex justify-between">
                  <strong className="text-foreground/70">Range</strong>
                  <span>{data.target.range} ft.</span>
                </div>
                <div className="flex justify-between">
                  <strong className="text-foreground/70">Targets</strong>
                  <span>{data.target.count}</span>
                </div>
              </>
            )}
            {data.target.type === "area" && (
              <>
                <div className="flex justify-between">
                  <strong className="text-foreground/70">Shape</strong>
                  <span>{AOE_SHAPE_LABELS[data.target.shape]}</span>
                </div>
                <div className="flex justify-between">
                  <strong className="text-foreground/70">Range</strong>
                  <span>{data.target.range} ft.</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {hasComponents && data.components && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Components
          </h3>
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {data.components.verbal && <Badge variant="outline">V</Badge>}
            {data.components.somatic && <Badge variant="outline">S</Badge>}
            {data.components.material && <Badge variant="outline">M</Badge>}
          </div>
          {data.components.material && (
            <p className="text-xs text-center text-muted-foreground italic">
              {data.components.material}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const AbilityEffectsSection: React.FC<{ data: Ability }> = ({ data }) => {
  const navigateToEntry = useAppStore((s) => s.navigateToEntry);

  if (!data.effects || data.effects.length === 0) {
    return null;
  }

  return (
    <div className="stone-plate">
      <h3 className="font-display text-lg mb-3 text-primary text-center">
        Effects
      </h3>
      <div className="space-y-3 text-sm font-serif">
        {data.effects.map((effect, index) => (
          <div key={index} className="p-2 bg-muted/30 rounded font-serif italic">
            <EffectDisplay
              effect={effect}
              onNavigate={(id, type) => {
                void navigateToEntry(type, id);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export const AbilityDescriptionSection: React.FC<{ data: Ability }> = ({
  data,
}) => {
  if (!hasRichTextContent(data.description)) return null;

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none viewer-prose font-serif">
      <RichTextViewer html={data.description} />
    </div>
  );
};
