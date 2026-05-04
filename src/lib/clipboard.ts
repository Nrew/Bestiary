import { toast } from '@/components/ui/toast';
import { getLogger } from '@/lib/logger';
import { formatValue } from '@/lib/dnd/format-utils';
import type { AbilityEffect, AbilityExport, EntityExport, StatBlock } from '@/types';

const log = getLogger('clipboard');


export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      return fallbackCopyToClipboard(text);
    }
  } catch (error) {
    log.error('Failed to copy to clipboard:', error);
    return false;
  }
}

function fallbackCopyToClipboard(text: string): boolean {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (_error) {
    document.body.removeChild(textArea);
    return false;
  }
}

export async function readFromClipboard(): Promise<string | null> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      return await navigator.clipboard.readText();
    }
    return null;
  } catch (error) {
    log.error('Failed to read from clipboard:', error);
    return null;
  }
}

export async function copyJSONToClipboard(data: unknown): Promise<boolean> {
  try {
    const json = JSON.stringify(data, null, 2);
    const success = await copyToClipboard(json);

    if (success) {
      toast.success('Copied to clipboard');
    } else {
      toast.error('Failed to copy to clipboard');
    }

    return success;
  } catch (error) {
    log.error('Failed to copy JSON:', error);
    toast.error('Failed to copy to clipboard');
    return false;
  }
}

// Writes both text/plain and text/html when available; rich-text targets receive
// the HTML version while plain-text targets receive the fallback string.
export async function copyFormattedText(
  plain: string,
  html?: string
): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      const data: Record<string, Blob> = {
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      };

      if (html) {
        data['text/html'] = new Blob([html], { type: 'text/html' });
      }

      const clipboardItem = new ClipboardItem(data);
      await navigator.clipboard.write([clipboardItem]);
      return true;
    }

    // Fallback to plain text only
    return copyToClipboard(plain);
  } catch (error) {
    log.error('Failed to copy formatted text:', error);
    return copyToClipboard(plain);
  }
}


import { useState, useCallback, useRef, useEffect } from 'react';

export interface CopyState {
  copied: boolean;
  error: string | null;
}

export function useCopyToClipboard(
  resetDelay: number = 2000
): [CopyState, (text: string) => Promise<void>] {
  const [state, setState] = useState<CopyState>({
    copied: false,
    error: null,
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(
    async (text: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      try {
        const success = await copyToClipboard(text);

        if (success) {
          setState({ copied: true, error: null });

          timeoutRef.current = setTimeout(() => {
            setState({ copied: false, error: null });
            timeoutRef.current = null;
          }, resetDelay);
        } else {
          setState({ copied: false, error: 'Failed to copy' });
        }
      } catch (error) {
        setState({
          copied: false,
          error: error instanceof Error ? error.message : 'Failed to copy',
        });
      }
    },
    [resetDelay]
  );

  return [state, copy];
}


export async function copyEntityJSON(entity: EntityExport): Promise<void> {
  const success = await copyJSONToClipboard(entity);
  if (success) {
    toast.success('Entity copied as JSON');
  }
}

export async function copyEntityFormatted(entity: EntityExport): Promise<void> {
  const plain = `
${entity.name}
${'='.repeat(entity.name.length)}

CR: ${entity.challengeRating || 'N/A'}
HP: ${entity.statBlock?.hp || 'N/A'}
AC: ${entity.statBlock?.armor || 'N/A'}

${entity.description || ''}
  `.trim();

  const success = await copyToClipboard(plain);
  if (success) {
    toast.success('Entity copied');
  } else {
    toast.error('Failed to copy entity');
  }
}

export async function copyAbilityFormatted(ability: AbilityExport): Promise<void> {
  const effectsText = ability.effects
    .map((e: AbilityEffect) => `  - ${e.type}: ${JSON.stringify(e)}`)
    .join('\n');

  const plain = `
${ability.name}
${'='.repeat(ability.name.length)}

Type: ${ability.type}
${ability.castingTime ? `Casting Time: ${ability.castingTime}` : ''}

Effects:
${effectsText}

${ability.description || ''}
  `.trim();

  const success = await copyToClipboard(plain);
  if (success) {
    toast.success('Ability copied');
  } else {
    toast.error('Failed to copy ability');
  }
}

export async function copyStatBlock(statBlock: StatBlock): Promise<void> {
  const plain = `
HP: ${statBlock.hp || 'N/A'}
AC: ${statBlock.armor || 'N/A'}
Speed: ${statBlock.speed || 'N/A'} ft.

STR: ${statBlock.strength || 10}
DEX: ${statBlock.dexterity || 10}
CON: ${statBlock.constitution || 10}
INT: ${statBlock.intelligence || 10}
WIS: ${statBlock.wisdom || 10}
CHA: ${statBlock.charisma || 10}
  `.trim();

  const success = await copyToClipboard(plain);
  if (success) {
    toast.success('Stat block copied');
  } else {
    toast.error('Failed to copy stat block');
  }
}

export async function copyAsMarkdownTable(
  data: Array<Record<string, unknown>>,
  columns: string[]
): Promise<void> {
  if (data.length === 0) {
    toast.warning('No data to copy');
    return;
  }

  const headers = columns.join(' | ');
  const separator = columns.map(() => '---').join(' | ');
  const rows = data
    .map(row => columns.map(col => formatValue(row[col]).replace(/\|/g, "\\|")).join(' | '))
    .join('\n');

  const markdown = `${headers}\n${separator}\n${rows}`;

  const success = await copyToClipboard(markdown);
  if (success) {
    toast.success('Table copied as Markdown');
  } else {
    toast.error('Failed to copy table');
  }
}

export async function copyAsCSV(
  data: Array<Record<string, unknown>>,
  columns: string[]
): Promise<void> {
  if (data.length === 0) {
    toast.warning('No data to copy');
    return;
  }

  const escapeCSV = (value: unknown): string => {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = columns.map(escapeCSV).join(',');
  const rows = data
    .map(row => columns.map(col => escapeCSV(row[col] || '')).join(','))
    .join('\n');

  const csv = `${headers}\n${rows}`;

  const success = await copyToClipboard(csv);
  if (success) {
    toast.success('Data copied as CSV');
  } else {
    toast.error('Failed to copy CSV');
  }
}


export async function parseJSONFromClipboard<T = unknown>(): Promise<T | null> {
  try {
    const text = await readFromClipboard();
    if (!text) return null;

    return JSON.parse(text) as T;
  } catch (error) {
    log.error('Failed to parse JSON from clipboard:', error);
    return null;
  }
}

export async function hasValidJSON(): Promise<boolean> {
  try {
    const data = await parseJSONFromClipboard();
    return data !== null;
  } catch {
    return false;
  }
}
