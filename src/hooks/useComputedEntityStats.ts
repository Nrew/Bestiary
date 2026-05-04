import { useMemo } from 'react';
import type { Entity, StatBlock } from '@/types';
import {
  calculateAbilityModifier,
  calculateProficiencyBonus,
  formatAbilityModifier,
  calculatePassivePerception,
} from '@/lib/dnd';

const DEFAULT_STAT_BLOCK: StatBlock = {
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
};

export interface ComputedEntityStats {
  // Core modifiers
  proficiencyBonus: number;
  strModifier: number;
  dexModifier: number;
  conModifier: number;
  intModifier: number;
  wisModifier: number;
  chaModifier: number;

  // Formatted modifiers (with + or -)
  strModifierFormatted: string;
  dexModifierFormatted: string;
  conModifierFormatted: string;
  intModifierFormatted: string;
  wisModifierFormatted: string;
  chaModifierFormatted: string;

  // Passive scores
  passivePerception: number;
  passiveInvestigation: number;
  passiveInsight: number;

  // Hit dice
  hitDice: string | null;
  averageHP: number | null;

  // Initiative
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

    const isPerceptionProficient = skills && 'perception' in skills;
    const isInvestigationProficient = skills && 'investigation' in skills;
    const isInsightProficient = skills && 'insight' in skills;

    const passivePerception = calculatePassivePerception(
      wis,
      proficiencyBonus,
      isPerceptionProficient
    );

    const passiveInvestigation = 10 + intModifier + (isInvestigationProficient ? proficiencyBonus : 0);
    const passiveInsight = 10 + wisModifier + (isInsightProficient ? proficiencyBonus : 0);

    let hitDice: string | null = null;
    let averageHP: number | null = null;

    if (statBlock.hp && entity?.size) {
      const hitDieSize = getHitDieSize(entity.size);
      if (hitDieSize) {
        const numDice = Math.floor(statBlock.hp / ((hitDieSize + 1) / 2 + conModifier));
        hitDice = `${numDice}d${hitDieSize}`;
        averageHP = Math.floor(numDice * ((hitDieSize + 1) / 2) + numDice * conModifier);
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
      initiative: dexModifier,
    };
  }, [entity]);
}

function getHitDieSize(size: string): number | null {
  const sizeMap: Record<string, number> = {
    tiny: 4,
    small: 6,
    medium: 8,
    large: 10,
    huge: 12,
    gargantuan: 20,
  };
  return sizeMap[size.toLowerCase()] ?? null;
}

export function calculateAverageFromHitDice(hitDice: string, modifier: number = 0): number {
  const match = hitDice.match(/^(\d+)d(\d+)$/);
  if (!match) return 0;

  const [, numDice, dieSize] = match;
  const avgPerDie = (parseInt(dieSize) + 1) / 2;
  return Math.floor(parseInt(numDice) * avgPerDie + modifier);
}
