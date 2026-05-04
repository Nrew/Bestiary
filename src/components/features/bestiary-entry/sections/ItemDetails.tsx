import React from "react";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { Icon } from "@/components/shared/Icon";
import {
  ITEM_TYPE_LABELS,
  RARITY_LABELS,
  ABILITY_SCORE_LABELS,
} from "@/lib/dnd/constants";
import { hasRichTextContent } from "@/lib/empty";
import { formatStatValue, formatValue } from "@/lib/dnd/format-utils";
import { formatLabel } from "@/lib/utils";
import type { Item } from "@/types";

export const ItemDetailsSection: React.FC<{ data: Item }> = ({ data }) => {
  const hasProperties = Object.keys(data.properties ?? {}).length > 0;
  const hasStatModifiers = Object.keys(data.statModifiers ?? {}).length > 0;
  const hasEquipSlots = data.equipSlots && data.equipSlots.length > 0;

  return (
    <div className="space-y-6">
      <div className="stone-plate">
        <h3 className="font-display text-lg mb-3 text-primary text-center">
          Item Details
        </h3>
        <div className="space-y-2 text-sm font-serif">
          {data.icon && (
            <div className="flex justify-between items-center pb-2 border-b border-border/50">
              <strong className="text-foreground/70">Icon</strong>
              <Icon category="item" name={data.icon.replace('dnd/', '')} size="md" />
            </div>
          )}
          <div className="flex justify-between">
            <strong className="text-foreground/70">Type</strong>
            <span>{ITEM_TYPE_LABELS[data.type]}</span>
          </div>
          {data.rarity && (
            <div className="flex justify-between">
              <strong className="text-foreground/70">Rarity</strong>
              <Badge variant="outline" className="font-serif">
                {RARITY_LABELS[data.rarity]}
              </Badge>
            </div>
          )}
          {data.weight != null && (
            <div className="flex justify-between">
              <strong className="text-foreground/70">Weight</strong>
              <span>{data.weight} lbs</span>
            </div>
          )}
          {data.bulk != null && (
            <div className="flex justify-between">
              <strong className="text-foreground/70">Bulk</strong>
              <span>{data.bulk}</span>
            </div>
          )}
        </div>
      </div>

      {data.durability && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Durability
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-serif">
              <span>
                {data.durability.current} / {data.durability.max}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{
                  width: `${data.durability.max > 0 ? (data.durability.current / data.durability.max) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {hasEquipSlots && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Equipment Slots
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {data.equipSlots.map((slot) => (
              <Badge key={slot} variant="secondary" className="font-serif">
                {formatLabel(slot)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasStatModifiers && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Stat Modifiers
          </h3>
          <div className="space-y-2 text-sm font-serif">
            {Object.entries(data.statModifiers).map(([stat, value]) => (
              <div key={stat} className="flex justify-between">
                <strong className="text-foreground/70">
                  {ABILITY_SCORE_LABELS[stat as keyof typeof ABILITY_SCORE_LABELS] ??
                    formatLabel(stat)}
                </strong>
                <span
                  className={value.value >= 0 ? "text-green-600" : "text-red-600"}
                >
                  {formatStatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasProperties && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Properties
          </h3>
          <div className="space-y-2 text-sm font-serif">
            {Object.entries(data.properties).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <strong className="text-foreground/70">{formatLabel(key)}</strong>
                <span>{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ItemDescriptionSection: React.FC<{ data: Item }> = ({ data }) => {
  if (!hasRichTextContent(data.description)) return null;

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none viewer-prose font-serif">
      <RichTextViewer html={data.description} />
    </div>
  );
};
