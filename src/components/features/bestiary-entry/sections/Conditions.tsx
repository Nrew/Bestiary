import React, { useMemo } from "react";
import { useStatusesMap } from "@/store/appStore";
import { ViewSection } from "../components/ViewSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/shared/Icon";
import { COMPONENT_STYLES } from "@/lib/theme";
import { isEntity, isStatus } from "@/lib/type-guards";
import type { Entity, Status } from "@/types";
import { IconCategory, isIconCategory } from "@/lib/dnd/icon-resolver";

const FALLBACK_STATUS_ICON: [IconCategory, string] = ["status", "charmed"];

function parseIconRef(icon: string | null | undefined): [IconCategory, string] {
  const [category, name] = icon?.split("/") ?? [];
  if (isIconCategory(category) && name) return [category, name];
  return FALLBACK_STATUS_ICON;
}

const StatusCard: React.FC<{ status: Status }> = ({ status }) => {
  const [category, name] = parseIconRef(status.icon);

  const { cardStyle, iconStyle } = useMemo(() => {
    if (!status.color) {
      return { cardStyle: undefined, iconStyle: undefined };
    }
    return {
      cardStyle: {
        borderColor: status.color,
        borderLeftWidth: '4px',
      },
      iconStyle: { color: status.color },
    };
  }, [status.color]);

  return (
    <Card className={COMPONENT_STYLES.stoneCard} style={cardStyle}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-display">
          <span style={iconStyle}>
            <Icon category={category} name={name} size="sm" />
          </span>
          {status.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="font-serif">
        <p className="text-sm text-muted-foreground mb-2">{status.summary}</p>
      </CardContent>
    </Card>
  );
};

const MissingStatusCard: React.FC<{ id: string }> = ({ id }) => (
  <Card className={COMPONENT_STYLES.stoneCard}>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg font-display">
        <Icon category="status" name="charmed" size="sm" />
        Missing condition
      </CardTitle>
    </CardHeader>
    <CardContent className="font-serif">
      <p className="text-sm text-muted-foreground">
        This entry references a condition that is not currently available: {id}
      </p>
    </CardContent>
  </Card>
);

export const ConditionsSection: React.FC<{ data: Entity | Status }> = ({
  data,
}) => {
  const statuses = useStatusesMap();

  const statusList = React.useMemo((): Array<Status | { missingId: string }> => {
    if (isEntity(data)) {
      return data.statusIds
        .map((id: string) => {
          const entry = statuses.get(id);
          const status = isStatus(entry) ? entry : undefined;
          return status ?? { missingId: id };
        });
    }
    return isStatus(data) ? [data] : [];
  }, [data, statuses]);

  if (statusList.length === 0) return null;

  return (
    <ViewSection title="Conditions" iconCategory="status" iconName="charmed">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statusList.map((status) => (
          "missingId" in status
            ? <MissingStatusCard key={status.missingId} id={status.missingId} />
            : <StatusCard key={status.id} status={status} />
        ))}
      </div>
    </ViewSection>
  );
};
