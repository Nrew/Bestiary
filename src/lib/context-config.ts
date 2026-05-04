import type { ViewContext, Entity, Item, Status, Ability, BestiaryEntry } from '@/types';
import { entityApi, itemApi, statusApi, abilityApi, type CrudOperations } from '@/lib/api';
import { typedKeys } from '@/lib/type-utils';


export type ContextEntryType<T extends ViewContext> =
  T extends 'entities' ? Entity :
  T extends 'items' ? Item :
  T extends 'statuses' ? Status :
  T extends 'abilities' ? Ability :
  never;


export interface ContextUIConfig {
  /** Display label (e.g., "Creatures") */
  readonly displayLabel: string;
  /** Lucide icon name (resolved to component in UI layer) */
  readonly iconName: 'crown' | 'gem' | 'shield' | 'sparkles';
  readonly colorClass: string;
  readonly description: string;
  readonly variant: 'entity' | 'item' | 'status' | 'ability';
  /** CSS variable used for the wiki-link tooltip accent bar (inline style) */
  readonly accentColor: string;
}

/**
 * API interface that operates on the BestiaryEntry union type.
 * At runtime, each context's API methods only handle their specific type,
 * but the interface uses the union type for polymorphic access.
 *
 * Note: TypeScript's function contravariance means (Entity) => Entity is not
 * directly assignable to (BestiaryEntry) => BestiaryEntry. We use wrapper
 * functions to handle this safely.
 */
export interface ContextApi {
  readonly search: (query: string, limit: number, offset: number) => Promise<BestiaryEntry[]>;
  readonly count: (query: string) => Promise<number>;
  readonly getDetails: (id: string) => Promise<BestiaryEntry>;
  readonly save: (entry: BestiaryEntry) => Promise<BestiaryEntry>;
  readonly delete: (id: string) => Promise<void>;
}

export interface ContextConfig {
  readonly key: ViewContext;
  readonly label: string;
  readonly pluralLabel: string;
  readonly storeKey: ViewContext;
  readonly icon: string;
  readonly ui: ContextUIConfig;
  readonly api: ContextApi;
}

function createApiWrapper<T extends BestiaryEntry>(
  api: CrudOperations<T>
): ContextApi {
  return {
    search: (query, limit, offset) => api.search(query, limit, offset),
    count: (query) => api.count(query),
    getDetails: (id) => api.getDetails(id),
    save: (entry) => api.save(entry as T),
    delete: (id) => api.delete(id),
  };
}

const createConfig = (
  key: ViewContext,
  label: string,
  pluralLabel: string,
  icon: string,
  ui: ContextUIConfig,
  api: ContextApi
): ContextConfig => ({
  key,
  label,
  pluralLabel,
  storeKey: key,
  icon,
  ui,
  api,
});

export const CONTEXT_REGISTRY: Record<ViewContext, ContextConfig> = {
  entities: createConfig('entities', 'Entity', 'Entities', 'users', {
    displayLabel: 'Creatures',
    iconName: 'crown',
    colorClass: 'text-moss',
    description: 'Beasts and beings of the realm',
    variant: 'entity',
    accentColor: 'var(--color-leather)',
  }, createApiWrapper(entityApi)),

  items: createConfig('items', 'Item', 'Items', 'package', {
    displayLabel: 'Artifacts',
    iconName: 'gem',
    colorClass: 'text-brass',
    description: 'Weapons, armor, and treasures',
    variant: 'item',
    accentColor: 'var(--color-moss)',
  }, createApiWrapper(itemApi)),

  statuses: createConfig('statuses', 'Status', 'Statuses', 'activity', {
    displayLabel: 'Conditions',
    iconName: 'shield',
    colorClass: 'text-violet',
    description: 'Ailments and enchantments',
    variant: 'status',
    accentColor: 'var(--color-violet)',
  }, createApiWrapper(statusApi)),

  abilities: createConfig('abilities', 'Ability', 'Abilities', 'zap', {
    displayLabel: 'Powers',
    iconName: 'sparkles',
    colorClass: 'text-bloodstone',
    description: 'Spells and techniques',
    variant: 'ability',
    accentColor: 'var(--color-sapphire)',
  }, createApiWrapper(abilityApi)),
};

export function getContextConfig(context: ViewContext): ContextConfig {
  return CONTEXT_REGISTRY[context];
}

export const ALL_CONTEXTS: readonly ViewContext[] = typedKeys(CONTEXT_REGISTRY);
