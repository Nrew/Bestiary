import React, {
  lazy,
  Suspense,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/store/appStore";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { EntryViewer } from "./components/EntryViewer";
import { FormActions } from "./components/FormActions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBestiaryEntrySession } from "@/hooks/useBestiaryEntrySession";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  abilitySchema,
  entitySchema,
  itemSchema,
  statusSchema,
  type BestiaryEntry as EntryData,
  type ViewContext,
  type Entity,
  type Item,
  type Status,
  type Ability,
} from "@/types";
import { getContextConfig } from "@/lib/context-config";
import { getErrorMessage } from "@/lib/errors";
import { normalizeEntityCombatBonuses } from "@/lib/dnd";
import { useToast } from "@/components/ui/toast";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

interface BestiaryEntryProps {
  entry: EntryData;
  entryType: ViewContext;
}

const EntityForm = lazy(() => import('./forms/EntityForm').then(module => ({ default: module.EntityForm })));
const ItemForm = lazy(() => import('./forms/ItemForm').then(module => ({ default: module.ItemForm })));
const StatusForm = lazy(() => import('./forms/StatusForm').then(module => ({ default: module.StatusForm })));
const AbilityForm = lazy(() => import('./forms/AbilityForm').then(module => ({ default: module.AbilityForm })));

const FORM_COMPONENTS: Record<ViewContext, React.ComponentType> = {
  entities: EntityForm,
  items: ItemForm,
  statuses: StatusForm,
  abilities: AbilityForm,
};

const SCHEMA_MAP = {
  entities: entitySchema,
  items: itemSchema,
  statuses: statusSchema,
  abilities: abilitySchema,
} as const;

type SchemaMap = typeof SCHEMA_MAP;

function FormSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8" aria-busy="true" aria-label="Loading form">
      <Skeleton variant="shimmer" className="h-9 w-48" />
      <Skeleton variant="shimmer" className="h-10 w-full max-w-md" />
      <SkeletonText variant="shimmer" lines={3} lastLineWidth="70%" />
      <Skeleton variant="shimmer" className="h-40 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton variant="shimmer" className="h-10" />
        <Skeleton variant="shimmer" className="h-10" />
      </div>
    </div>
  );
}

function getFormSchema<T extends ViewContext>(entryType: T): SchemaMap[T] {
  return SCHEMA_MAP[entryType];
}

function useSaveAction(entryType: ViewContext) {
  const saveEntry = useAppStore((s) => s.saveEntry);
  return useCallback(
    (data: EntryData) => saveEntry(entryType, data),
    [entryType, saveEntry]
  );
}

type FormData = Entity | Item | Status | Ability;

