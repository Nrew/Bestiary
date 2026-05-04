import React from "react";
import { BookOpen } from "lucide-react";
import { IlluminatedLetter, DecorativeFlourish } from "@/components/shared/ornaments";

export const EmptyState: React.FC = () => {
  return (
    <div className="flex h-full flex-1 items-center justify-center p-8">
      <div className="text-center font-serif max-w-4xl flex flex-col items-center gap-8 animate-fade-in">
        <div className="relative w-40 h-40">
          <div className="absolute inset-0 bg-linear-to-br from-rune/20 via-leather/15 to-rune/20 rounded-3xl blur-lg animate-glow"></div>
          <div className="relative w-full h-full glass-panel rounded-3xl flex items-center justify-center shadow-2xl border-4 border-rune/60">
            <BookOpen className="w-16 h-16 text-leather relative z-10 animate-bounce-gentle" />
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-center gap-4">
            <IlluminatedLetter letter="B" />
            <div className="text-left">
              <h2 className="text-5xl font-bold font-display text-leather tracking-wide">
                estiary
              </h2>
              <h3 className="text-2xl font-display text-rune tracking-wider mt-2">
                Expand thy archives.
              </h3>
            </div>
          </div>

          <DecorativeFlourish className="w-64 h-12 text-rune mx-auto" />

          <div className="space-y-4 max-w-2xl">
            <p className="text-xl text-muted-foreground leading-relaxed">
              Hark, learned scholar, and welcome to thy grand compendium. Herein
              lies the secrets of creatures, artifacts, and wisdom unbound.
            </p>
            <p className="text-lg text-muted-foreground/80 italic font-serif">
              Inscribe thy knowledge when thou art ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
