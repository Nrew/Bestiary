import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { burnVariants } from "@/lib/animations";
import {
  MoreVertical,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebarContext } from "./SidebarContext";
import { SIDEBAR_CONFIG, ITEM_STYLING } from "./constants";
import { SearchHighlight } from "@/components/shared/SearchHighlight";
import type { BestiaryEntry } from "@/types";

/**
 * CVA variants for sidebar item styling.
 *
 * NOTE: `ITEM_STYLING` (from ./constants) and this CVA definition are
 * COMPLEMENTARY, not duplicates:
 *   - CVA controls the item CONTAINER's hover/selected background + border.
 *   - ITEM_STYLING.{color,bg,gradientClass} styles child elements inside the
 *     item (icon container bg, icon color, selection gradient bar, blur halo).
 *     Those targets can't be expressed cleanly as CVA variants because they
 *     apply to different DOM nodes.
 * When updating a per-entity color, both sources must be kept in sync.
 */
const sidebarItemVariants = cva(
  [
    "group relative flex items-center gap-3 p-4 pr-12 overflow-hidden rounded-lg border cursor-pointer",
    "transition-all duration-200 hover:translate-x-1",
    // Respect prefers-reduced-motion: strip transforms + transitions.
    "motion-reduce:transform-none motion-reduce:transition-none",
  ],
  {
    variants: {
      variant: {
        entity: ITEM_STYLING.entity.hoverClass,
        item: ITEM_STYLING.item.hoverClass,
        status: ITEM_STYLING.status.hoverClass,
        ability: ITEM_STYLING.ability.hoverClass,
      },
      isSelected: {
        true: "border-2 shadow-md",
        false: "bg-card/50 border-border/30 hover:shadow-sm",
      },
    },
    compoundVariants: [
      {
        variant: "entity",
        isSelected: true,
        className: ITEM_STYLING.entity.selectedClass,
      },
      {
        variant: "item",
        isSelected: true,
        className: ITEM_STYLING.item.selectedClass,
      },
      {
        variant: "status",
        isSelected: true,
        className: ITEM_STYLING.status.selectedClass,
      },
      {
        variant: "ability",
        isSelected: true,
        className: ITEM_STYLING.ability.selectedClass,
      },
    ],
    defaultVariants: {
      variant: "entity",
      isSelected: false,
    },
  }
);

const truncateName = (
  name: string,
  maxLength: number = SIDEBAR_CONFIG.MAX_NAME_LENGTH
): string => {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength)}...`;
};

interface SidebarItemProps extends VariantProps<typeof sidebarItemVariants> {
  item: BestiaryEntry;
  /** Pre-computed match indices for highlighting */
  matchIndices?: [number, number][];
  className?: string;
}

const SidebarItemActions = React.memo<{
  onView: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  isSelected: boolean;
}>(({ onView, onEdit, onDelete, isSelected }) => (
  <div className="absolute top-1/2 -translate-y-1/2 right-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity",
            isSelected && "opacity-100"
          )}
          onClick={(e) => e.stopPropagation()}
          aria-label="Item actions"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>
          <Eye className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
));

SidebarItemActions.displayName = 'SidebarItemActions';

export const SidebarItem = React.memo<SidebarItemProps>(({
  className,
  item,
  matchIndices,
  variant
}) => {
  const { selectedId, onItemClick, onDeleteRequest, contextConfig } = useSidebarContext();

  const isSelected = selectedId === item.id;
  const IconComponent = contextConfig.icon;
  const displayName = truncateName(item.name);

  const styling = variant && variant in ITEM_STYLING
    ? ITEM_STYLING[variant]
    : ITEM_STYLING.entity;

  const handleClick = useCallback(() => {
    onItemClick(item.id);
  }, [onItemClick, item.id]);

  const handleView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onItemClick(item.id);
  }, [onItemClick, item.id]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onItemClick(item.id, true);
  }, [onItemClick, item.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteRequest(item.id, item.name);
  }, [onDeleteRequest, item.id, item.name]);

  return (
    <motion.div
      variants={burnVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        sidebarItemVariants({ variant, isSelected, className })
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${displayName} - ${contextConfig.label.slice(0, -1)}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {isSelected && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1",
            styling.gradientClass
          )}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          "relative shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all",
          isSelected ? styling.bg : "bg-secondary/50 group-hover:bg-brass/10"
        )}
      >
        <IconComponent
          className={cn(
            "w-5 h-5 transition-colors",
            isSelected
              ? styling.color
              : "text-muted-foreground group-hover:text-brass"
          )}
          aria-hidden="true"
        />
        {isSelected && (
          <div
            className={cn(
              "absolute inset-0 rounded-lg blur-sm -z-10",
              styling.bg
            )}
            aria-hidden="true"
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h4
          className={cn(
            "font-serif font-semibold text-base truncate",
            isSelected ? "text-foreground" : "text-foreground/90"
          )}
          title={item.name}
        >
          <SearchHighlight
            text={displayName}
            indices={matchIndices}
            highlightClassName="bg-rune/30 text-leather font-bold rounded-sm px-0.5"
          />
        </h4>
      </div>

      <SidebarItemActions
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isSelected={isSelected}
      />
    </motion.div>
  );
});

SidebarItem.displayName = 'SidebarItem';
