import React from "react";
import { useFormContext, Controller, FieldValues, Path } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { X, Upload, Image as ImageIcon, ZoomIn } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { ALLOWED_IMAGE_EXTENSIONS, IMAGE } from "@/lib/dnd/constants";
import { ImageLightbox } from "@/components/shared/ImageLightbox";
import { ManagedImage } from "@/components/shared/ManagedImage";
import { useToast } from "@/components/ui/toast";
import { getLogger } from "@/lib/logger";
import { imageRefKey, isManagedImageRef } from "@/lib/images";

const log = getLogger("ImageUpload");

/** Error thrown when a file has an unsupported extension. */
class UnsupportedExtensionError extends Error {
  constructor(public readonly fileName: string) {
    super(`Unsupported extension for "${fileName}"`);
    this.name = "UnsupportedExtensionError";
  }
}


interface ImageUploadProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  description?: string;
  maxImages?: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** Validates dimensions before canvas allocation, then downsizes large uploads. */
async function optimizeImage(file: File): Promise<File> {
  if (file.type === "image/svg+xml") return file;

  if (file.size < 500 * 1024) return file;

  const optimizePromise = new Promise<File>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    const cleanup = () => URL.revokeObjectURL(url);

    img.onload = () => {
      cleanup();

      const { width, height } = img;

      if (width > IMAGE.MAX_SAFE_DIMENSION || height > IMAGE.MAX_SAFE_DIMENSION) {
        reject(new Error(`Image too large: ${width}x${height} exceeds maximum of ${IMAGE.MAX_SAFE_DIMENSION}px`));
        return;
      }

      if (width * height > IMAGE.MAX_CANVAS_AREA) {
        reject(new Error(`Image area too large: ${width * height} pixels exceeds maximum`));
        return;
      }

      if (width <= IMAGE.MAX_DIMENSION && height <= IMAGE.MAX_DIMENSION) {
        if (file.size < 1024 * 1024) { // under 1MB, no-op
          resolve(file);
          return;
        }
      }

      let newWidth = width;
      let newHeight = height;

      if (width > IMAGE.MAX_DIMENSION || height > IMAGE.MAX_DIMENSION) {
        if (width > height) {
          newWidth = IMAGE.MAX_DIMENSION;
          newHeight = Math.round((height / width) * IMAGE.MAX_DIMENSION);
        } else {
          newHeight = IMAGE.MAX_DIMENSION;
          newWidth = Math.round((width / height) * IMAGE.MAX_DIMENSION);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
      const quality = outputType === "image/jpeg" ? IMAGE.JPEG_QUALITY : undefined;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const ext = outputType === "image/png" ? "png" : "jpg";
            const baseName = file.name.replace(/\.[^.]+$/, "");
            resolve(new File([blob], `${baseName}.${ext}`, { type: outputType }));
          } else {
            resolve(file);
          }
        },
        outputType,
        quality
      );
    };

    img.onerror = () => {
      cleanup();
      reject(new Error("Failed to load image - file may be corrupted"));
    };

    img.src = url;
  });

  try {
    return await withTimeout(optimizePromise, IMAGE.OPTIMIZATION_TIMEOUT, "Image optimization");
  } catch (error) {
    log.warn("Image optimization failed, using original:", error);
    return file; // Fall back to original on timeout or error
  }
}

