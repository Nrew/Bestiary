import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  useCallback,
  type Ref,
  type RefObject,
  type ReactElement,
  type ReactNode,
} from "react";
import { scheduleIdle } from "@/lib/idle";

function isWritableRefObject<T>(
  ref: Ref<T> | undefined
): ref is RefObject<T | null> {
  if (ref == null || typeof ref === "function") return false;
  if (!("current" in ref)) return false;
  const desc = Object.getOwnPropertyDescriptor(ref, "current");
  if (desc === undefined) return true;
  if (desc.set !== undefined) return true;
  return desc.writable !== false;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (ref == null) return;
  if (typeof ref === "function") {
    ref(value);
  } else if (isWritableRefObject(ref)) {
    ref.current = value;
  }
}

function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): React.RefCallback<T> {
  return (value) => {
    for (const r of refs) assignRef(r, value);
  };
}

export interface DeferredMountProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Passed to IntersectionObserver; prefetch before the row enters the viewport. */
  rootMargin?: string;
  /** Upper bound (ms) for requestIdleCallback when used. */
  idleTimeout?: number;
  className?: string;
  /** React 19 ref-as-prop; forwarded to the wrapper div before mount and to the child after. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Mounts `children` after the host is near the viewport (IntersectionObserver) or
 * the main thread is idle (requestIdleCallback / setTimeout fallback), whichever
 * comes first, so heavy subtrees (e.g. TipTap) do not run in the same task as
 * form paint. Requires exactly one child element so refs can forward onto it.
 */
export function DeferredMount({
  children,
  fallback,
  rootMargin = "280px",
  idleTimeout = 1200,
  className,
  ref: forwardedRef,
}: DeferredMountProps) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  if (process.env.NODE_ENV !== "production" && Children.count(children) !== 1) {
    // Fail fast in dev: ref forwarding requires Children.only, and silent
    // fallback would lose the ref + defeat the mount-deferral purpose.
    throw new Error(
      `DeferredMount requires exactly one child element (got ${Children.count(children)}).`,
    );
  }

  const setWrapperRef = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (!mounted && node !== null) {
        assignRef(forwardedRef, node);
      }
    },
    [mounted, forwardedRef]
  );

  useEffect(() => {
    if (mounted) return;
    const el = rootRef.current;
    if (!el) return;

    let cancelled = false;
    const tryMount = () => {
      if (cancelled) return;
      setMounted(true);
    };

    const cancelIdle = scheduleIdle(tryMount, idleTimeout);

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) tryMount();
        },
        { root: null, rootMargin, threshold: 0 }
      );
      observer.observe(el);
    }

    return () => {
      cancelled = true;
      cancelIdle();
      observer?.disconnect();
    };
  }, [mounted, idleTimeout, rootMargin]);

  const renderedChild = (() => {
    if (!mounted) return fallback;
    if (!isValidElement(children)) return children;
    const only = children as ReactElement<Record<string, unknown>>;
    return cloneElement(only, {
      ref: mergeRefs(
        forwardedRef,
        (only as ReactElement & { ref?: Ref<unknown> }).ref,
      ),
    });
  })();

  return (
    <div ref={setWrapperRef} className={className} aria-busy={!mounted ? "true" : "false"}>
      {renderedChild}
    </div>
  );
}
