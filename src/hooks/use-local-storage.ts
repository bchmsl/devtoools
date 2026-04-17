import { useEffect, useState } from "react";

/**
 * Persisted state hook backed by localStorage.
 * SSR-safe: reads happen only after mount, so the initial render matches the server.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  // Read once on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // ignore corrupt values
    }
    setHydrated(true);
  }, [key]);

  // Persist on change (after hydration so we don't overwrite stored values with defaults)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota errors
    }
  }, [key, value, hydrated]);

  return [value, setValue] as const;
}
