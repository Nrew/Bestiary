import React, { useEffect, useMemo, type JSX } from "react";
import { useAppStore } from "./store/appStore";
import { Layout } from "./components/layout/Layout";
import { BestiaryPage } from "./components/features/bestiary-entry/BestiaryPage";
import { EmptyState } from "./components/layout/EmptyState";
import { NavigationGuardProvider } from "./hooks/useNavigationGuard";

// Stable existence check so Map reference churn doesn't trigger re-renders.
function useSelectionValidation() {
  const selectedId = useAppStore((s) => s.selectedId);
  const setSelectedId = useAppStore((s) => s.setSelectedId);
  const selectedIdExists = useAppStore((s) =>
    s.selectedId ? s.data[s.currentContext].entries.has(s.selectedId) : true
  );

  useEffect(() => {
    if (selectedId && !selectedIdExists) {
      setSelectedId(null);
    }
  }, [selectedId, selectedIdExists, setSelectedId]);
}

const MainContent: React.FC = React.memo(() => {
  const selectedId = useAppStore((s) => s.selectedId);
  const currentContext = useAppStore((s) => s.currentContext);

  useSelectionValidation();

  const content = useMemo(() => {
    if (!selectedId) return <EmptyState />;
    return <BestiaryPage entryId={selectedId} entryType={currentContext} />;
  }, [selectedId, currentContext]);

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
