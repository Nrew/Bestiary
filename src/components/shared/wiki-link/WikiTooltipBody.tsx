import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { stripHtml, formatCR } from "@/lib/utils";
import { ENTITY_SIZE_LABELS } from "@/lib/dnd/constants";
import { CONTEXT_REGISTRY } from "@/lib/context-config";
import type { BestiaryEntry, ViewContext, Entity, Status } from "@/types";

interface WikiTooltipBodyProps {
  data: BestiaryEntry | null;
  type: ViewContext;
  isLoading: boolean;
}

export const WikiTooltipBody: React.FC<WikiTooltipBodyProps> = ({ data, type, isLoading }) => {
  const name        = data?.name;
  const description = data
    ? (type === "statuses" ? (data as Status).summary : data.description)
    : "";

  let entitySubtitle: string | null = null;
  if (type === "entities" && data) {
    const entity = data as Entity;
    const parts: string[] = [];
    if (entity.size) parts.push(ENTITY_SIZE_LABELS[entity.size]);
    if (entity.taxonomy.genus) parts.push(entity.taxonomy.genus);
    const left  = parts.join(" ");
    const right = entity.challengeRating !== null ? `CR ${formatCR(entity.challengeRating)}` : null;
    entitySubtitle = [left, right].filter(Boolean).join(", ") || null;
  }

  const { label: typeLabel, ui: { accentColor } } = CONTEXT_REGISTRY[type];

  return (
    <>
      <div
        className="h-1 w-full rounded-t-lg opacity-70"
        style={{ backgroundColor: accentColor }}
        aria-hidden="true"
      />

      <div className="px-3 pt-2 pb-3 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <span className="block font-display text-base font-bold text-foreground leading-tight truncate">
                {name}
              </span>
            )}
            {type === "entities" && (
              isLoading ? (
                <Skeleton className="h-3 w-20 mt-1" />
              ) : entitySubtitle ? (
                <span className="block font-serif text-[11px] text-muted-foreground leading-tight mt-0.5 italic">
                  {entitySubtitle}
                </span>
              ) : null
            )}
          </div>

          <span
            className="shrink-0 font-display text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none"
            style={{
              color:           accentColor,
              borderColor:     accentColor,
              backgroundColor: `color-mix(in oklch, ${accentColor} 10%, transparent)`,
            }}
          >
            {typeLabel}
          </span>
        </div>

        <div>
          {isLoading ? (
            <div className="space-y-1 pt-0.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : (
            <p className="font-serif text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {stripHtml(description || "No description provided.")}
            </p>
          )}
        </div>
      </div>
    </>
  );
};
