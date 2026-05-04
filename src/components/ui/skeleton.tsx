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
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_1.5s_ease-in-out_infinite] " +
        "before:bg-gradient-to-r before:from-transparent before:via-muted/50 before:to-transparent",
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
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, rounded, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(skeletonVariants({ variant, rounded, className }))}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

const SkeletonText = React.forwardRef<
  HTMLDivElement,
  SkeletonProps & { lines?: number; lastLineWidth?: string }
>(
  ({ lines = 3, lastLineWidth = "60%", className, ...props }, ref) => (
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
  )
);
SkeletonText.displayName = "SkeletonText";

export { Skeleton, SkeletonText, skeletonVariants };