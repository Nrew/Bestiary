const allIconModules: Record<string, string> = import.meta.glob('/src/assets/icons/dnd/**/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
});

export const iconRegistry: Record<string, Record<string, string>> = {};
for (const path in allIconModules) {
  const url: string = allIconModules[path];
  const pathParts: string[] = path.split('/');
  if (pathParts.length >= 6) {
    const directoryName = pathParts[pathParts.length - 2];
    const iconName = pathParts[pathParts.length - 1].replace('.svg', '');
    if (!iconRegistry[directoryName]) {
      iconRegistry[directoryName] = {};
    }
    iconRegistry[directoryName][iconName] = url;
  }
}

const LOGICAL_TO_PHYSICAL_MAP: Record<string, string[]> = {
  entity: ['entity', 'monster'],
  item: ['entity', 'weapon', 'monster'],
  ability: ['ability', 'combat', 'spell'],
  status: ['condition'],
  ui: ['util', 'entity', 'game'],
  abilityScore: ['ability'],
  damage: ['damage'],
  spell: ['spell'],
  location: ['location'],
  attribute: ['attribute', 'd20test'],
  class: ['class'],
  movement: ['movement'],
  proficiency: ['proficiency'],
  skill: ['skill'],
  target: ['target'],
  dice: ['dice'],
  monster: ['monster', 'entity'],
  d20test: ['d20test', 'attribute'],
  condition: ['condition', 'damage'],
  game: ['game', 'entity'],
  hp: ['hp'],
  combat: ['combat', 'spell'],
  weapon: ['weapon', 'entity'],
  slot: ['slot'],
  util: ['util'],
};

const FALLBACK_ICONS: Record<string, string | undefined> = {
  entity: iconRegistry.monster?.humanoid,
  item: iconRegistry.entity?.object,
  ability: iconRegistry.combat?.action,
  status: iconRegistry.condition?.charmed,
  ui: iconRegistry.util?.star,
  abilityScore: iconRegistry.ability?.strength,
  damage: iconRegistry.damage?.slashing,
  spell: iconRegistry.spell?.evocation,
  location: iconRegistry.location?.village,
  attribute: iconRegistry.attribute?.skillcheck,
  class: iconRegistry.class?.fighter,
  movement: iconRegistry.movement?.walking,
  proficiency: iconRegistry.proficiency?.proficient,
  skill: iconRegistry.skill?.perception,
  target: iconRegistry.target?.touch,
  dice: iconRegistry.dice?.d20,
  monster: iconRegistry.monster?.humanoid,
  d20test: iconRegistry.d20test?.["saving-throw"],
  condition: iconRegistry.condition?.charmed,
  game: iconRegistry.game?.["source-book"],
  hp: iconRegistry.hp?.full,
  combat: iconRegistry.combat?.action,
  weapon: iconRegistry.weapon?.sword,
  slot: iconRegistry.util?.star,
};

export type IconCategory = keyof typeof LOGICAL_TO_PHYSICAL_MAP;

export function isIconCategory(value: string | undefined): value is IconCategory {
  return value !== undefined && value in LOGICAL_TO_PHYSICAL_MAP;
}

const DEFAULT_FALLBACK = iconRegistry.util?.star ?? '';

class IconResolver {
  resolve(category: IconCategory, identifier?: string | null): string {
    const fallback = FALLBACK_ICONS[category] ?? FALLBACK_ICONS.ui ?? DEFAULT_FALLBACK;

    const searchDirectories = LOGICAL_TO_PHYSICAL_MAP[category] || [category];

    if (!identifier) {
      return fallback;
    }

    const normalizedId = identifier.toLowerCase().replace(/_/g, "-").trim();

    for (const dir of searchDirectories) {
      const categoryMap = iconRegistry[dir];
      if (categoryMap && categoryMap[normalizedId]) {
        return categoryMap[normalizedId];
      }
    }

    for (const dir of searchDirectories) {
      const categoryMap = iconRegistry[dir];
      if (categoryMap) {
        const partialMatchKey = Object.keys(categoryMap).find(
          (key) => key !== 'default' && normalizedId.includes(key)
        );
        if (partialMatchKey) {
          return categoryMap[partialMatchKey];
        }
      }
    }

    return fallback;
  }
}

export const iconResolver = new IconResolver();
