"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const tabsListVariants = cva(
  "inline-flex items-center justify-center rounded-md p-1 text-muted-foreground",
  {
    variants: {
      variant: {
        default: "bg-muted",
        outline: "border border-border bg-background",
        ghost: "bg-transparent",
        underline: "bg-transparent border-b border-border rounded-none p-0",
      },
      size: { default: "h-10", sm: "h-8", lg: "h-12" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:   "rounded-sm px-3 py-1.5 text-sm ring-offset-background data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
        outline:   "border border-transparent rounded-sm px-3 py-1.5 text-sm data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:shadow-sm",
        ghost:     "rounded-sm px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground data-[state=active]:bg-accent data-[state=active]:text-accent-foreground",
        underline: "rounded-none border-b-2 border-transparent px-4 py-2 text-sm hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none",
      },
      size: { default: "", sm: "text-xs px-2 py-1", lg: "text-base px-4 py-2" },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

const tabsContentVariants = cva(
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default:   "mt-2",
        underline: "mt-4",
        ghost:     "mt-2",
        outline:   "mt-2",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

type TabsVariant = VariantProps<typeof tabsListVariants>["variant"];
type TabsSize = VariantProps<typeof tabsListVariants>["size"];

// Propagates variant/size from <Tabs> to children. Children may also accept
// explicit props on a single instance override the context values.

interface TabsContextValue { variant: TabsVariant; size: TabsSize }

const TabsContext = React.createContext<TabsContextValue>({
  variant: "default",
  size: "default",
});

const useTabsContext = () => React.useContext(TabsContext);


interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  variant?: TabsVariant;
  size?: TabsSize;
  ref?: React.Ref<React.ComponentRef<typeof TabsPrimitive.Root>>;
}

function Tabs({
  variant = "default",
  size = "default",
  children,
  ref,
  ...props
}: TabsProps) {
  return (
    <TabsContext.Provider value={{ variant, size }}>
      <TabsPrimitive.Root ref={ref} {...props}>
        {children}
      </TabsPrimitive.Root>
    </TabsContext.Provider>
  );
}


interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: TabsVariant;
  size?: TabsSize;
  ref?: React.Ref<React.ComponentRef<typeof TabsPrimitive.List>>;
}

function TabsList({ className, variant, size, ref, ...props }: TabsListProps) {
  const ctx = useTabsContext();
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(tabsListVariants({ variant: variant ?? ctx.variant, size: size ?? ctx.size }), className)}
      {...props}
    />
  );
}

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: TabsVariant;
  size?: TabsSize;
  ref?: React.Ref<React.ComponentRef<typeof TabsPrimitive.Trigger>>;
}

function TabsTrigger({ className, variant, size, ref, ...props }: TabsTriggerProps) {
  const ctx = useTabsContext();
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(tabsTriggerVariants({ variant: variant ?? ctx.variant, size: size ?? ctx.size }), className)}
      {...props}
    />
  );
}

interface TabsContentProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  variant?: TabsVariant;
  ref?: React.Ref<React.ComponentRef<typeof TabsPrimitive.Content>>;
}

function TabsContent({ className, variant, ref, ...props }: TabsContentProps) {
  const ctx = useTabsContext();
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(tabsContentVariants({ variant: variant ?? ctx.variant }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
