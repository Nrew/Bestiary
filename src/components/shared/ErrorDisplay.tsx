import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { useAppStore, useError } from "@/store/appStore";
import { slideDownVariants } from "@/lib/animations";

export const ErrorDisplay: React.FC = () => {
  const error = useError();
  const setError = useAppStore((s) => s.setError);

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          variants={slideDownVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute top-0 left-0 right-0 z-50 p-4"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <Alert
            variant="destructive"
            className="bg-destructive/90 backdrop-blur-sm border-destructive text-destructive-foreground"
          >
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-display">A Scribe's Warning</AlertTitle>
            <AlertDescription className="flex items-center justify-between font-serif">
              <span className="flex-1">{error}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 ml-4 hover:bg-destructive/20"
                onClick={() => setError(null)}
                aria-label="Dismiss Warning"
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
