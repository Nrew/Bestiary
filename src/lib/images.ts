import { ALLOWED_IMAGE_EXTENSIONS } from "@/lib/dnd/constants";

/**
 * Managed images are stored as bare backend-owned filenames.
 */
export function isManagedImageRef(ref: unknown): ref is string {
  if (typeof ref !== "string" || ref.length === 0) return false;
  if (ref.includes("/") || ref.includes("\\") || ref.includes("\0")) return false;
  if (ref.startsWith(".")) return false;

  const extension = ref.split(".").pop()?.toLowerCase();
  return !!extension && ALLOWED_IMAGE_EXTENSIONS.includes(extension);
}

export function imageRefKey(imageRef: string, index: number): string {
  return `${index}:${imageRef}`;
}
