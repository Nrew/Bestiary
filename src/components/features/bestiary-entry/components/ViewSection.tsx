import React from "react";
import { Icon } from "@/components/shared/Icon";
import { cn } from "@/lib/utils";
import type { IconCategory } from "@/lib/dnd/icon-resolver";
import { OrnamentalDivider } from "@/components/shared/ornaments";

interface ViewSectionProps {
  title: string;
  iconCategory: IconCategory;
  iconName: string;
  children: React.ReactNode;
  className?: string;
}

export const ViewSection: React.FC<ViewSectionProps> = ({
  title,
  iconCategory,
  iconName,
  children,
  className,
}) => (
  <section className={cn("space-y-4", className)}>
    <header className="flex flex-col items-center text-center">
      <Icon
        category={iconCategory}
        name={iconName}
        size="xl"
        className="text-primary/70 mb-2 opacity-50"
      />
      <h2 className="font-display text-3xl text-primary">{title}</h2>
      <OrnamentalDivider className="mt-1" />
    </header>
    <div>{children}</div>
  </section>
);
