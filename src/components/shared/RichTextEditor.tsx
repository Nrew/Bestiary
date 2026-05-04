import React, { useMemo, useEffect, useRef, useState, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  useAppStore,
  useMemoizedNameLookup,
} from "@/store/appStore";
import type { ViewContext } from "@/types";
import { useWikiLink } from "@/components/shared/wiki-link/WikiLinkProvider";
import {
  WikiLinkExtension,
  WIKI_LINK_LOOKUP_REFRESH,
  type WikiLinkItem,
} from "@/components/shared/wiki-link/WikiLinkExtension";
import { useNavigationGuard } from "@/hooks/useNavigationGuard";
import { cn } from "@/lib/utils";
import { scheduleIdle } from "@/lib/idle";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getLogger } from "@/lib/logger";
import { sanitizeHtml } from "@/lib/sanitize";

export { sanitizeHtml } from "@/lib/sanitize";

const log = getLogger("RichTextEditor");

interface EditorErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/** Isolates TipTap crashes so the rest of the screen keeps working. */
class EditorErrorBoundary extends Component<{ children: ReactNode }, EditorErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error("RichTextEditor error:", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Editor failed to load</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The rich text editor encountered an error. Try refreshing the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  label: string;
}> = ({ onClick, isActive, children, label }) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    className={cn(
      "h-8 w-8 p-0",
      isActive && "is-active bg-muted text-foreground"
    )}
    onClick={onClick}
    aria-label={label}
    aria-pressed={isActive}
    title={label}
  >
    {children}
  </Button>
);

const EditorToolbar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
  // useEditorState subscribes to editor transactions so toolbar stays fresh while the shell keeps `shouldRerenderOnTransaction: false`.
  const editorState = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor?.isActive("bold") ?? false,
      isItalic: ctx.editor?.isActive("italic") ?? false,
      isStrike: ctx.editor?.isActive("strike") ?? false,
      isBulletList: ctx.editor?.isActive("bulletList") ?? false,
      isOrderedList: ctx.editor?.isActive("orderedList") ?? false,
      isBlockquote: ctx.editor?.isActive("blockquote") ?? false,
    }),
  });

  if (!editor || !editorState) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border p-2 bg-card">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editorState.isBold}
        label="Bold"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editorState.isItalic}
        label="Italic"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editorState.isStrike}
        label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="h-6 mx-1" />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editorState.isBulletList}
        label="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editorState.isOrderedList}
        label="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editorState.isBlockquote}
        label="Blockquote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
};

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
  placeholder?: string;
  id?: string;
  ariaDescribedBy?: string;
  ariaLabelledBy?: string;
  ariaInvalid?: boolean;
}

