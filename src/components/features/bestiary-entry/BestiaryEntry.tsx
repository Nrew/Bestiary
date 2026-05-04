import React, { lazy, Suspense, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, FormProvider, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAppStore } from "@/store/appStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { EntryViewer } from "./components/EntryViewer";
import { FormActions } from "./components/FormActions";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntryFormManager } from "@/hooks/useEntryForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { fadeVariants } from "@/lib/animations";
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
import { useToast } from "@/components/ui/toast";

interface BestiaryEntryProps {
  entry: EntryData;
  entryType: ViewContext;
}

const EntityForm = lazy(() => import('./forms/EntityForm').then(module => ({ default: module.EntityForm })));
const ItemForm = lazy(() => import('./forms/ItemForm').then(module => ({ default: module.ItemForm })));
const StatusForm = lazy(() => import('./forms/StatusForm').then(module => ({ default: module.StatusForm })));
const AbilityForm = lazy(() => import('./forms/AbilityForm').then(module => ({ default: module.AbilityForm })));

const FORM_COMPONENTS: Record<ViewContext, React.FC> = {
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

export function getFormSchema<T extends ViewContext>(entryType: T): SchemaMap[T] {
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

const FormSkeleton: React.FC = () => (
  <div className="space-y-6 animate-content-fade-in">
    <div className="space-y-3">
      <Skeleton variant="shimmer" className="h-8 w-1/3" />
      <Skeleton variant="shimmer" className="h-4 w-2/3" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-4 w-20" />
        <Skeleton variant="shimmer" className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-4 w-24" />
        <Skeleton variant="shimmer" className="h-10 w-full" />
      </div>
    </div>

    <div className="space-y-2">
      <Skeleton variant="shimmer" className="h-4 w-28" />
      <Skeleton variant="shimmer" className="h-32 w-full" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Skeleton variant="shimmer" className="h-10 w-full" />
      <Skeleton variant="shimmer" className="h-10 w-full" />
      <Skeleton variant="shimmer" className="h-10 w-full" />
    </div>
  </div>
);

export const BestiaryEntry: React.FC<BestiaryEntryProps> = React.memo(({ entry, entryType }) => {
  const setError = useAppStore((s) => s.setError);
  const clearEditOnSelect = useAppStore((s) => s.clearEditOnSelect);
  const editOnSelect = useAppStore((s) => s.editOnSelect);
  const isDraft = useAppStore((s) => s.draftEntries.has(entry.id));
  const discardDraftEntry = useAppStore((s) => s.discardDraftEntry);
  const toast = useToast();

  const config = getContextConfig(entryType);
  const saveAction = useSaveAction(entryType);
  const FormComponent = FORM_COMPONENTS[entryType];
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(getFormSchema(entryType)) as Resolver<FormData>,
    defaultValues: entry,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
  });

  const { isSubmitting, isDirty } = form.formState;

  const {
    mode,
    animationKey,
    handleModeChange,
    confirmCancelEdit,
    confirmState,
    handleConfirmDialogConfirm,
    handleConfirmDialogCancel,
  } = useEntryFormManager({
    entry,
    form,
    formRef,
    editOnSelect,
    clearEditOnSelect,
  });

  const handleSave = form.handleSubmit(async (data: FormData) => {
    try {
      await saveAction(data);
      handleModeChange("view");
      setError(null);
      toast.success(`${config.label} saved successfully`);
    } catch (error: unknown) {
      const message = `Failed to save ${config.label.toLowerCase()}: ${getErrorMessage(error)}`;
      setError(message);
      toast.error(message);
    }
  });

  return (
    <div className="page-canvas h-full">
      <AnimatePresence>
        {mode === "view" ? (
          <motion.div
            key={`view-${animationKey}`}
            className="h-full"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <EntryViewer
              entry={entry}
              entryType={entryType}
              onEdit={() => handleModeChange("edit")}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`edit-${animationKey}`}
            className="h-full flex flex-col"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <FormProvider {...form}>
              <form
                id={`entry-form-${entry.id}`}
                ref={formRef}
                onSubmit={(event) => {
                  void handleSave(event);
                }}
                className="h-full flex flex-col"
              >
                <ScrollArea className="flex-1">
                  <div className="p-6 md:p-8">
                    <ErrorBoundary level="component">
                      <Suspense fallback={<FormSkeleton />}>
                        <FormComponent />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                </ScrollArea>
              </form>
            </FormProvider>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {mode === "edit" && (
          <FormActions
            formId={`entry-form-${entry.id}`}
            onCancel={() => {
              void (async () => {
                const didCancel = await confirmCancelEdit();
                if (didCancel && isDraft) {
                  discardDraftEntry(entryType, entry.id);
                }
              })();
            }}
            isDirty={isDirty}
            isSubmitting={isSubmitting}
          />
        )}
      </AnimatePresence>
      <ConfirmDialog
        {...confirmState}
        onConfirm={handleConfirmDialogConfirm}
        onCancel={handleConfirmDialogCancel}
      />
    </div>
  );
});

BestiaryEntry.displayName = "BestiaryEntry";
