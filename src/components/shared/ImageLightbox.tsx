import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useResolvedImage } from "@/hooks/useResolvedImage";
import { Button } from "@/components/ui/button";

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [isImageLoaded, setIsImageLoaded] = React.useState(false);
  const imageRef = React.useRef<HTMLImageElement | null>(null);

  const { url: resolvedUrl, failed: resolveError } = useResolvedImage(images[currentIndex] ?? null);
  const [imgError, setImgError] = React.useState(false);
  const loadError = resolveError || imgError;

  // Reset load state whenever the slide changes so the new image fades in correctly.
  React.useEffect(() => {
    setIsImageLoaded(false);
    setImgError(false);
  }, [currentIndex]);

  const handlePrev = React.useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  }, [images.length]);

  const handleNext = React.useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  }, [images.length]);

  const handleKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    },
    [onClose, handlePrev, handleNext]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  React.useEffect(() => {
    const image = imageRef.current;
    if (!image || !resolvedUrl) return;

    const handleLoad = () => setIsImageLoaded(true);
    const handleError = () => setImgError(true);

    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);
    if (image.complete && image.naturalWidth > 0) {
      handleLoad();
    }

    return () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };
  }, [resolvedUrl]);

  if (images.length === 0) return null;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-100"
          style={{ background: "oklch(10% 0.01 30 / 0.85)" }}
        />
        <Dialog.Content
          className="fixed inset-0 z-101 flex items-center justify-center focus:outline-none"
          aria-describedby="image-lightbox-description"
        >
      <Dialog.Title className="sr-only">
        Image viewer
      </Dialog.Title>
      <Dialog.Description id="image-lightbox-description" className="sr-only">
        Full-screen image viewer. Use the previous and next buttons or arrow keys to navigate images.
      </Dialog.Description>
      <Dialog.Close asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 text-parchment hover:bg-parchment/20"
          aria-label="Close image viewer"
        >
          <X className="h-6 w-6" />
        </Button>
      </Dialog.Close>

      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 z-10 text-parchment hover:bg-parchment/20"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Previous image"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {/* Image - just the image, no container box */}
      <div
        className="flex items-center justify-center p-8"
      >
        {!isImageLoaded && !loadError && (
          <div className="absolute flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-parchment/30 border-t-parchment rounded-full animate-spin" />
          </div>
        )}

        {loadError ? (
          <div
            className="flex max-w-sm flex-col items-center gap-3 rounded-lg border border-parchment/20 bg-ink/80 p-6 text-center text-parchment shadow-2xl"
            role="status"
            aria-live="polite"
          >
            <ImageOff className="h-10 w-10 opacity-80" aria-hidden="true" />
            <div>
              <p className="font-medium">Image unavailable</p>
              <p className="mt-1 text-sm text-parchment/70">
                This image reference could not be loaded.
              </p>
            </div>
          </div>
        ) : resolvedUrl && (
          <img
            ref={imageRef}
            src={resolvedUrl}
            alt={`Image ${currentIndex + 1}`}
            className={`max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-opacity duration-200 ${
              isImageLoaded ? "opacity-100" : "opacity-0"
            }`}
            loading="eager"
            decoding="async"
          />
        )}
      </div>

      {images.length > 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 z-10 text-parchment hover:bg-parchment/20"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Next image"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-parchment text-sm font-medium bg-ink/70 backdrop-blur-sm px-3 py-1 rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
