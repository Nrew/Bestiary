import { cva, type VariantProps } from "class-variance-authority";

export const listboxOptionVariants = cva(
  "text-sm transition-colors",
  {
    variants: {
      mode: {
        manual: "cursor-pointer",
        radix: "cursor-default select-none outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
      },
      active: { true: "", false: "" },
      emphasis: { plain: "", accent: "" },
    },
    compoundVariants: [
      { mode: "manual", active: true, className: "bg-accent" },
      { mode: "manual", active: false, className: "hover:bg-accent" },
      { mode: "manual", active: true, emphasis: "accent", className: "text-accent-foreground" },
      { mode: "manual", active: false, emphasis: "accent", className: "hover:text-accent-foreground" },
    ],
    defaultVariants: { mode: "manual", active: false, emphasis: "plain" },
  },
);

export type ListboxOptionVariants = VariantProps<typeof listboxOptionVariants>;
