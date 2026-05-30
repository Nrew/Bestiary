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

export interface DeferredMountProps {
  children: ReactNode;
  fallback: ReactNode;
  /** Passed to IntersectionObserver; prefetch before the row enters the viewport. */
  rootMargin?: string;
  /** Upper bound (ms) for requestIdleCallback when used. */
  idleTimeout?: number;
  className?: string;
  /** React 19 ref-as-prop; forwarded to the child element once mounted. */
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

  const childRef = isValidElement(children)
    ? (children as ReactElement & { ref?: Ref<unknown> }).ref
    : undefined;
  const mergedChildRef = useCallback<React.RefCallback<unknown>>(
    (value) => {
      assignRef(forwardedRef, value);
      if (childRef) assignRef(childRef, value);
    },
    [forwardedRef, childRef]
  );

  const renderedChild = (() => {
    if (!mounted) return fallback;
    if (!isValidElement(children)) return children;
    const only = children as ReactElement<Record<string, unknown>>;
    return cloneElement(only, { ref: mergedChildRef });
  })();

  return (
    <div ref={rootRef} className={className} aria-busy={!mounted ? "true" : "false"}>
      {renderedChild}
    </div>
  );
}
