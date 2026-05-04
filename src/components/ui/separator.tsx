"use client";
import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const separatorVariants = cva(
  "shrink-0 bg-border",
  {
    variants: {
      orientation: {
        horizontal: "h-px w-full",
        vertical: "h-full w-px",
      },
      variant: {
        default: "bg-border",
        muted: "bg-muted",
        accent: "bg-accent",
        destructive: "bg-destructive/20",
        gradient: "bg-gradient-to-r from-transparent via-border to-transparent",
      },
      size: {
        default: "",
        sm: "data-[orientation=horizontal]:h-[0.5px] data-[orientation=vertical]:w-[0.5px]",
        lg: "data-[orientation=horizontal]:h-0.5 data-[orientation=vertical]:w-0.5",
      },
      spacing: {
        none: "",
        sm: "data-[orientation=horizontal]:my-2 data-[orientation=vertical]:mx-2",
        default: "data-[orientation=horizontal]:my-4 data-[orientation=vertical]:mx-4",
        lg: "data-[orientation=horizontal]:my-6 data-[orientation=vertical]:mx-6",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
      variant: "default",
      size: "default",
      spacing: "none",
    },
  }
);

export interface SeparatorProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>, 'orientation'>,
    VariantProps<typeof separatorVariants> {
  decorative?: boolean;
}

const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  SeparatorProps
>(({
  className,
  orientation = "horizontal",
  variant,
  size,
  spacing,
  decorative = true,
  ...props
}, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation ?? undefined}
    className={cn(
      separatorVariants({ orientation, variant, size, spacing }),
      className
    )}
    {...props}
  />
));

Separator.displayName = SeparatorPrimitive.Root.displayName;

export { Separator, separatorVariants };
