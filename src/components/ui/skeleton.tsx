import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const skeletonVariants = cva("bg-muted", {
  variants: {
    variant: {
      // Pulse animation lives on the default variant only so it doesn't
      // fight the shimmer pseudo-element animation when `variant="shimmer"`.
      default: "animate-pulse bg-muted",
      shimmer:
        "relative overflow-hidden bg-muted " +
        "before:absolute before:inset-0 before:animate-skeleton " +
        "before:bg-linear-to-r before:from-transparent before:via-muted/50 before:to-transparent",
    },
    rounded: {
      none: "rounded-none",
      sm: "rounded-sm",
      default: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full",
    },
  },
  defaultVariants: {
    variant: "default",
    rounded: "default",
  },
});

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {
  ref?: React.Ref<HTMLDivElement>;
}

function Skeleton({
  className,
  variant,
  rounded,
  ref,
  ...props
}: SkeletonProps) {
  return (
    <div
      ref={ref}
      className={cn(skeletonVariants({ variant, rounded, className }))}
      {...props}
    />
  );
}

function SkeletonText({
  lines = 3,
  lastLineWidth = "60%",
  className,
  ref,
  ...props
}: SkeletonProps & { lines?: number; lastLineWidth?: string }) {
  return (
    <div ref={ref} className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-4 w-full"
          style={index === lines - 1 ? { width: lastLineWidth } : undefined}
          {...props}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonText };
