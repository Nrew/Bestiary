import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryCache } from "./cache";

describe("QueryCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("deduplicates concurrent fetches for the same key", async () => {
    const cache = new QueryCache<string>(1_000, { autoCleanup: false });
    let resolveFetch!: (value: string) => void;
    const fetchFn = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const first = cache.getOrFetch("entry:1", fetchFn);
    const second = cache.getOrFetch("entry:1", fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(1);

    resolveFetch("loaded");
    await expect(first).resolves.toBe("loaded");
    await expect(second).resolves.toBe("loaded");

    const cached = await cache.getOrFetch("entry:1", vi.fn(async () => "fresh"));
    expect(cached).toBe("loaded");
  });

  it("does not cache a pending result after the key is invalidated", async () => {
    const cache = new QueryCache<string>(1_000, { autoCleanup: false });
    let resolveFetch!: (value: string) => void;
    const pending = cache.getOrFetch(
      "entry:1",
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        })
    );

    cache.invalidate("entry:1");
    resolveFetch("stale");

    await expect(pending).resolves.toBe("stale");
    expect(cache.get("entry:1")).toBeNull();
  });

  it("expires entries by ttl", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const cache = new QueryCache<string>(1_000, { autoCleanup: false });

    cache.set("entry:1", "loaded", 100);
    expect(cache.get("entry:1")).toBe("loaded");

    vi.advanceTimersByTime(101);
    expect(cache.get("entry:1")).toBeNull();
  });

  it("evicts the least recently used entry when max size is reached", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const cache = new QueryCache<string>(1_000, {
      autoCleanup: false,
      maxSize: 2,
    });

    cache.set("a", "first");
    vi.setSystemTime(1);
    cache.set("b", "second");
    vi.setSystemTime(2);
    expect(cache.get("a")).toBe("first");
    vi.setSystemTime(3);
    cache.set("c", "third");

    expect(cache.get("a")).toBe("first");
    expect(cache.get("b")).toBeNull();
    expect(cache.get("c")).toBe("third");
  });
});
