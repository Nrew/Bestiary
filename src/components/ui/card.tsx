import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-border shadow-md",
        ghost: "border-transparent shadow-none",
        destructive: "border-wine/20 bg-wine/5",
        success: "border-jade/20 bg-jade/5",
      },
      size: {
        default: "",
        sm: "text-sm",
        lg: "text-base",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const cardHeaderVariants = cva("flex flex-col space-y-1.5", {
  variants: { size: { default: "p-6", sm: "p-4", lg: "p-8" } },
  defaultVariants: { size: "default" },
});

const cardContentVariants = cva("", {
  variants: { size: { default: "p-6 pt-0", sm: "p-4 pt-0", lg: "p-8 pt-0" } },
  defaultVariants: { size: "default" },
});

const cardFooterVariants = cva("flex items-center", {
  variants: { size: { default: "p-6 pt-0", sm: "p-4 pt-0", lg: "p-8 pt-0" } },
  defaultVariants: { size: "default" },
});

const cardTitleVariants = cva("font-semibold leading-none tracking-tight", {
  variants: { size: { default: "text-2xl", sm: "text-lg", lg: "text-3xl" } },
  defaultVariants: { size: "default" },
});

const cardDescriptionVariants = cva("text-muted-foreground", {
  variants: { size: { default: "text-sm", sm: "text-xs", lg: "text-base" } },
  defaultVariants: { size: "default" },
});

// Context propagates size/variant from <Card> to children so consumers don't
// need to repeat them on every child. Children may also accept explicit props
// to override the context value for a single instance.

type CardSize = VariantProps<typeof cardVariants>["size"];
type CardVariant = VariantProps<typeof cardVariants>["variant"];

interface CardContextValue { size: CardSize; variant: CardVariant }

const CardContext = React.createContext<CardContextValue>({
  size: "default",
  variant: "default",
});

const useCardContext = () => React.useContext(CardContext);


export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <CardContext.Provider value={{ size, variant }}>
      <div ref={ref} className={cn(cardVariants({ variant, size, className }))} {...props} />
    </CardContext.Provider>
  )
);
Card.displayName = "Card";

// Each accepts an optional explicit `size` that overrides the context value,
// so a child can be rendered with a different size when needed.

interface CardChildProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: CardSize;
}

const CardHeader = React.forwardRef<HTMLDivElement, CardChildProps>(
  ({ className, size, ...props }, ref) => {
    const ctx = useCardContext();
    return (
      <div ref={ref} className={cn(cardHeaderVariants({ size: size ?? ctx.size }), className)} {...props} />
    );
  }
);
CardHeader.displayName = "CardHeader";

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: CardSize;
}

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, size, ...props }, ref) => {
    const ctx = useCardContext();
    return (
      <h3 ref={ref} className={cn(cardTitleVariants({ size: size ?? ctx.size }), className)} {...props} />
    );
  }
);
CardTitle.displayName = "CardTitle";

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: CardSize;
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, size, ...props }, ref) => {
    const ctx = useCardContext();
    return (
      <p ref={ref} className={cn(cardDescriptionVariants({ size: size ?? ctx.size }), className)} {...props} />
    );
  }
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, CardChildProps>(
  ({ className, size, ...props }, ref) => {
    const ctx = useCardContext();
    return (
      <div ref={ref} className={cn(cardContentVariants({ size: size ?? ctx.size }), className)} {...props} />
    );
  }
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, CardChildProps>(
  ({ className, size, ...props }, ref) => {
    const ctx = useCardContext();
    return (
      <div ref={ref} className={cn(cardFooterVariants({ size: size ?? ctx.size }), className)} {...props} />
    );
  }
);
CardFooter.displayName = "CardFooter";

export {
  Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent,
  cardVariants, cardHeaderVariants, cardContentVariants,
  cardFooterVariants, cardTitleVariants, cardDescriptionVariants,
};
