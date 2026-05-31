import { useEffect, useRef, type RefObject } from "react";

/** Mirrors `value` into a ref so long-lived closures see the latest value. */
export function useLatestRef<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