export const BestiaryEntry = React.memo(({ entry, entryType }: BestiaryEntryProps) => {
  const setError = useAppStore((s) => s.setError);
  const clearEditOnSelect = useAppStore((s) => s.clearEditOnSelect);
  const editOnSelect = useAppStore((s) => s.editOnSelect);
  const discardDraftEntry = useAppStore((s) => s.discardDraftEntry);
  const toast = useToast();

  const config = getContextConfig(entryType);
  const saveAction = useSaveAction(entryType);
  const FormComponent = FORM_COMPONENTS[entryType];
  const formRef = useRef<HTMLFormElement>(null);

  const resolver = useMemo(
    () => zodResolver(getFormSchema(entryType)) as Resolver<FormData>,
    [entryType],
  );

  const form = useForm<FormData>({
    resolver,
    defaultValues: entry,
    // `onBlur` for both keeps Zod off the keystroke path. With `reValidateMode:
    // 'onChange'` a single submit attempt re-runs the entire entitySchema
    // (~45 nodes incl. nested statBlock + damageResistances) on every keypress,
    // which is the dev-mode "form feels laggy" amplifier.
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const session = useBestiaryEntrySession({
    baseline: entry,
    form,
    formRef,
    editOnSelect,
    clearEditOnSelect,
  });

  const {
    baseline,
    mode,
    openEdit,
    enterView,
    confirmDiscardEdit,
    finalizeDiscard,
    confirmState,
    handleConfirmDialogConfirm,
    handleConfirmDialogCancel,
  } = session;

  const isDraft = useAppStore((s) => s.draftEntries.has(baseline.id));

  // Edit-mode focus is handled by `autoFocus` on the first form input. Leaving
  // edit lets the browser fall back to <body>, which keeps tab order working
  // and avoids racing the closing-confirm-dialog's `aria-hidden` on root.

  const handleSave = form.handleSubmit(async (data: FormData) => {
    try {
      const normalizedData =
        entryType === "entities"
          ? normalizeEntityCombatBonuses(data as Entity)
          : data;
      await saveAction(normalizedData);
      // Yield off the IPC `message` tick so the save response handler stays
      // short; mode change + error clear commit on the next frame.
      requestAnimationFrame(() => {
        enterView();
        setError(null);
      });
    } catch (error: unknown) {
      const message = `Failed to save ${config.label.toLowerCase()}: ${getErrorMessage(error)}`;
      setError(message);
      toast.error(message);
    }
  });

  const onCancelEdit = useCallback(() => {
    confirmDiscardEdit()
      .then((discarded) => {
        if (discarded && isDraft) {
          discardDraftEntry(entryType, baseline.id);
        }
      })
      .catch((err: unknown) => setError(getErrorMessage(err)));
  }, [confirmDiscardEdit, isDraft, discardDraftEntry, entryType, baseline.id, setError]);

  return (
    <div className="page-canvas relative h-full min-h-0 min-w-0">
      <div
        className={cn(
          "h-full min-h-0 min-w-0",
          // Removed from flow during edit so its tall content doesn't drive
          // a second outer scrollbar alongside the form pane.
          mode === "edit" && "hidden",
        )}
        inert={mode === "edit" ? true : undefined}
      >
        <EntryViewer entry={baseline} entryType={entryType} onEdit={openEdit} />
      </div>
      <AnimatePresence onExitComplete={finalizeDiscard}>
        {mode === "edit" && (
          <EditPane
            form={form}
            formRef={formRef}
            baselineId={baseline.id}
            FormComponent={FormComponent}
            onSubmit={(e) => { void handleSave(e); }}
          />
        )}
      </AnimatePresence>
      {mode === "edit" && (
        <FormActions
          control={form.control}
          formId={`entry-form-${baseline.id}`}
          onCancel={onCancelEdit}
        />
      )}
      <ConfirmDialog
        {...confirmState}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={handleConfirmDialogCancel}
      />
    </div>
  );
});

BestiaryEntry.displayName = "BestiaryEntry";

interface EditPaneProps {
  form: ReturnType<typeof useForm<FormData>>;
  formRef: React.RefObject<HTMLFormElement | null>;
  baselineId: string;
  FormComponent: React.ComponentType;
  onSubmit: (event: React.BaseSyntheticEvent) => void;
}

// Staged mount: the wrapper animates in with just the skeleton; the form chunk
// + its sections (useFieldArray, useWatch, RHF wiring) mount on the deferred
// commit React schedules at transition priority. That keeps the click handler
// short, the entry animation jank-free, and lets React interleave the heavy
// FormComponent render with any incoming urgent updates (input, hover, etc.).
function EditPane({
  form,
  formRef,
  baselineId,
  FormComponent,
  onSubmit,
}: EditPaneProps) {
  const ready = useDeferredValue(true, false);

  return (
    <motion.div
      key="edit-pane"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative z-10 flex h-full min-h-0 min-w-0 flex-col bg-background"
    >
      <FormProvider {...form}>
        <form
          id={`entry-form-${baselineId}`}
          ref={formRef}
          onSubmit={onSubmit}
          className="flex h-full min-h-0 flex-col"
        >
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-6 md:p-8">
              <ErrorBoundary level="component">
                {ready ? (
                  <Suspense fallback={<FormSkeleton />}>
                    <FormComponent />
                  </Suspense>
                ) : (
                  <FormSkeleton />
                )}
              </ErrorBoundary>
            </div>
          </ScrollArea>
        </form>
      </FormProvider>
    </motion.div>
  );
}
