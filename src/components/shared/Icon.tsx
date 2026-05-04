import React from "react";
import { cn } from "@/lib/utils";
import { iconResolver, type IconCategory } from "@/lib/dnd/icon-resolver";

const ICON_SIZES = {
  xs: "w-3 h-3",
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
  xl: "w-8 h-8",
  "2xl": "w-10 h-10",
  "3xl": "w-12 h-12",
  "4xl": "w-16 h-16",
} as const;

type IconSize = keyof typeof ICON_SIZES;

interface IconProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "name"> {
  category: IconCategory;
  name?: string | null;
  size?: IconSize;
  color?: string;
}

/**
 * Renders an inline SVG icon using CSS mask-image.
 * The icon color is determined by the text color (via bg-current).
 * Pass a color class (e.g., "text-leather") to override the icon color.
 */
export const Icon = React.memo(
  ({ category, name, size = "md", className, color, ...props }: IconProps) => {
    const src = iconResolver.resolve(category, name);

    if (!src || typeof src !== 'string' || src.trim() === '') {
      return (
        <span
          className={cn(
            ICON_SIZES[size],
            "inline-flex items-center justify-center bg-muted/50 rounded border border-border/50 text-muted-foreground text-xs font-mono",
            className
          )}
          title={`Missing icon: ${category}/${name || "default"}`}
          {...props}
        >
          ?
        </span>
      );
    }

    const maskUrl = `url("${src}")`;

    return (
      <span
        className={cn(
          "inline-block",
          ICON_SIZES[size],
          "bg-current",
          color,
          className
        )}
        style={{
          WebkitMaskImage: maskUrl,
          maskImage: maskUrl,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
        role="img"
        aria-label={`${name || category} icon`}
        {...props}
      />
    );
  }
);

Icon.displayName = "Icon";