/** TipTap shell: sanitizes HTML in/out, wiki-link autocomplete, guarded navigation while editing. */
const RichTextEditorInner: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  editable = true,
  id,
  ariaDescribedBy,
  ariaLabelledBy,
  ariaInvalid,
}) => {
  const { showTooltip } = useWikiLink();
  const rawNavigate = useAppStore((s) => s.navigateToEntry);
  const { navigateToEntry: guardedNavigate } = useNavigationGuard();
  const toast = useToast();

  const nameLookup = useMemoizedNameLookup();
  const nameVersion = useAppStore((s) => s.nameVersion);
  // Sanitize before TipTap parses so hostile markup never enters the editor document.
  const sanitizedContent = useMemo(() => sanitizeHtml(content), [content]);

  // Navigate ref switches to guarded navigation when editor is editable
  // so wiki-link clicks in edit mode show the unsaved-changes dialog
  const navigateRef = useRef<
    (context: ViewContext, id: string) => Promise<void | boolean>
  >(rawNavigate);
  useEffect(() => {
    navigateRef.current = editable
      ? (context, id) => guardedNavigate(context, id)
      : (context, id) => rawNavigate(context, id);
  }, [editable, guardedNavigate, rawNavigate]);

  const callbacksRef = useRef({ showTooltip, toastError: toast.error });
  useEffect(() => {
    callbacksRef.current = { showTooltip, toastError: toast.error };
  }, [showTooltip, toast.error]);

  const nameLookupRef = useRef(nameLookup);
  useEffect(() => { nameLookupRef.current = nameLookup; }, [nameLookup]);

  const [suggestion, setSuggestion] = useState<{
    query: string;
    coords: { top: number; left: number };
    selectedIdx: number;
  } | null>(null);

  const onSuggestionChangeRef = useRef<
    (q: string | null, c: { top: number; left: number } | null) => void
  >(() => {});

  useEffect(() => {
    onSuggestionChangeRef.current = (query, coords) => {
      if (!editable || query === null) {
        setSuggestion(null);
      } else {
        setSuggestion((prev) => ({
          query,
          coords: coords ?? prev?.coords ?? { top: 0, left: 0 },
          selectedIdx: 0,
        }));
      }
    };
  }, [editable]);

  const suggestionItems = useMemo((): WikiLinkItem[] => {
    if (!suggestion) return [];
    const q = suggestion.query.toLowerCase().trim();
    const all = Array.from(nameLookup.values());
    if (!q) return all.slice(0, 8);
    const startsWith = all.filter((item) => item.name.toLowerCase().startsWith(q));
    const includes = all.filter(
      (item) =>
        !item.name.toLowerCase().startsWith(q) &&
        item.name.toLowerCase().includes(q)
    );
    return [...startsWith, ...includes].slice(0, 8);
  }, [suggestion, nameLookup]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      WikiLinkExtension.configure({
        nameLookup: nameLookupRef,
        onLinkHover: (id, type, element) => callbacksRef.current.showTooltip(id, type, element),
        onLinkClick: (id, type) => { void navigateRef.current(type, id); },
        onBrokenLinkClick: () =>
          callbacksRef.current.toastError("This link's target no longer exists in the bestiary."),
        onSuggestionChange: (query, coords) => onSuggestionChangeRef.current(query, coords),
      }),
    ],
    // Extensions stay stable; refs/refs-like accessors supply fresh lookups and callbacks.
    []
  );

  const editorAttributes = useMemo(() => {
    const attributes: Record<string, string> = {
      role: "textbox",
      "aria-multiline": "true",
      class: cn(
        "prose dark:prose-invert max-w-none focus:outline-none p-4 min-h-[150px] font-serif",
        editable ? "is-editable" : "viewer-prose"
      ),
    };
    if (id) attributes.id = id;
    if (ariaDescribedBy) attributes["aria-describedby"] = ariaDescribedBy;
    if (ariaLabelledBy) attributes["aria-labelledby"] = ariaLabelledBy;
    if (ariaInvalid) attributes["aria-invalid"] = "true";
    return attributes;
  }, [ariaDescribedBy, ariaInvalid, ariaLabelledBy, editable, id]);

  const editor = useEditor({
    extensions,
    content: sanitizedContent,
    editable,
    onUpdate: ({ editor, transaction }) => {
      if (!transaction.docChanged) {
        return;
      }
      const html = editor.getHTML();
      onChange(sanitizeHtml(html));
    },
    // Toolbar reacts via useEditorState; omit full re-renders on selection-only transactions.
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: editorAttributes,
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    return scheduleIdle(() => {
      if (!editor || editor.isDestroyed) return;
      const tr = editor.state.tr
        .setMeta(WIKI_LINK_LOOKUP_REFRESH, true)
        .setMeta("addToHistory", false);
      editor.view.dispatch(tr);
    }, 200);
  }, [nameVersion, editor]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    // Only reset content when the user is NOT actively typing. TipTap's
    // getHTML() can round-trip differently from the input HTML (self-closing
    // tags, attribute order), which would otherwise blow away the user's
    // cursor position on every keystroke as the parent re-sends sanitized
    // content via onChange.
    if (editor.isFocused) return;
    const currentHtml = editor.getHTML();
    if (currentHtml !== sanitizedContent) {
      editor.commands.setContent(sanitizedContent);
    }
  }, [sanitizedContent, editor]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  const selectSuggestion = useCallback(
    (item: WikiLinkItem) => {
      if (!editor) return;
      const queryLen = suggestion?.query.length ?? 0;
      editor
        .chain()
        .focus()
        .command(({ tr, state }) => {
          const { from } = state.selection;
          tr.delete(from - queryLen, from);
          tr.insertText(item.name + "]]");
          return true;
        })
        .run();
      setSuggestion(null);
    },
    [editor, suggestion]
  );

  useEffect(() => {
    if (!suggestion || !editable) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSuggestion((prev) =>
          prev ? { ...prev, selectedIdx: Math.min(prev.selectedIdx + 1, suggestionItems.length - 1) } : null
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSuggestion((prev) =>
          prev ? { ...prev, selectedIdx: Math.max(prev.selectedIdx - 1, 0) } : null
        );
      } else if (e.key === "Enter" && suggestionItems.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const item = suggestionItems[suggestion.selectedIdx] ?? suggestionItems[0];
        if (item) selectSuggestion(item);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSuggestion(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [suggestion, suggestionItems, selectSuggestion, editable]);

  return (
    <div
      className={cn(
        "rounded-md border border-input",
        !editable && "border-none bg-transparent p-0"
      )}
    >
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
      {suggestion && editable && suggestionItems.length > 0 && (
        <div
          className="fixed z-100 bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto min-w-52"
          style={{ top: suggestion.coords.top + 4, left: suggestion.coords.left }}
          role="listbox"
          aria-label="WikiLink suggestions"
        >
          {suggestionItems.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={idx === suggestion.selectedIdx}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                idx === suggestion.selectedIdx
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/60"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(item);
              }}
            >
              <span className="flex-1 font-serif truncate">{item.name}</span>
              <span className="text-xs text-muted-foreground font-display uppercase tracking-wide shrink-0">
                {item.type.slice(0, -1)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * TipTap-backed editor; HTML is sanitized on input/output (see sanitize.ts).
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = (props) => (
  <EditorErrorBoundary>
    <RichTextEditorInner {...props} />
  </EditorErrorBoundary>
);
