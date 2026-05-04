import React, { forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT, DURATION, fadeVariants, sidebarPanelVariants } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { SidebarProvider, useSidebarContext } from "./SidebarContext";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { SidebarSearch, type SidebarSearchRef } from "./SidebarSearch";
import { SidebarList } from "./SidebarList";
import { SidebarFooter } from "./SidebarFooter";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { SIDEBAR_CONFIG } from "./constants";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export type { SidebarSearchRef };

const AnimatedSection: React.FC<{
  delay: number;
  className?: string;
  children: React.ReactNode;
}> = ({ delay, className, children }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: DURATION.base, ease: EASE_OUT, delay: delay / 1000 }}
    className={className}
  >
    {children}
  </motion.div>
);

const SidebarContent = forwardRef<SidebarSearchRef>((_, ref) => (
  <>
    <AnimatedSection delay={SIDEBAR_CONFIG.ANIMATION_DELAYS.HEADER}>
      <SidebarHeader />
    </AnimatedSection>
    <AnimatedSection delay={SIDEBAR_CONFIG.ANIMATION_DELAYS.NAV}>
      <SidebarNav />
    </AnimatedSection>
    <AnimatedSection delay={SIDEBAR_CONFIG.ANIMATION_DELAYS.SEARCH}>
      <SidebarSearch ref={ref} />
    </AnimatedSection>
    <AnimatedSection delay={SIDEBAR_CONFIG.ANIMATION_DELAYS.LIST} className="flex-1 overflow-auto">
      <ErrorBoundary level="component">
        <SidebarList />
      </ErrorBoundary>
    </AnimatedSection>
    <AnimatedSection delay={SIDEBAR_CONFIG.ANIMATION_DELAYS.FOOTER}>
      <SidebarFooter />
    </AnimatedSection>
  </>
));

SidebarContent.displayName = "SidebarContent";

const SidebarImpl = forwardRef<SidebarSearchRef>((_, ref) => {
  const { isOpen, onClose } = useSidebarContext();
  const panelRef = React.useRef<HTMLElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const getFocusableElements = () => {
      const panel = panelRef.current;
      if (!panel) return [];
      return Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.hasAttribute("aria-hidden"));
    };

    const focusFirstElement = window.setTimeout(() => {
      getFocusableElements()[0]?.focus();
      if (document.activeElement === document.body) {
        panelRef.current?.focus();
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusFirstElement);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="sidebar-backdrop"
              variants={fadeVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-40 bg-ink/60 backdrop-blur-md"
              onClick={onClose}
              aria-hidden="true"
            />

            <motion.aside
              ref={panelRef}
              key="sidebar-panel"
              variants={sidebarPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={cn(
                "fixed top-0 left-0 bottom-0 w-full max-w-lg h-full z-50",
                "flex flex-col",
                "glass-sidebar shadow-2xl"
              )}
              role="dialog"
              aria-modal="true"
              aria-label="Table of Contents"
              tabIndex={-1}
            >
              <SidebarContent ref={ref} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <DeleteConfirmationDialog />
    </>
  );
});

SidebarImpl.displayName = "SidebarImpl";

export const Sidebar = forwardRef<SidebarSearchRef, SidebarProps>(({ isOpen, onClose }, ref) => (
  <SidebarProvider isOpen={isOpen} onClose={onClose}>
    <SidebarImpl ref={ref} />
  </SidebarProvider>
));

Sidebar.displayName = 'Sidebar';
