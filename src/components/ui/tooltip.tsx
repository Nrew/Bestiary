"use client";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tooltipContentVariants = cva(
  "z-50 overflow-hidden border shadow-md radix-popover-anim",
  {
    variants: {
      variant: {
        default: "bg-popover text-popover-foreground border-border",
        destructive: "bg-wine text-primary-foreground border-wine/80",
        success: "bg-jade text-primary-foreground border-jade/80",
        warning: "bg-rune text-ink border-rune/80",
        info: "bg-sapphire text-primary-foreground border-sapphire/80",
        dark: "bg-ink text-primary-foreground border-ink/80",
      },
      size: {
        default: "text-sm px-3 py-1.5",
        sm: "text-xs px-2 py-1",
        lg: "text-base px-4 py-2",
      },
      rounded: {
        default: "rounded-md",
        sm: "rounded-sm",
        lg: "rounded-lg",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      rounded: "default",
    },
  }
);

export interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipContentVariants> {
  ref?: React.Ref<React.ComponentRef<typeof TooltipPrimitive.Content>>;
}

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  variant,
  size,
  rounded,
  sideOffset = 4,
  ref,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          tooltipContentVariants({ variant, size, rounded }),
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

// Root `TooltipProvider` lives in `main.tsx`; `delayDuration` is forwarded per-tooltip.
interface SimpleTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  variant?: TooltipContentProps['variant'];
  size?: TooltipContentProps['size'];
  side?: TooltipContentProps['side'];
  delayDuration?: number;
  className?: string;
}

function SimpleTooltip({
  content,
  children,
  variant,
  size,
  side,
  delayDuration,
  className,
}: SimpleTooltipProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent
        variant={variant}
        size={size}
        side={side}
        className={className}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  SimpleTooltip,
  tooltipContentVariants,
};
