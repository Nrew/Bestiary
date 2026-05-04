import type { NameLookupMap } from "@/components/shared/wiki-link/WikiLinkExtension";
import type { BestiaryEntry } from "@/types";

export type WikiLookupSources = {
  entities: Map<string, BestiaryEntry>;
  items: Map<string, BestiaryEntry>;
  statuses: Map<string, BestiaryEntry>;
  abilities: Map<string, BestiaryEntry>;
};

/**
 * Build the wiki link name to { id, type } map. Merge order is fixed:
 * entities, then items, then statuses, then abilities; two entries with the
 * same display name (case-insensitive) keep the **last** context in this list.
 */
export function buildWikiNameLookup(sources: WikiLookupSources): NameLookupMap {
  const map: NameLookupMap = new Map();

  sources.entities.forEach((e) =>
    map.set(e.name.toLowerCase(), { id: e.id, name: e.name, type: "entities" })
  );
  sources.items.forEach((i) =>
    map.set(i.name.toLowerCase(), { id: i.id, name: i.name, type: "items" })
  );
  sources.statuses.forEach((s) =>
    map.set(s.name.toLowerCase(), { id: s.id, name: s.name, type: "statuses" })
  );
  sources.abilities.forEach((a) =>
    map.set(a.name.toLowerCase(), { id: a.id, name: a.name, type: "abilities" })
  );

  return map;
}
