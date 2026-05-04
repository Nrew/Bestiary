import { generateUuid } from "../utils";
import type { ViewContext, BestiaryEntry, Entity, Item, Status, Ability } from "@/types";

export function createDefaultEntry(context: ViewContext): BestiaryEntry {
  const base = {
    id: generateUuid(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description: "<p>A new entry awaits thy wisdom...</p>",
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const name = `New ${capitalize(context.slice(0, -1))}`;
  const slug = `new-${context.slice(0, -1)}-${Date.now()}`;

  switch (context) {
    case "entities": {
      const entity: Entity = {
        ...base,
        name,
        slug,
        taxonomy: {
          genus: null,
          species: null,
          subspecies: null,
        },
        size: null,
        threatLevel: null,
        alignment: null,
        challengeRating: null,
        experiencePoints: null,
        proficiencyBonus: null,
        legendaryActionsPerRound: null,
        savingThrows: {},
        skills: {},
        damageResistances: [],
        statusImmunities: [],
        senses: [],
        languages: [],
        habitats: [],
        statBlock: {
          hp: null,
          armor: null,
          speed: null,
          strength: null,
          dexterity: null,
          constitution: null,
          intelligence: null,
          wisdom: null,
          charisma: null,
          custom: {},
        },
        notes: "",
        statusIds: [],
        abilityIds: [],
        inventory: [],
        images: [],
      };
      return entity;
    }

    case "items": {
      const item: Item = {
        ...base,
        name,
        slug,
        type: "trinket",
        icon: "entity/trinket",
        weight: null,
        bulk: null,
        rarity: null,
        properties: {},
        equipSlots: [],
        statModifiers: {},
        durability: null,
      };
      return item;
    }

    case "statuses": {
      const status: Status = {
        ...base,
        name,
        shortTag: slug,
        icon: "condition/charmed",
        color: null,
        summary: "A brief summary of this status effect.",
        payload: {
          movePenalty: null,
          attackPenalty: null,
          defenseBonus: null,
          durationRounds: null,
          durationMinutes: null,
          stacks: "no",
          tags: [],
          custom: {},
        },
      };
      return status;
    }

    case "abilities": {
      const ability: Ability = {
        ...base,
        name,
        slug,
        type: "passive",
        target: null,
        castingTime: null,
        requiresConcentration: false,
        components: null,
        recharge: null,
        effects: [
          {
            type: "custom",
            description: "A custom effect awaiting description.",
            data: {},
          },
        ],
      };
      return ability;
    }

    default: {
      throw new Error("Unhandled context in createDefaultEntry");
    }
  }
}

export function createDefaultAbilityEffect(): Ability["effects"][0] {
  return {
    type: "custom",
    description: "Describe the effect here.",
    data: {},
  };
}

/** Loot drop used in forms where itemId may not yet be set. */
export type FormLootDrop = Omit<Entity["inventory"][0], "itemId"> & { itemId: string };

export function createDefaultLootDrop(): FormLootDrop {
  return {
    itemId: "",
    quantity: "1",
    dropChance: 1.0,
  };
}

export function createDefaultDamageResistance(): Entity["damageResistances"][0] {
  return {
    damageType: "bludgeoning",
    level: "resistant",
  };
}
