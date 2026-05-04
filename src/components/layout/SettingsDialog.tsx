import React, { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Settings, Download, Trash2, Upload, X } from "lucide-react";
import { exportDatabase, cleanupOrphanedImages, importDatabase, clearAllCaches } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAppStore } from "@/store/appStore";
import { staggerContainerVariants, contentVariants, fadeVariants } from "@/lib/animations";
import type { ImportResult } from "@/types";

export const SettingsDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [cleanupStatus, setCleanupStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [cleanupCount, setCleanupCount] = useState<number | null>(null);
  const [exportDisplayPath, setExportDisplayPath] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setError = useAppStore((s) => s.setError);

  const handleExport = async () => {
    setExportStatus("loading");
    try {
      const result = await exportDatabase();
      setExportDisplayPath(result.displayPath);
      setExportStatus("done");
    } catch (error) {
      setError(`Export failed. ${getErrorMessage(error)}`);
      setExportStatus("error");
    }
  };

  const handleCleanup = async () => {
    setCleanupStatus("loading");
    try {
      const count = await cleanupOrphanedImages();
      setCleanupCount(count);
      setCleanupStatus("done");
    } catch (error) {
      setError(`Cleanup failed. ${getErrorMessage(error)}`);
      setCleanupStatus("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setImportStatus("idle");
    setImportResult(null);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImportStatus("loading");
    try {
      const jsonStr = await importFile.text();
      const result = await importDatabase(jsonStr);
      setImportResult(result);
      setImportStatus("done");
      clearAllCaches();
    } catch (error) {
      setError(`Import failed. ${getErrorMessage(error)}`);
      setImportStatus("error");
    }
  };

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setExportStatus("idle");
      setCleanupStatus("idle");
      setCleanupCount(null);
      setExportDisplayPath(null);
      setImportFile(null);
      setImportStatus("idle");
      setImportResult(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Settings" title="Settings" className="text-leather hover:text-leather hover:bg-leather/10">
          <Settings className="w-5 h-5" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[85vh] overflow-y-auto glass-panel p-6 rounded-xl shadow-2xl animate-slide-up focus:outline-none motion-reduce:animate-none">
          <Dialog.Title className="sr-only">Bestiary Settings</Dialog.Title>
          <Dialog.Description className="sr-only">
            Manage data backup, image cleanup, and import/restore settings for your bestiary.
          </Dialog.Description>
          <div className="flex items-center justify-between mb-6">
            <span className="font-display text-2xl text-foreground" aria-hidden="true">Bestiary Settings</span>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close settings"><X className="w-4 h-4" /></Button>
            </Dialog.Close>
          </div>

          <motion.div className="space-y-4" variants={staggerContainerVariants} initial="hidden" animate="visible">
            <motion.div variants={contentVariants} className="rounded-lg border border-leather/20 p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Export Database</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Save a full backup of your bestiary to a file on disk.
                </p>
              </div>
              <AnimatePresence>
                {exportStatus === "done" && exportDisplayPath && (
                  <motion.div variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                    <p className="text-xs text-jade font-mono break-all bg-jade/10 rounded px-2 py-1">
                      Saved to: {exportDisplayPath}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                onClick={() => {
                  void handleExport();
                }}
                loading={exportStatus === "loading"}
                variant="outline"
                className="gap-2 border-leather/30 hover:border-leather"
              >
                {exportStatus !== "loading" && <Download className="w-4 h-4" />}
                {exportStatus === "loading" ? "Exporting…" : exportStatus === "done" ? "Export Again" : "Export Bestiary"}
              </Button>
            </motion.div>

            <motion.div variants={contentVariants} className="rounded-lg border border-leather/20 p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Clean Up Orphaned Images</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Remove image files no longer referenced by any entry.
                </p>
              </div>
              <AnimatePresence>
                {cleanupStatus === "done" && (
                  <motion.div variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                    <p className="text-xs text-jade bg-jade/10 rounded px-2 py-1">
                      {cleanupCount === 0
                        ? "No orphaned images found."
                        : `Removed ${cleanupCount} orphaned image${cleanupCount === 1 ? "" : "s"}.`}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                onClick={() => {
                  void handleCleanup();
                }}
                loading={cleanupStatus === "loading"}
                variant="outline"
                className="gap-2 border-leather/30 hover:border-leather"
              >
                {cleanupStatus !== "loading" && <Trash2 className="w-4 h-4" />}
                {cleanupStatus === "loading" ? "Cleaning…" : "Clean Up Images"}
              </Button>
            </motion.div>

            <motion.div variants={contentVariants} className="rounded-lg border border-leather/20 p-4 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Import Backup</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Restore entries from a previously exported bestiary file. Existing entries with the same ID are updated.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importStatus === "loading"}
                  variant="outline"
                  className="gap-2 border-leather/30 hover:border-leather"
                >
                  <Upload className="w-4 h-4" />
                  Choose File…
                </Button>
                {importFile && (
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-50" title={importFile.name}>
                    {importFile.name}
                  </span>
                )}
              </div>
              <AnimatePresence>
                {importStatus === "done" && importResult && (
                  <motion.div variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
                    <div className="space-y-1">
                      <p className="text-xs text-jade bg-jade/10 rounded px-2 py-1">
                        Imported: {importResult.entitiesImported} entities, {importResult.itemsImported} items,{" "}
                        {importResult.statusesImported} statuses, {importResult.abilitiesImported} abilities.
                      </p>
                      {importResult.errors.length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-amber-500 px-2 py-1">
                            {importResult.errors.length} error{importResult.errors.length === 1 ? "" : "s"} during import
                          </summary>
                          <ul className="mt-1 max-h-32 overflow-y-auto bg-muted/50 rounded px-2 py-1 space-y-0.5">
                            {importResult.errors.map((err, i) => (
                              <li key={i} className="text-muted-foreground font-mono">{err}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <Button
                        type="button"
                        onClick={() => window.location.reload()}
                        variant="outline"
                        className="mt-2 gap-2 border-leather/30 hover:border-leather"
                      >
                        Reload to Apply Import
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Button
                onClick={() => {
                  void handleImport();
                }}
                disabled={!importFile}
                loading={importStatus === "loading"}
                variant="outline"
                className="gap-2 border-leather/30 hover:border-leather"
              >
                {importStatus !== "loading" && <Upload className="w-4 h-4" />}
                {importStatus === "loading" ? "Importing…" : "Import"}
              </Button>
            </motion.div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
