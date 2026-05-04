import type {
  BestiaryEntry,
  Entity,
  Item,
  Status,
  Ability,
  ViewContext
} from '@/types';

export function isEntity(entry: unknown): entry is Entity {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'taxonomy' in entry &&
    'statBlock' in entry &&
    'challengeRating' in entry
  );
}

export function isItem(entry: unknown): entry is Item {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'slug' in entry &&
    'type' in entry &&
    'weight' in entry &&
    !('taxonomy' in entry)
  );
}

export function isStatus(entry: unknown): entry is Status {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'shortTag' in entry &&
    'payload' in entry &&
    'summary' in entry
  );
}

export function isAbility(entry: unknown): entry is Ability {
  return (
    typeof entry === 'object' &&
    entry !== null &&
    'slug' in entry &&
    'effects' in entry &&
    'type' in entry &&
    !('taxonomy' in entry) &&
    !('weight' in entry)
  );
}

export function getEntryContext(entry: BestiaryEntry): ViewContext {
  if (isEntity(entry)) return 'entities';
  if (isItem(entry)) return 'items';
  if (isStatus(entry)) return 'statuses';
  if (isAbility(entry)) return 'abilities';
  throw new Error('Unknown entry type');
}

export function isViewContext(value: unknown): value is ViewContext {
  return (
    typeof value === 'string' &&
    ['entities', 'items', 'statuses', 'abilities'].includes(value)
  );
}
