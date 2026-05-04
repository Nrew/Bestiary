import type {
  EntityExport,
  ItemExport,
  StatusExport,
  AbilityExport,
} from "./generated";


export type Entity = EntityExport;
export type Item = ItemExport;
export type Status = StatusExport;
export type Ability = AbilityExport;

export type BestiaryEntry = Entity | Item | Status | Ability;
export type ViewContext = "entities" | "items" | "statuses" | "abilities";

export * from "./generated";
export * from "./schemas";
