export interface HighlightPart {
  text: string;
  highlight: boolean;
}

export function findMatchIndices(text: string, query: string): [number, number][] {
  const indices: [number, number][] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  let startIndex = 0;
  let index = lowerText.indexOf(lowerQuery, startIndex);

  while (index !== -1) {
    indices.push([index, index + query.length]);
    startIndex = index + 1;
    index = lowerText.indexOf(lowerQuery, startIndex);
  }

  return indices;
}

export function highlightMatches(text: string, indices: [number, number][]): HighlightPart[] {
  if (!indices.length) {
    return [{ text, highlight: false }];
  }

  const parts: HighlightPart[] = [];
  let lastIndex = 0;

  const mergedIndices = mergeOverlappingIndices(indices);

  for (const [start, end] of mergedIndices) {
    if (start > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, start),
        highlight: false,
      });
    }

    parts.push({
      text: text.substring(start, end),
      highlight: true,
    });

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      highlight: false,
    });
  }

  return parts;
}

function mergeOverlappingIndices(indices: [number, number][]): [number, number][] {
  if (!indices.length) return [];

  const sorted = [...indices].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current[0] <= last[1]) {
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
}
