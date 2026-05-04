import React from "react";
import { useResolvedImage } from "@/hooks/useResolvedImage";

interface ManagedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  /**
   * Managed image filename as stored in the database (e.g. "<uuid>.webp").
   * Must NOT contain path separators. Resolved via the `resolve_image_url`
   * Tauri command into a safe asset:// URL.
   */
  filename: string;
  /** Optional fallback rendered when the image cannot be resolved. */
  fallback?: React.ReactNode;
}

/**
 * Renders a managed image by bare filename. The backend owns URL resolution;
 * the frontend never constructs the absolute file path itself.
 *
 * Resolution failures render the optional `fallback` silently; broken images
 * must not crash the surrounding view.
 *
 * Memoized because gallery and portrait parents re-render frequently; without
 * it the URL resolution effect re-fires on every parent render.
 */
const ManagedImageComponent: React.FC<ManagedImageProps> = ({
  filename,
  fallback,
  alt = "",
  loading = "lazy",
  decoding = "async",
  ...rest
}) => {
  const { url, failed } = useResolvedImage(filename);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    const image = imageRef.current;
    if (!image || !url) return;
    const handleError = () => setLoadError(true);
    image.addEventListener("error", handleError);
    return () => image.removeEventListener("error", handleError);
  }, [url]);

  if (failed || loadError) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div
        className="flex items-center justify-center text-destructive text-xs p-2 text-center"
        aria-label={`Image ${filename} could not be loaded`}
      >
        Image unavailable
      </div>
    );
  }

  if (!url) {
    return <div aria-hidden="true" className={rest.className} />;
  }

  return (
    <img
      ref={imageRef}
      src={url}
      alt={alt}
      loading={loading}
      decoding={decoding}
      {...rest}
    />
  );
};

export const ManagedImage = React.memo(ManagedImageComponent);
