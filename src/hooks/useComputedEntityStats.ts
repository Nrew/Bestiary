import { useMemo } from 'react';
import type { Entity, StatBlock } from '@/types';
import {
  calculateAbilityModifier,
  calculateProficiencyBonus,
  formatAbilityModifier,
  calculatePassivePerception,
} from '@/lib/dnd';
import {
  estimateHitDiceCount,
  getHitDieFromSize,
  calculateHitPoints,
} from '@/lib/dnd/calculations';

const DEFAULT_STAT_BLOCK: StatBlock = {
  hp: null,
  hitDice: null,
  armor: null,
  armorNote: null,
  speed: null,
  burrowSpeed: null,
  climbSpeed: null,
  flySpeed: null,
  swimSpeed: null,
  hoverSpeed: null,
  initiativeBonus: null,
  strength: null,
  dexterity: null,
  constitution: null,
  intelligence: null,
  wisdom: null,
  charisma: null,
  custom: {},
};

export interface ComputedEntityStats {
  proficiencyBonus: number;
  strModifier: number;
  dexModifier: number;
  conModifier: number;
  intModifier: number;
  wisModifier: number;
  chaModifier: number;
  strModifierFormatted: string;
  dexModifierFormatted: string;
  conModifierFormatted: string;
  intModifierFormatted: string;
  wisModifierFormatted: string;
  chaModifierFormatted: string;
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;
  hitDice: string | null;
  averageHP: number | null;
  initiative: number;
}

export function useComputedEntityStats(entity: Entity | null | undefined): ComputedEntityStats {
  return useMemo(() => {
    const statBlock = entity?.statBlock ?? DEFAULT_STAT_BLOCK;
    const skills = entity?.skills ?? {};
    const cr = entity?.challengeRating ?? 0;

    const str = statBlock.strength ?? 10;
    const dex = statBlock.dexterity ?? 10;
    const con = statBlock.constitution ?? 10;
    const int = statBlock.intelligence ?? 10;
    const wis = statBlock.wisdom ?? 10;
    const cha = statBlock.charisma ?? 10;

    const proficiencyBonus = calculateProficiencyBonus(cr);

    const strModifier = calculateAbilityModifier(str);
    const dexModifier = calculateAbilityModifier(dex);
    const conModifier = calculateAbilityModifier(con);
    const intModifier = calculateAbilityModifier(int);
    const wisModifier = calculateAbilityModifier(wis);
    const chaModifier = calculateAbilityModifier(cha);

    const passivePerception =
      skills.perception !== undefined
        ? 10 + skills.perception
        : calculatePassivePerception(wis, proficiencyBonus, false);
    const passiveInvestigation =
      skills.investigation !== undefined
        ? 10 + skills.investigation
        : 10 + intModifier;
    const passiveInsight =
      skills.insight !== undefined
        ? 10 + skills.insight
        : 10 + wisModifier;

    let hitDice: string | null = null;
    let averageHP: number | null = null;

    if (statBlock.hp !== null && statBlock.hp !== undefined && entity?.size) {
      const hitDieSize = getHitDieFromSize(entity.size);
      if (hitDieSize) {
        const numDice = estimateHitDiceCount(statBlock.hp, entity.size, conModifier);
        const hp = calculateHitPoints(numDice, hitDieSize, conModifier);
        hitDice = hp.hitDice;
        averageHP = hp.average;
      }
    }

    return {
      proficiencyBonus,
      strModifier,
      dexModifier,
      conModifier,
      intModifier,
      wisModifier,
      chaModifier,
      strModifierFormatted: formatAbilityModifier(str),
      dexModifierFormatted: formatAbilityModifier(dex),
      conModifierFormatted: formatAbilityModifier(con),
      intModifierFormatted: formatAbilityModifier(int),
      wisModifierFormatted: formatAbilityModifier(wis),
      chaModifierFormatted: formatAbilityModifier(cha),
      passivePerception,
      passiveInvestigation,
      passiveInsight,
      hitDice,
      averageHP,
      initiative: statBlock.initiativeBonus ?? dexModifier,
    };
  }, [entity]);
}

export function calculateAverageFromHitDice(hitDice: string, modifier: number = 0): number {
  const match = hitDice.match(/^(\d+)d(\d+)$/);
  if (!match) return 0;

  const [, numDice, dieSize] = match;
  const avgPerDie = (parseInt(dieSize, 10) + 1) / 2;
  return Math.floor(parseInt(numDice, 10) * avgPerDie + modifier);
}
