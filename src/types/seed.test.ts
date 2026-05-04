import { describe, expect, it } from "vitest";
import { z } from "zod";
import seed from "../../src-tauri/seed/seed.json";

const uuid = z.uuid();

function expectUuid(value: string, path: string): void {
  const result = uuid.safeParse(value);
  expect(result.success, `${path} should be a valid UUID`).toBe(true);
}

function checkEffects(effects: unknown[], path: string): void {
  for (const [index, effect] of effects.entries()) {
    if (!effect || typeof effect !== "object") continue;
    const record = effect as Record<string, unknown>;
    for (const key of ["statusId", "entityId", "targetEntityId"]) {
      const value = record[key];
      if (typeof value === "string") {
        expectUuid(value, `${path}.${index}.${key}`);
      }
    }
    if (Array.isArray(record.effects)) {
      checkEffects(record.effects, `${path}.${index}.effects`);
    }
  }
}

describe("bundled seed data", () => {
  it("uses UUIDs for IDs and cross references consumed by frontend schemas", () => {
    seed.data.statuses.forEach((status, index) => {
      expectUuid(status.id, `statuses.${index}.id`);
    });

    seed.data.items.forEach((item, index) => {
      expectUuid(item.id, `items.${index}.id`);
    });

    seed.data.abilities.forEach((ability, index) => {
      expectUuid(ability.id, `abilities.${index}.id`);
      checkEffects(ability.effects, `abilities.${index}.effects`);
    });

    seed.data.entities.forEach((entity, index) => {
      expectUuid(entity.id, `entities.${index}.id`);
      entity.statusImmunities.forEach((id, idIndex) =>
        expectUuid(id, `entities.${index}.statusImmunities.${idIndex}`)
      );
      entity.statusIds.forEach((id, idIndex) =>
        expectUuid(id, `entities.${index}.statusIds.${idIndex}`)
      );
      entity.abilityIds.forEach((id, idIndex) =>
        expectUuid(id, `entities.${index}.abilityIds.${idIndex}`)
      );
      entity.inventory.forEach((loot, lootIndex) =>
        expectUuid(loot.itemId, `entities.${index}.inventory.${lootIndex}.itemId`)
      );
    });
  });
});
