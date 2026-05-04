import React from "react";
import clsx from "clsx";
import { cn } from "@/lib/utils";

interface DecorativeFlourishProps {
  className?: string;
}

export const DecorativeFlourish: React.FC<DecorativeFlourishProps> = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 240 44" fill="none" aria-hidden="true">
    {/* Left terminal spiral */}
    <path
      d="M8 22 C8 12, 18 7, 26 12 C31 15, 30 21, 25 22 C20 23, 18 19, 21 17"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45"
    />
    {/* Left sweeping arm */}
    <path
      d="M28 22 C 44 10, 62 14, 80 20 C 88 23, 92 24, 100 22"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35"
    />
    {/* Left inner arc accent */}
    <path
      d="M42 22 C 56 16, 70 18, 82 22"
      stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.2"
    />
    {/* Centre diamond */}
    <path
      d="M120 10 L127 22 L120 34 L113 22 Z"
      stroke="currentColor" strokeWidth="1.4" opacity="0.65"
    />
    {/* Centre dot */}
    <circle cx="120" cy="22" r="2.2" fill="currentColor" opacity="0.7" />
    {/* Corner dots on diamond */}
    <circle cx="120" cy="10" r="1.2" fill="currentColor" opacity="0.5" />
    <circle cx="120" cy="34" r="1.2" fill="currentColor" opacity="0.5" />
    {/* Right sweeping arm */}
    <path
      d="M140 22 C 148 20, 152 19, 160 22 C 178 28, 196 26, 212 22"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.35"
    />
    {/* Right inner arc accent */}
    <path
      d="M158 22 C 170 18, 184 20, 198 22"
      stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.2"
    />
    {/* Right terminal spiral */}
    <path
      d="M219 17 C 222 15, 220 21, 215 22 C 210 23, 209 17, 214 14 C 222 9, 232 12, 232 22"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45"
    />
  </svg>
);

interface IlluminatedLetterProps {
  letter: string;
  className?: string;
}

export const IlluminatedLetter: React.FC<IlluminatedLetterProps> = ({ letter, className }) => (
  <div className={clsx("relative inline-block", className)}>
    <div className="absolute inset-0 bg-linear-to-br from-rune/20 via-leather/15 to-rune/20 rounded-lg blur-sm" />
    <div className="relative bg-linear-to-br from-rune/10 to-leather/5 border-2 border-rune/40 rounded-lg p-4 shadow-lg">
      <span className="font-display text-6xl font-bold text-leather relative z-10">{letter}</span>
    </div>
  </div>
);

interface OrnamentalDividerProps {
  className?: string;
  /** "ornamental": star SVG centered on a line (default). "medieval": plain gradient line. */
  variant?: "ornamental" | "medieval";
}

export const OrnamentalDivider: React.FC<OrnamentalDividerProps> = ({
  className,
  variant = "ornamental",
}) => {
  if (variant === "medieval") {
    return (
      <div className={cn("flex items-center justify-center py-3", className)} aria-hidden="true">
        <div className="w-24 h-px bg-linear-to-r from-transparent via-rune to-transparent" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center text-primary", className)} aria-hidden="true">
      <div className="grow h-px bg-primary/30 origin-right" />
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-4 shrink-0"
      >
        <path
          d="M12 4L14.5 9L20 9.5L15.5 13.5L17 19L12 16L7 19L8.5 13.5L4 9.5L9.5 9L12 4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
      </svg>
      <div className="grow h-px bg-primary/30 origin-left" />
    </div>
  );
};
