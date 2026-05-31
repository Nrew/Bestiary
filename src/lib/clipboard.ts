import { getLogger } from '@/lib/logger';

const log = getLogger('clipboard');

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    log.error('Clipboard API unavailable');
    return false;
  } catch (error) {
    log.error('Failed to copy to clipboard:', error);
    return false;
  }
}
