import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/shared/Icon";
import { cn } from "@/lib/utils";
import type { IconCategory } from "@/lib/dnd/icon-resolver";

interface FormSectionProps {
  title: string;
  iconCategory: IconCategory;
  iconName: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  iconCategory,
  iconName,
  children,
  className,
}) => (
  <Card className={cn("bg-card border-border/50", className)}>
    <CardHeader>
      <CardTitle className="flex items-center gap-3 font-display text-xl">
        <Icon category={iconCategory} name={iconName} size="md" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {children}
    </CardContent>
  </Card>
);
