import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AbilityText } from "./Abilities";
import type { EntityAbilities } from "@/hooks/useEntityAbilities";

export function LairActionsPanel({ abilities }: { abilities: EntityAbilities }) {
  const { lairActions, loading, error } = abilities;

  if (error) {
    return (
      <Alert variant="destructive" className="stone-plate">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Lair actions could not be loaded: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading && lairActions.length === 0) {
    return (
      <div className="stone-plate space-y-3">
        <Skeleton className="mx-auto h-6 w-40" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (lairActions.length === 0) {
    return null;
  }

  return (
    <div className="stone-plate space-y-4">
      <h3 className="font-display text-lg text-primary text-center">
        Lair Actions
      </h3>
      <div className="space-y-2">
        {lairActions.map((ability) => (
          <AbilityText key={ability.id} ability={ability} />
        ))}
      </div>
    </div>
  );
}
