import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonBase =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md " +
  "text-sm font-medium transition active:scale-[0.97] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50";

const leatherFilledSurface =
  "relative border-leather bg-linear-135 from-leather to-leather/85 text-parchment " +
  "transition duration-[250ms] ease-medieval " +
  "hover:from-leather-lifted hover:to-leather-lifted/85 " +
  "contrast-more:border-[3px]";

const buttonVariants = cva(buttonBase, {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      outline:
        "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground",
      outlineLeather:
        "border border-leather/30 bg-transparent text-foreground hover:border-leather hover:bg-leather/5",
      outlineWine:
        "border border-border bg-transparent hover:border-wine hover:bg-wine/10",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      ghostLeather: "text-leather hover:bg-leather/10",
      link: "text-primary underline-offset-4 hover:underline",
      codex:
        leatherFilledSurface +
        " border font-display font-medium tracking-wide rounded-sm shadow-button-codex",
      codexPrimary:
        leatherFilledSurface +
        " border-2 font-display font-semibold tracking-wider rounded-md shadow-button-codex-primary",
      medieval:
        "relative border-2 border-leather/60 bg-linear-135 from-rune to-rune/90 text-foreground " +
        "font-serif font-semibold tracking-wide rounded-sm shadow-button-medieval " +
        "transition duration-300 ease-medieval " +
        "hover:text-parchment hover:from-leather hover:to-leather/90 hover:shadow-button-medieval-hover " +
        "motion-safe:hover:-translate-y-0.5 motion-safe:lg:hover:-translate-y-1 motion-safe:lg:hover:scale-105 " +
        "active:translate-y-0 active:shadow-button-medieval " +
        "focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:shadow-button-medieval-focus " +
        "print:bg-secondary print:text-foreground print:border-border print:shadow-none " +
        "contrast-more:border-[3px]",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    },
  },
  compoundVariants: [
    { variant: "codexPrimary", size: "default", class: "px-5 py-2.5" },
  ],
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}

const LoadingSpinner = () => (
  <svg
    className="h-4 w-4 animate-spin motion-reduce:animate-none"
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
        className,
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
