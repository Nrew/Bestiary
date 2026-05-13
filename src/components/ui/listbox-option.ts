import { cva, type VariantProps } from "class-variance-authority";

/**
 * Shared semantic for option items in custom listboxes (combobox suggestions,
 * entry pickers). Captures only the active-vs-hover highlight; each call site
 * supplies its own layout (width, padding, typography, rounding).
 */
export const listboxOptionVariants = cva(
  "cursor-pointer text-sm transition-colors",
  {
    variants: {
      active: {
        true: "bg-accent",
        false: "hover:bg-accent",
      },
      emphasis: {
        plain: "",
        accent: "",
      },
    },
    compoundVariants: [
      { emphasis: "accent", active: false, className: "hover:text-accent-foreground" },
      { emphasis: "accent", active: true, className: "text-accent-foreground" },
    ],
    defaultVariants: { active: false, emphasis: "plain" },
  },
);

export type ListboxOptionVariants = VariantProps<typeof listboxOptionVariants>;
