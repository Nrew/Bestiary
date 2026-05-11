import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        codex:
          "relative border border-border bg-card/90 text-foreground backdrop-blur-sm font-serif tracking-wide rounded-sm shadow-[0_1px_3px_var(--color-ink-10)] transition-all duration-[250ms] ease-medieval contrast-more:border-[3px]",
        "codex-primary":
          "relative border-2 border-leather bg-linear-135 from-leather to-leather/85 text-parchment font-display font-semibold tracking-wider shadow-[0_2px_8px_oklch(18%_0.01_45/0.25),inset_0_1px_0_oklch(94%_0.02_75/0.2)] transition-all duration-[250ms] ease-medieval hover:from-leather-lifted hover:to-leather-lifted/78 contrast-more:border-[3px]",
        medieval:
          "relative border-2 border-leather/60 bg-linear-135 from-rune to-rune/90 text-foreground font-serif font-semibold tracking-wide rounded-sm shadow-[0_2px_4px_var(--color-ink-20),inset_0_1px_0_oklch(94%_0.02_75/0.4)] transition-all duration-300 ease-medieval hover:text-parchment hover:from-leather hover:to-leather/90 motion-safe:hover:-translate-y-0.5 motion-safe:lg:hover:-translate-y-1 motion-safe:lg:hover:scale-105 hover:shadow-[0_4px_12px_var(--color-ink-30),inset_0_1px_0_var(--color-parchment-60)] active:translate-y-0 active:shadow-[0_2px_4px_var(--color-ink-20)] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_2px_var(--color-rune),0_0_0_4px_var(--color-rune-20)] print:bg-gray-200 print:text-black print:border-gray-400 print:shadow-none contrast-more:border-[3px]",
        save:
          "border border-brass bg-wine text-primary-foreground font-serif font-semibold tracking-wide rounded-sm transition-[background-color,border-color,transform] duration-[120ms] ease-[ease] hover:bg-[oklch(36%_0.14_20)] hover:border-[oklch(76%_0.12_70)] active:scale-[0.97] active:bg-[oklch(28%_0.14_20)] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_2px_var(--color-wine),0_0_0_4px_oklch(72%_0.12_70/0.25)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    compoundVariants: [
      { variant: "codex-primary", size: "default", class: "h-auto px-5 py-2.5" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /**
   * When true, shows a spinner, disables the button, sets aria-busy, and
   * applies a wait cursor. Independent of the native `disabled` prop; a
   * disabled button remains disabled regardless of loading state.
   */
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

const LoadingSpinner = () => (
  <svg
    className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  loading = false,
  disabled,
  children,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled || loading;

  // Slot requires exactly one child element, so when `asChild` is true we
  // don't inject a spinner sibling. Consumers using asChild can render their
  // own loading UI; we still forward aria-busy / disabled semantics.
  const content = asChild ? (
    children
  ) : (
    <>
      {loading && <LoadingSpinner />}
      {children}
    </>
  );

  return (
    <Comp
      className={cn(
        buttonVariants({ variant, size }),
        loading && "cursor-wait",
        className
      )}
      ref={ref}
      type={asChild ? undefined : type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
