import { useEffect, useState } from "react";

/**
 * Returns a value that updates only after `delay` ms of no changes.
 * Useful for expensive computations triggered by fast-changing input.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
