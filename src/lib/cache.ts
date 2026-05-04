import type { BestiaryEntry, GameEnums } from "@/types";
import { CACHE, TIMING } from "@/lib/dnd/constants";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  lastAccess: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  requestId: string;
  startTime: number;
}

type ApiCacheValue = BestiaryEntry[] | BestiaryEntry | number | GameEnums;

const DEFAULT_MAX_SIZE = 500;
// Cleanup runs on its own interval, independent of per-entry TTL
const DEFAULT_CLEANUP_INTERVAL = 60 * 1000;
const PENDING_REQUEST_TIMEOUT = 5 * 60 * 1000;

let requestIdCounter = 0;

function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

/**
 * Query cache with TTL expiration, LRU eviction, and request deduplication.
 * Concurrent requests for the same key share one in-flight fetch; only the
 * owning request writes to cache, so invalidation during a fetch is safe.
 */
export class QueryCache<TBase> {
  private cache = new Map<string, CacheEntry<TBase>>();
  private pendingRequests = new Map<string, PendingRequest<TBase>>();
  private defaultTTL: number;
  private maxSize: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // Bumped on invalidation; in-flight requests check this before writing.
  private keyGenerations = new Map<string, number>();
  // Only the request that owns a key may write to it on completion.
  private keyOwners = new Map<string, string>();

  constructor(
    defaultTTL = 5 * 60 * 1000,
    options: { autoCleanup?: boolean; maxSize?: number; cleanupIntervalMs?: number } = {}
  ) {
    const { autoCleanup = true, maxSize = DEFAULT_MAX_SIZE, cleanupIntervalMs = DEFAULT_CLEANUP_INTERVAL } = options;

    this.defaultTTL = defaultTTL;
    this.maxSize = maxSize;

    if (autoCleanup) {
      // Use a fixed cleanup interval, independent of TTL
      this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    }
  }

  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.pendingRequests.clear();
    this.keyGenerations.clear();
    this.keyOwners.clear();
  }

  private cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }

    // Drop requests that have been pending too long (prevents memory leak from unresolved promises)
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.startTime > PENDING_REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
        if (this.keyOwners.get(key) === pending.requestId) {
          this.keyOwners.delete(key);
        }
      }
    }

    for (const key of this.keyGenerations.keys()) {
      if (!this.cache.has(key) && !this.pendingRequests.has(key)) {
        this.keyGenerations.delete(key);
      }
    }

    for (const key of this.keyOwners.keys()) {
      if (!this.pendingRequests.has(key)) {
        this.keyOwners.delete(key);
      }
    }
  }

  private evictLRU(): void {
    if (this.cache.size < this.maxSize) return;

    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remove oldest 25% of entries to avoid frequent evictions
    const toRemove = Math.max(1, Math.floor(this.cache.size * 0.25));
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private getKeyGeneration(key: string): number {
    return this.keyGenerations.get(key) ?? 0;
  }

  private bumpKeyGeneration(key: string): void {
    this.keyGenerations.set(key, (this.keyGenerations.get(key) ?? 0) + 1);
  }

  async getOrFetch<T extends TBase>(key: string, fetchFn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) return cached as T;

    const pending = this.pendingRequests.get(key);
    if (pending) return pending.promise as Promise<T>;

    const requestId = generateRequestId();
    const requestGeneration = this.getKeyGeneration(key);
    const startTime = Date.now();
    this.keyOwners.set(key, requestId);

    const request = fetchFn().then(
      (data) => {
        // Only write to cache if:
        // 1. This request still owns the key (wasn't superseded by another request)
        // 2. Key wasn't invalidated during the request
        const currentOwner = this.keyOwners.get(key);
        const currentGeneration = this.getKeyGeneration(key);

        if (currentOwner === requestId && requestGeneration === currentGeneration) {
          this.setInternal(key, data, ttl);
        }

        this.pendingRequests.delete(key);
        if (this.keyOwners.get(key) === requestId) {
          this.keyOwners.delete(key);
        }

        return data;
      },
      (error) => {
        this.pendingRequests.delete(key);
        if (this.keyOwners.get(key) === requestId) {
          this.keyOwners.delete(key);
        }
        throw error;
      }
    );

    this.pendingRequests.set(key, { promise: request, requestId, startTime });
    return request;
  }

  private setInternal(key: string, data: TBase, ttl: number | undefined): void {
    // Evict old entries if we're at capacity (unless updating existing key)
    if (!this.cache.has(key)) {
      this.evictLRU();
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + (ttl ?? this.defaultTTL),
      lastAccess: now,
    });
  }

  set(key: string, data: TBase, ttl?: number): void {
    this.setInternal(key, data, ttl);
  }

  get(key: string): TBase | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.lastAccess = now;
    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.pendingRequests.delete(key);
    this.keyOwners.delete(key);  // Clear ownership so in-flight requests can't write
    // Bump generation so in-flight requests don't write stale data
    this.bumpKeyGeneration(key);
  }

  // Collect matching keys before mutating so iteration isn't affected by deletion.
  invalidatePatterns(prefixes: string[]): void {
    const keysToInvalidate = new Set<string>();

    for (const prefix of prefixes) {
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) keysToInvalidate.add(key);
      }
      for (const key of this.pendingRequests.keys()) {
        if (key.startsWith(prefix)) keysToInvalidate.add(key);
      }
    }

    for (const key of keysToInvalidate) {
      this.cache.delete(key);
      this.pendingRequests.delete(key);
      this.keyOwners.delete(key);
      this.bumpKeyGeneration(key);
    }
  }

  invalidatePattern(prefix: string): void {
    this.invalidatePatterns([prefix]);
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    this.keyGenerations.clear();
    this.keyOwners.clear();
  }

  getStats(): { cacheSize: number; pendingCount: number; maxSize: number } {
    return {
      cacheSize: this.cache.size,
      pendingCount: this.pendingRequests.size,
      maxSize: this.maxSize,
    };
  }
}

export const apiCache = new QueryCache<ApiCacheValue>(CACHE.DETAILS_TTL, {
  autoCleanup: true,
  maxSize: CACHE.MAX_SIZE,
  cleanupIntervalMs: TIMING.CACHE_CLEANUP_INTERVAL,
});

/**
 * Disposes all cache instances by clearing data and stopping cleanup intervals.
 * Call this on app unmount to prevent memory leaks.
 */
export function disposeAllCaches(): void {
  apiCache.dispose();
}
