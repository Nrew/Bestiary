import { Crown, Gem, Shield, Sparkles } from "lucide-react";
import type { ViewContext } from "@/types";
import { CONTEXT_REGISTRY, type ContextUIConfig } from "@/lib/context-config";
import { PAGE_SIZE } from "@/lib/dnd/constants";

/**
 * Extended sidebar context configuration with resolved React icon components.
 * Derives from the centralized CONTEXT_REGISTRY to prevent duplication.
 */
export interface SidebarContextConfig extends ContextUIConfig {
  label: string;
  icon: React.ElementType;
  color: string;
}

const ICON_MAP: Record<ContextUIConfig['iconName'], React.ElementType> = {
  crown: Crown,
  gem: Gem,
  shield: Shield,
  sparkles: Sparkles,
};

function resolveSidebarConfig(context: ViewContext): SidebarContextConfig {
  const config = CONTEXT_REGISTRY[context];
  return {
    ...config.ui,
    label: config.ui.displayLabel,
    icon: ICON_MAP[config.ui.iconName],
    color: config.ui.colorClass,
  };
}

// Derived from CONTEXT_REGISTRY so icon + color overrides only need to happen there.
export const CONTEXT_CONFIG: Record<ViewContext, SidebarContextConfig> = {
  entities: resolveSidebarConfig('entities'),
  items: resolveSidebarConfig('items'),
  statuses: resolveSidebarConfig('statuses'),
  abilities: resolveSidebarConfig('abilities'),
} as const;

export const SIDEBAR_CONFIG = {
  PAGE_SIZE,
  /** Item row height in pixels, used by the virtual scroller */
  ITEM_HEIGHT: 72,
  /** Virtual scroll overscan: rows rendered beyond the visible window */
  OVERSCAN: 10,
  MAX_NAME_LENGTH: 32,
  ANIMATION_DELAYS: {  // ms
    HEADER: 100,
    NAV: 200,
    SEARCH: 400,
    LIST: 500,
    FOOTER: 600,
  },
} as const;

export const ITEM_STYLING = {
  entity: {
    color: "text-moss",
    bg: "bg-moss/5",
    gradientClass: "bg-linear-to-b from-moss/20",
    hoverClass: "hover:bg-moss/10 hover:border-moss/30",
    selectedClass: "bg-moss/5 border-moss/20",
  },
  item: {
    color: "text-brass-strong",
    bg: "bg-brass/5",
    gradientClass: "bg-linear-to-b from-brass/20",
    hoverClass: "hover:bg-brass/10 hover:border-brass/30",
    selectedClass: "bg-brass/5 border-brass/20",
  },
  status: {
    color: "text-violet",
    bg: "bg-violet/5",
    gradientClass: "bg-linear-to-b from-violet/20",
    hoverClass: "hover:bg-violet/10 hover:border-violet/30",
    selectedClass: "bg-violet/5 border-violet/20",
  },
  ability: {
    color: "text-bloodstone",
    bg: "bg-bloodstone/5",
    gradientClass: "bg-linear-to-b from-bloodstone/20",
    hoverClass: "hover:bg-bloodstone/10 hover:border-bloodstone/30",
    selectedClass: "bg-bloodstone/5 border-bloodstone/20",
  },
} as const;

export const API_CONFIG = {
  entities: 'entities',
  items: 'items',
  statuses: 'statuses',
  abilities: 'abilities',
} as const;

export const ERROR_MESSAGES = {
  LOAD_FAILED: (context: string) => `Failed to load ${context}. Please try again.`,
  DELETE_FAILED: 'Unable to delete this entry. Please try again.',
  SEARCH_FAILED: 'Search encountered an error. Please try again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please refresh the page.',
} as const;
