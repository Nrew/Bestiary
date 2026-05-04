import { getLogger } from './logger';

const log = getLogger('errors');


/**
 * Shape of a structured error payload thrown by the Tauri backend.
 *
 * The Rust `AppError` enum is serialized with `#[serde(tag = "type", content = "content")]`
 * so the frontend receives the JSON object directly when an `invoke` rejects.
 * See `src-tauri/src/error.rs` and the `AppError` type in `src/types/generated.ts`.
 */
interface BackendErrorPayload {
  type: string;
  content?: {
    message?: string;
    errors?: string[];
    slug?: string;
    id?: string;
    entityType?: string;
  };
}

function isBackendErrorPayload(error: unknown): error is BackendErrorPayload {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    typeof error.type === 'string'
  );
}


/**
 * Safely extracts a human-readable error message from any error type.
 * Recognizes the structured backend payload and renders type-specific text.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (isBackendErrorPayload(error)) {
    switch (error.type) {
      case 'validation':
        return error.content?.errors?.join(', ') || 'Validation failed';
      case 'slugConflict':
        return error.content?.slug
          ? `A unique value is already in use: ${error.content.slug}`
          : 'A unique value is already in use.';
      case 'dependencyConflict':
      case 'database':
      case 'io':
      case 'tauri':
        return error.content?.message || 'The backend reported an error.';
      case 'notFound': {
        const entityType = error.content?.entityType || 'Resource';
        const id = error.content?.id || 'unknown';
        return `${entityType} with ID ${id} was not found.`;
      }
      default:
        return 'The backend reported an error.';
    }
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }

  return 'An unknown error occurred';
}

/**
 * Creates a formatted error message with operation context.
 */
export function formatErrorMessage(operation: string, error: unknown): string {
  return `${operation}: ${getErrorMessage(error)}`;
}


/**
 * Base class for all errors thrown by the frontend after backend mapping.
 * Carries an optional structured `code` so callers can branch without
 * pattern-matching error messages.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Thrown when the backend reports a `notFound` AppError. Carries the original
 * `entityType` and `id` from the structured payload so callers can render
 * targeted UI ("Goblin not found") instead of a generic message.
 */
export class NotFoundError extends AppError {
  constructor(public readonly entityType: string, public readonly entityId: string) {
    super(`${entityType} with ID ${entityId} was not found.`, 'NOT_FOUND', {
      entityType,
      entityId,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown when the backend reports `slugConflict` or `dependencyConflict`.
 * `kind` distinguishes the two so the UI can surface different recovery
 * actions ("change the slug" vs "delete the dependent rows first").
 */
export class ConflictError extends AppError {
  constructor(
    message: string,
    public readonly kind: 'slug' | 'dependency'
  ) {
    super(message, 'CONFLICT', { kind });
    this.name = 'ConflictError';
  }
}

/**
 * Thrown when the backend reports a `validation` AppError.
 * `errors` is the list of field-level validation messages from the backend.
 */
export class ValidationError extends AppError {
  constructor(message: string, public readonly errors: ReadonlyArray<string>) {
    super(message, 'VALIDATION_ERROR', { errors });
    this.name = 'ValidationError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}


interface TryCatchOptions<T> {
  /** Value returned when the operation throws. Defaults to `null`. */
  fallback?: T;
  /** Custom error handler. Suppresses the default `log.warn` when provided. */
  onError?: (error: unknown) => void;
  /** When true, no logging happens even if `onError` is omitted. */
  silent?: boolean;
}

/**
 * Synchronous try/catch wrapper used by callers that want a fallback value
 * instead of a thrown exception. The default-handler / custom-handler split
 * is `if/else` (not `??`) so a provided `onError` actually suppresses the
 * default log. `??` was a bug in an earlier version because `onError` returns
 * void and would always fall through.
 */
export function tryCatch<T>(fn: () => T, options?: TryCatchOptions<T>): T | null {
  try {
    return fn();
  } catch (error) {
    if (!options?.silent) {
      if (options?.onError) {
        options.onError(error);
      } else {
        log.warn('Operation failed:', getErrorMessage(error));
      }
    }
    return options?.fallback ?? null;
  }
}

/** Async variant of `tryCatch` with the same handler semantics. */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  options?: TryCatchOptions<T>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (!options?.silent) {
      if (options?.onError) {
        options.onError(error);
      } else {
        log.warn('Async operation failed:', getErrorMessage(error));
      }
    }
    return options?.fallback ?? null;
  }
}


/**
 * Maps a raw error caught from a Tauri `invoke` call to the appropriate typed
 * frontend error class. Returns `null` when the error is not a recognized
 * structured backend payload; callers should fall through to their own
 * generic handling for those cases.
 *
 * The mapping is intentionally narrow: only the structured `AppError` variants
 * the Rust backend can emit get typed classes. Everything else stays raw so
 * we don't accidentally hide an unfamiliar failure mode.
 */
export function mapBackendError(error: unknown): AppError | null {
  if (!isBackendErrorPayload(error)) return null;

  switch (error.type) {
    case 'notFound':
      return new NotFoundError(
        error.content?.entityType ?? 'Resource',
        error.content?.id ?? 'unknown'
      );
    case 'slugConflict':
      return new ConflictError(
        error.content?.slug
          ? `Slug already in use: ${error.content.slug}`
          : 'A unique value is already in use.',
        'slug'
      );
    case 'dependencyConflict':
      return new ConflictError(
        error.content?.message ?? 'Resource is referenced by other records.',
        'dependency'
      );
    case 'validation':
      return new ValidationError(
        error.content?.errors?.join(', ') || 'Validation failed',
        error.content?.errors ?? []
      );
    default:
      return null;
  }
}


/**
 * Patterns that indicate the Rust backend has crashed/panicked.
 * Heuristics based on common Tauri IPC error shapes, used to fire the
 * `'backend-panic'` global event so the UI can surface a restart banner.
 */
const BACKEND_PANIC_PATTERNS: ReadonlyArray<RegExp> = [
  /invoke\s+error/i,
  /ipc\s+error/i,
  /no\s+handler\s+found/i,
  /command\s+.*\s+not\s+found/i,
  /panicked/i,
  /thread\s+'.*'\s+panicked/i,
  /SIGABRT/i,
  /SIGSEGV/i,
  /failed\s+to\s+serialize/i,
  /deserialization\s+error/i,
];

export function isBackendPanic(error: unknown): boolean {
  // Structured AppError payloads are not panics; the backend
  // returned a typed Err, the runtime did not crash.
  if (isBackendErrorPayload(error)) return false;
  const message = getErrorMessage(error).toLowerCase();
  return BACKEND_PANIC_PATTERNS.some((pattern) => pattern.test(message));
}
