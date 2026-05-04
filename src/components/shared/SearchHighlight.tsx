import React from 'react';
import { highlightMatches, findMatchIndices, type HighlightPart } from '@/lib/search';
import { cn } from '@/lib/utils';

interface SearchHighlightProps {
  /** Text to display with highlights */
  text: string;
  /** Search query to highlight (optional if indices provided) */
  query?: string;
  /** Pre-computed match indices [start, end][] (optional, computed from query if not provided) */
  indices?: [number, number][];
  /** Additional classes for the container */
  className?: string;
  /** Classes for highlighted text */
  highlightClassName?: string;
}

/**
 * Component that highlights search matches within text
 *
 * @example
 * <SearchHighlight
 *   text="Ancient Red Dragon"
 *   query="dragon"
 *   highlightClassName="bg-rune/30 text-leather font-semibold"
 * />
 */
export const SearchHighlight = React.memo<SearchHighlightProps>(({
  text,
  query,
  indices: providedIndices,
  className,
  highlightClassName = 'bg-rune/30 text-leather font-semibold rounded-sm px-0.5',
}) => {
  // Use provided indices or compute from query
  const indices = providedIndices ?? (query?.trim() ? findMatchIndices(text, query) : []);

  // If no highlights, just return the text
  if (indices.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const parts = highlightMatches(text, indices);

  return (
    <span className={className}>
      {parts.map((part, index) => (
        part.highlight ? (
          <mark
            key={index}
            className={cn('bg-transparent', highlightClassName)}
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      ))}
    </span>
  );
});

SearchHighlight.displayName = 'SearchHighlight';

export function useSearchHighlight(text: string, query: string): HighlightPart[] {
  return React.useMemo(() => {
    if (!query?.trim()) {
      return [{ text, highlight: false }];
    }
    const indices = findMatchIndices(text, query);
    return highlightMatches(text, indices);
  }, [text, query]);
}
