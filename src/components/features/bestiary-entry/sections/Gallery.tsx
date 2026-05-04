import React from "react";
import { ViewSection } from "../components/ViewSection";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { ManagedImage } from "@/components/shared/ManagedImage";
import { imageRefKey } from "@/lib/images";
import type { Entity, Item } from "@/types";

export const PortraitSection: React.FC<{ data: Entity | Item }> = ({ data }) => {
  const images = "images" in data ? data.images || [] : [];
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  if (images.length === 0) return null;

  const primaryImage = images[0];

  return (
    <>
      {/*
        CONVENTION: The first entry in `images` is treated as the portrait.
        Reordering in the editor (GallerySection) changes which image appears here.
      */}
      <button
        type="button"
        className="relative block w-full rounded-lg overflow-hidden border border-border/30 shadow-md bg-muted cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={() => setLightboxOpen(true)}
        title="Portrait (first image in the gallery)"
        aria-label={`Open portrait of ${data.name} in image viewer`}
      >
        <div className="aspect-3/4">
          <ManagedImage
            filename={primaryImage}
            alt={`Portrait of ${data.name}`}
            loading="eager"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-ink/60 text-white text-[10px] font-display tracking-wider uppercase backdrop-blur-sm pointer-events-none">
          Portrait
        </div>
        {/* Subtle vignette overlay */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.15)]" />
        <div className="absolute inset-0 flex items-center justify-center bg-ink/0 group-hover:bg-ink/20 group-focus-visible:bg-ink/20 transition-colors">
          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
            Open image
          </span>
        </div>
      </button>

      {lightboxOpen && (
        <ImageLightbox
          images={images}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
};

export const GallerySection: React.FC<{ data: Entity | Item }> = ({ data }) => {
  const images = "images" in data ? data.images || [] : [];
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  if (images.length === 0) return null;

  // If only one image, don't show gallery (it's already in portrait)
  if (images.length === 1) return null;

  return (
    <>
      <ViewSection title="Gallery" iconCategory="class" iconName="bard">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((imageRef, index) => (
            <button
              type="button"
              key={imageRefKey(imageRef, index)}
              className="aspect-square rounded-lg overflow-hidden border border-border/30 shadow-sm bg-muted group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              onClick={() => setLightboxIndex(index)}
              aria-label={`Open ${data.name} illustration ${index + 1} in image viewer`}
            >
              <ManagedImage
                filename={imageRef}
                alt={`${data.name} illustration ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      </ViewSection>

      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