export function ImageUpload<T extends FieldValues>({
  name,
  label,
  description,
  maxImages = 10,
}: ImageUploadProps<T>) {
  const { control } = useFormContext<T>();
  const toast = useToast();
  const [isUploading, setIsUploading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const acceptedTypes = ALLOWED_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(",");

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const images: string[] = field.value || [];

        const uploadFile = async (file: File): Promise<string> => {
          let ext = file.name.split(".").pop()?.toLowerCase();

          if (!ext || ext === file.name.toLowerCase()) {
            const mimeExt = file.type.split("/")[1];
            if (mimeExt && ALLOWED_IMAGE_EXTENSIONS.includes(mimeExt)) {
              ext = mimeExt;
              file = new File([file], `pasted-image.${ext}`, { type: file.type });
            }
          }

          if (!ext || !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
            throw new UnsupportedExtensionError(file.name);
          }

          const optimizedFile = await optimizeImage(file);
          return uploadImage(optimizedFile);
        };

        const handleFiles = async (files: FileList | File[] | null) => {
          if (!files || files.length === 0) return;
          if (images.length >= maxImages) return;

          setIsUploading(true);
          const newPaths: string[] = [];
          const failedFiles: string[] = [];
          const fileArray = Array.isArray(files) ? files : Array.from(files);
          const total = fileArray.length;

          try {
            for (const file of fileArray) {
              if (images.length + newPaths.length >= maxImages) break;
              try {
                const path = await uploadFile(file);
                newPaths.push(path);
              } catch (err) {
                if (err instanceof UnsupportedExtensionError) {
                  toast.warning(
                    `"${err.fileName}" has an unsupported format. Supported: jpg, jpeg, png, gif, webp.`
                  );
                } else {
                  log.error("Failed to upload image:", err);
                }
                failedFiles.push(file.name);
              }
            }

            // Commit any successfully-uploaded paths even if some files failed
            if (newPaths.length > 0) {
              field.onChange([...images, ...newPaths]);
            }

            if (failedFiles.length > 0) {
              toast.error(
                `${failedFiles.length} of ${total} file(s) failed to upload.`
              );
            }
          } finally {
            setIsUploading(false);
          }
        };

        const handlePaste = (e: React.ClipboardEvent) => {
          const items = e.clipboardData?.items;
          if (!items) return;

          const imageFiles: File[] = [];
          for (const item of Array.from(items)) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (file) imageFiles.push(file);
            }
          }

          if (imageFiles.length > 0) {
            e.preventDefault();
            void handleFiles(imageFiles);
          }
        };

        const removeImage = (index: number, e: React.MouseEvent) => {
          e.stopPropagation();
          field.onChange(images.filter((_, i) => i !== index));
        };

        const handleDrop = (e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        };

        const handleDragOver = (e: React.DragEvent) => {
          e.preventDefault();
          setDragOver(true);
        };

        const handleDragLeave = () => {
          setDragOver(false);
        };

        return (
          <div className="space-y-3" onPaste={handlePaste}>
            <div>
              <Label>{label}</Label>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {images.map((imageRef, index) => {
                  // Image refs persisted in the form must be managed bare filenames.
                  // Anything else is rejected up-front (defensive: backend would also
                  // reject it, but this avoids a wasted IPC round-trip for rendering).
                  const isValid = isManagedImageRef(imageRef);
                  return (
                  <div
                    key={imageRefKey(imageRef, index)}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => isValid && setLightboxIndex(index)}
                    onKeyDown={(e) => {
                      if (isValid && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setLightboxIndex(index);
                      }
                    }}
                    role="button"
                    tabIndex={isValid ? 0 : -1}
                    aria-label={`Open image ${index + 1}`}
                  >
                    {isValid ? (
                    <ManagedImage
                      filename={imageRef}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    ) : (
                    <div className="w-full h-full flex items-center justify-center text-destructive text-xs p-2 text-center">
                      Invalid image reference
                    </div>
                    )}
                    <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 group-focus-visible:bg-ink/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => removeImage(index, e)}
                      aria-label={`Remove image ${index + 1}`}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}

            {images.length < maxImages && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={isUploading ? -1 : 0}
                aria-disabled={isUploading}
                className={`
                  flex flex-col items-center justify-center gap-2 p-6
                  border-2 border-dashed rounded-lg cursor-pointer transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${dragOver ? "border-accent bg-accent/10" : "border-border hover:border-muted-foreground hover:bg-muted/50"}
                  ${isUploading ? "opacity-50 pointer-events-none" : ""}
                `}
              >
                {isUploading ? (
                  <>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-accent" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-muted">
                      {images.length === 0 ? (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">
                        {images.length === 0 ? "Add images" : "Add more images"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Drag & drop, click, or Ctrl+V to paste
                      </p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptedTypes}
                  multiple
                  onChange={(e) => {
                    void handleFiles(e.target.files);
                  }}
                  className="hidden"
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {images.length} / {maxImages} images
            </p>

            {error && (
              <p className="text-sm text-destructive">{error.message}</p>
            )}

            {lightboxIndex !== null && (
              <ImageLightbox
                images={images}
                initialIndex={lightboxIndex}
                onClose={() => setLightboxIndex(null)}
              />
            )}
          </div>
        );
      }}
    />
  );
}
