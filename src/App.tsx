import React, { useEffect, useMemo, type JSX } from "react";
import { useAppStore } from "./store/appStore";
import { Layout } from "./components/layout/Layout";
import { BestiaryPage } from "./components/features/bestiary-entry/BestiaryPage";
import { EmptyState } from "./components/layout/EmptyState";
import { NavigationGuardProvider } from "./hooks/useNavigationGuard";

function useSelectionValidation() {
  const selectedId = useAppStore((s) => s.selectedId);
  const selectedContext = useAppStore((s) => s.selectedContext);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const selectedIdExists = useAppStore((s) =>
    s.selectedId && s.selectedContext
      ? s.data[s.selectedContext].entries.has(s.selectedId)
      : true
  );

  useEffect(() => {
    if (selectedId && selectedContext && !selectedIdExists) {
      setSelectedId(null);
    }
  }, [selectedId, selectedContext, selectedIdExists, setSelectedId]);
}

const MainContent = React.memo(() => {
  const selectedId = useAppStore((s) => s.selectedId);
  const selectedContext = useAppStore((s) => s.selectedContext);

  useSelectionValidation();

  const content = useMemo(() => {
    if (!selectedId || !selectedContext) return <EmptyState />;
    return <BestiaryPage entryId={selectedId} entryType={selectedContext} />;
  }, [selectedId, selectedContext]);

  return content;
});

MainContent.displayName = "MainContent";

function App(): JSX.Element {
  return (
    <NavigationGuardProvider>
      <Layout>
        <MainContent />
      </Layout>
    </NavigationGuardProvider>
  );
}

export default App;
