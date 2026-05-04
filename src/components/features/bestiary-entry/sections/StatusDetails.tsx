import React from "react";
import { Badge } from "@/components/ui/badge";
import { RichTextViewer } from "@/components/shared/RichTextViewer";
import { Icon } from "@/components/shared/Icon";
import { EntityLink } from "@/components/shared/EntityLink";
import { hasMeaningfulString, hasRichTextContent } from "@/lib/empty";
import { formatStatValue, formatValue, isNegativeStatValue } from "@/lib/dnd/format-utils";
import { formatLabel } from "@/lib/utils";
import type { Status, StatValue } from "@/types";

const STACKING_LABELS: Record<string, string> = {
  no: "Does Not Stack",
  refresh: "Refreshes Duration",
  stack: "Stacks (Intensifies)",
};

const StatModifierDisplay: React.FC<{
  label: string;
  stat: StatValue | null;
}> = ({ label, stat }) => {
  if (!stat) return null;

  return (
    <div className="flex justify-between">
      <strong className="text-foreground/70">{label}</strong>
      <span className={isNegativeStatValue(stat) ? "text-red-600" : "text-green-600"}>
        {formatStatValue(stat)}
      </span>
    </div>
  );
};

export const StatusDetailsSection: React.FC<{ data: Status }> = ({ data }) => {
  const { payload } = data;
  const hasTags = payload.tags && payload.tags.length > 0;
  const hasCustomData = Object.keys(payload.custom ?? {}).length > 0;
  const hasEffects =
    payload.movePenalty || payload.attackPenalty || payload.defenseBonus;
  const hasDuration = payload.durationRounds || payload.durationMinutes;

  return (
    <div className="space-y-6">
      <div className="stone-plate">
        <h3 className="font-display text-lg mb-3 text-primary text-center">
          Status Details
        </h3>
        <div className="space-y-3 text-sm font-serif">
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <strong className="text-foreground/70">Name</strong>
            <div className="flex items-center gap-2">
              {data.icon && <Icon category="status" name={data.icon.replace('dnd/', '')} size="sm" />}
              <span className="font-semibold">{data.name}</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <strong className="text-foreground/70">Short Tag</strong>
            <Badge
              variant="outline"
              className="font-mono"
              style={
                data.color
                  ? { borderColor: data.color, color: data.color }
                  : undefined
              }
            >
              {data.shortTag}
            </Badge>
          </div>
          {data.color && (
            <div className="flex justify-between items-center">
              <strong className="text-foreground/70">Color</strong>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: data.color }}
                />
                <span className="font-mono text-xs">{data.color}</span>
              </div>
            </div>
          )}
          <div className="flex justify-between">
            <strong className="text-foreground/70">Stacking</strong>
            <span>{STACKING_LABELS[payload.stacks] ?? payload.stacks}</span>
          </div>
        </div>
      </div>

      {hasDuration && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Duration
          </h3>
          <div className="space-y-2 text-sm font-serif">
            {payload.durationRounds && (
              <div className="flex justify-between">
                <strong className="text-foreground/70">Rounds</strong>
                <span>{payload.durationRounds}</span>
              </div>
            )}
            {payload.durationMinutes && (
              <div className="flex justify-between">
                <strong className="text-foreground/70">Minutes</strong>
                <span>{payload.durationMinutes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {hasEffects && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Effects
          </h3>
          <div className="space-y-2 text-sm font-serif">
            <StatModifierDisplay label="Movement" stat={payload.movePenalty} />
            <StatModifierDisplay label="Attack" stat={payload.attackPenalty} />
            <StatModifierDisplay label="Defense" stat={payload.defenseBonus} />
          </div>
        </div>
      )}

      {hasTags && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {payload.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="font-serif">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {hasCustomData && (
        <div className="stone-plate">
          <h3 className="font-display text-lg mb-3 text-primary text-center">
            Custom Data
          </h3>
          <div className="space-y-2 text-sm font-serif">
            {Object.entries(payload.custom).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center gap-2">
                <strong className="text-foreground/70">{formatLabel(key)}</strong>
                <EntityLink value={formatValue(value)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const StatusSummarySection: React.FC<{ data: Status }> = ({ data }) => {
  if (!hasMeaningfulString(data.summary)) return null;
  return (
    <div className="stone-plate">
      <h3 className="font-display text-lg mb-3 text-primary text-center">
        Summary
      </h3>
      <p className="text-sm font-serif text-center italic text-foreground/80">
        {data.summary}
      </p>
    </div>
  );
};

export const StatusDescriptionSection: React.FC<{ data: Status }> = ({
  data,
}) => {
  if (!hasRichTextContent(data.description)) return null;

  return (
    <div className="prose prose-lg dark:prose-invert max-w-none viewer-prose font-serif">
      <RichTextViewer html={data.description} />
    </div>
  );
};
