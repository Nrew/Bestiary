"use client";
import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const checkboxVariants = cva(
  "peer shrink-0 rounded-sm border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  {
    variants: {
      variant: {
        default: "border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground",
        destructive: "border-destructive data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground data-[state=indeterminate]:bg-destructive data-[state=indeterminate]:text-destructive-foreground",
        outline: "border-border data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:border-primary data-[state=indeterminate]:bg-background data-[state=indeterminate]:text-foreground data-[state=indeterminate]:border-primary",
        ghost: "border-transparent hover:border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary/10 data-[state=indeterminate]:text-primary",
      },
      size: {
        default: "h-4 w-4",
        sm: "h-3 w-3",
        lg: "h-5 w-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const checkboxIndicatorVariants = cva(
  "flex items-center justify-center text-current",
  {
    variants: {
      size: {
        default: "[&>svg]:h-3 [&>svg]:w-3",
        sm: "[&>svg]:h-2.5 [&>svg]:w-2.5",
        lg: "[&>svg]:h-4 [&>svg]:w-4",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export interface CheckboxProps
  extends React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  indeterminate?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  indeterminateIcon?: React.ComponentType<{ className?: string }>;
}

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({
  className,
  variant,
  size,
  indeterminate,
  icon: Icon = Check,
  indeterminateIcon: IndeterminateIcon = Minus,
  ...props
}, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(checkboxVariants({ variant, size }), className)}
    {...props}
    checked={indeterminate ? "indeterminate" : props.checked}
  >
    <CheckboxPrimitive.Indicator
      className={cn(checkboxIndicatorVariants({ size }))}
    >
      {indeterminate ? <IndeterminateIcon /> : <Icon />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export {
  Checkbox,
  checkboxVariants,
  checkboxIndicatorVariants,
};
