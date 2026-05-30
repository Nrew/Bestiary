export function lootRollDropped(roll: number, dropChance: number): boolean {
  const pct = Math.round(dropChance * 100);
  return roll > 100 - pct;
}
