import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  [
    "flex h-10 w-full rounded-md border bg-background px-3 py-2",

    "text-sm placeholder:text-muted-foreground",

    "file:border-0 file:bg-transparent file:text-sm file:font-medium",

    "transition-colors",
    "ring-offset-background",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: "border-input",
        destructive:
          "border-destructive focus-visible:ring-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, type, autoComplete = "off", ...props }, ref) => {
    return (
      <input
        type={type}
        autoComplete={autoComplete}
        className={cn(
          inputVariants({ variant }),
          // Automatically reflect aria-invalid into the visual error state
          // so React Hook Form (or any consumer setting aria-invalid="true")
          // activates the destructive styling without needing an explicit variant.
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };
