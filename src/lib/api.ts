import { invoke, type InvokeArgs, type InvokeOptions } from "@tauri-apps/api/core";
import type {
  EntityExport,
  ItemExport,
  StatusExport,
  AbilityExport,
  GameEnums,
  BestiaryEntry,
  ImportResult,
} from "@/types";
import { apiCache } from './cache';
import {
  AppError,
  getErrorMessage,
  isAppError,
  isBackendPanic,
  mapBackendError,
} from './errors';
import { CACHE } from "@/lib/dnd/constants";

/**
 * Wraps `invoke` so that:
 * 1. Any Rust-side panic/crash detected via `isBackendPanic` fires a global
 *    `'backend-panic'` CustomEvent. UI layers (main.tsx) listen for that
 *    event and surface a restart banner.
 * 2. Structured backend `AppError` payloads (`{ type: 'notFound', ... }`,
 *    `slugConflict`, `validation`, `dependencyConflict`) are mapped to typed
 *    frontend error classes (`NotFoundError`, `ConflictError`, `ValidationError`).
 *    Callers can branch with `instanceof NotFoundError` instead of pattern
 *    matching against error messages.
 *
 * Anything that isn't a recognized structured payload is re-thrown unchanged.
 */
async function safeInvoke<T>(cmd: string, args?: InvokeArgs, options?: InvokeOptions): Promise<T> {
  try {
    return await invoke<T>(cmd, args, options);
  } catch (error) {
    if (isBackendPanic(error)) {
      try {
        window.dispatchEvent(new CustomEvent('backend-panic', { detail: error }));
      } catch {
        // dispatching must never mask the original error
      }
    }

    // Map structured `AppError` payloads to typed frontend classes so callers
    // can use `instanceof` checks. Unrecognized payloads pass through.
    const mapped = mapBackendError(error);
    if (mapped) throw mapped;

    throw error;
  }
}


function validateQuery(query: string): void {
  if (typeof query !== 'string') {
    throw new AppError('Query must be a string', 'VALIDATION_ERROR', { query });
  }
}

function validateSearchParams(query: string, limit: number, offset: number): void {
  validateQuery(query);
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new AppError('Limit must be an integer between 1 and 1000', 'VALIDATION_ERROR', { limit });
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new AppError('Offset must be a non-negative integer', 'VALIDATION_ERROR', { offset });
  }
}

function getSafeErrorContext(error: unknown): { errorMessage: string } {
  return { errorMessage: getErrorMessage(error) };
}

function validateId(id: string): void {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new AppError('ID must be a non-empty string', 'VALIDATION_ERROR', { id });
  }
}

function createCacheKey(context: string, operation: string, ...parts: (string | number)[]): string {
  const encodedParts = parts.map(part =>
    typeof part === 'string' ? encodeURIComponent(part) : part
  );
  return `${context}:${operation}:${encodedParts.join(':')}`;
}

// === CRUD factory ===

interface CrudConfig {
  context: string;
  singularName: string;
  commands: {
    search: string;
    count: string;
    details: string;
    save: string;
    delete: string;
  };
  savePayloadKey: string;
}

export interface CrudOperations<T extends BestiaryEntry> {
  search: (query: string, limit: number, offset: number) => Promise<T[]>;
  count: (query: string) => Promise<number>;
  getDetails: (id: string) => Promise<T>;
  save: (item: T) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

function createCrudOperations<T extends BestiaryEntry>(config: CrudConfig): CrudOperations<T> {
  const { context, singularName, commands, savePayloadKey } = config;

  return {
    search: async (query: string, limit: number, offset: number): Promise<T[]> => {
      validateSearchParams(query, limit, offset);
      const cacheKey = createCacheKey(context, 'search', query, limit, offset);
      return apiCache.getOrFetch<T[]>(
        cacheKey,
        () => safeInvoke<T[]>(commands.search, { query, limit, offset }),
        CACHE.SEARCH_TTL
      );
    },

    count: async (query: string): Promise<number> => {
      validateQuery(query);
      const cacheKey = createCacheKey(context, 'count', query);
      return apiCache.getOrFetch<number>(
        cacheKey,
        () => safeInvoke<number>(commands.count, { query }),
        CACHE.SEARCH_TTL
      );
    },

    getDetails: async (id: string): Promise<T> => {
      validateId(id);
      const cacheKey = createCacheKey(context, 'details', id);
      return apiCache.getOrFetch<T>(
        cacheKey,
        () => safeInvoke<T>(commands.details, { id }),
        CACHE.DETAILS_TTL
      );
    },

    save: async (item: T): Promise<T> => {
      validateId(item.id);
      try {
        const result = await safeInvoke<T>(commands.save, { [savePayloadKey]: item });
        apiCache.invalidate(createCacheKey(context, 'details', item.id));
        // Atomic invalidation of both search and count caches
        apiCache.invalidatePatterns([`${context}:search:`, `${context}:count:`]);
        return result;
      } catch (error) {
        // Preserve typed error classes (NotFoundError / ConflictError / etc.)
        // so consumers can branch with `instanceof`. Only wrap unknown shapes.
        if (isAppError(error)) throw error;
        throw new AppError(
          getErrorMessage(error),
          'SAVE_ERROR',
          { [`${singularName}Id`]: item.id, ...getSafeErrorContext(error) }
        );
      }
    },

    delete: async (id: string): Promise<void> => {
      validateId(id);
      try {
        await safeInvoke<void>(commands.delete, { id });
        apiCache.invalidate(createCacheKey(context, 'details', id));
        // Atomic invalidation of both search and count caches
        apiCache.invalidatePatterns([`${context}:search:`, `${context}:count:`]);
      } catch (error) {
        if (isAppError(error)) throw error;
        throw new AppError(
          getErrorMessage(error),
          'DELETE_ERROR',
          { [`${singularName}Id`]: id, ...getSafeErrorContext(error) }
        );
      }
    },
  };
}

// === CRUD API exports ===

export const entityApi = createCrudOperations<EntityExport>({
  context: 'entities',
  singularName: 'entity',
  commands: {
    search: 'search_entities',
    count: 'get_entity_search_count',
    details: 'get_entity_details',
    save: 'save_entity',
    delete: 'delete_entity',
  },
  savePayloadKey: 'entity',
});

export const itemApi = createCrudOperations<ItemExport>({
  context: 'items',
  singularName: 'item',
  commands: {
    search: 'search_items',
    count: 'get_item_search_count',
    details: 'get_item_details',
    save: 'save_item',
    delete: 'delete_item',
  },
  savePayloadKey: 'item',
});

export const statusApi = createCrudOperations<StatusExport>({
  context: 'statuses',
  singularName: 'status',
  commands: {
    search: 'search_statuses',
    count: 'get_status_search_count',
    details: 'get_status_details',
    save: 'save_status',
    delete: 'delete_status',
  },
  savePayloadKey: 'status',
});

export const abilityApi = createCrudOperations<AbilityExport>({
  context: 'abilities',
  singularName: 'ability',
  commands: {
    search: 'search_abilities',
    count: 'get_ability_search_count',
    details: 'get_ability_details',
    save: 'save_ability',
    delete: 'delete_ability',
  },
  savePayloadKey: 'ability',
});

// === Enums and startup ===

export function getGameEnums(): Promise<GameEnums> {
  return apiCache.getOrFetch<GameEnums>(
    'enums:game',
    () => safeInvoke<GameEnums>("get_game_enums"),
    CACHE.ENUMS_TTL
  );
}

export function getAppReady(): Promise<GameEnums> {
  return safeInvoke<GameEnums>("get_app_ready");
}

// === Images ===

/**
 * Store image bytes and return the managed bare filename (e.g. "<uuid>.webp").
 * The returned value is the only thing the frontend should persist; never an
 * absolute path. Pass it to `resolveImageUrl` for display.
 */
export function storeImage(fileBytes: Uint8Array): Promise<string> {
  return safeInvoke<string>("store_image", fileBytes, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}

/**
 * Delete a managed image by its bare filename. The backend rejects any value
 * containing a path separator or starting with '.'.
 */
export function deleteImage(imageRef: string): Promise<void> {
  return safeInvoke<void>("delete_image", { imageRef });
}

export async function uploadImage(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return storeImage(new Uint8Array(arrayBuffer));
}

const imageUrlCache = new Map<string, string>();
const pendingImageUrlCache = new Map<string, Promise<string>>();

/**
 * Resolve a managed image filename to an `asset://` URL the webview can render
 * directly. Results are cached for the lifetime of the app session.
 *
 * The backend command returns only a safe asset URL, never a raw absolute path.
 * Callers must not persist the returned URL; it is for rendering only.
 */
export async function resolveImageUrl(filename: string): Promise<string> {
  const cached = imageUrlCache.get(filename);
  if (cached) return cached;
  const pending = pendingImageUrlCache.get(filename);
  if (pending) return pending;

  const request = safeInvoke<string>("resolve_image_url", { filename })
    .then((url) => {
      imageUrlCache.set(filename, url);
      return url;
    })
    .finally(() => {
      pendingImageUrlCache.delete(filename);
    });
  pendingImageUrlCache.set(filename, request);
  return request;
}

export function clearImageUrlCache(): void {
  imageUrlCache.clear();
  pendingImageUrlCache.clear();
}

// === Database maintenance ===

export interface ExportResult {
  fileName: string;
  displayPath: string;
}

export function exportDatabase(): Promise<ExportResult> {
  return safeInvoke<ExportResult>("export_database");
}

export async function importDatabase(jsonStr: string): Promise<ImportResult> {
  return safeInvoke<ImportResult>("import_database", { jsonStr });
}

export function cleanupOrphanedImages(): Promise<number> {
  return safeInvoke<number>("cleanup_orphaned_images");
}

export function clearAllCaches(): void {
  apiCache.clear();
  clearImageUrlCache();
}
