import { useCallback, useState } from "react";

const cache = new Map<string, unknown>();

export function peekCache<T>(key: string): T | undefined {
  if (!cache.has(key)) return undefined;
  return cache.get(key) as T;
}

export function putCache<T>(key: string, value: T): T {
  cache.set(key, value);
  return value;
}

export function hasCache(key: string): boolean {
  return cache.has(key);
}

/** Keep the last successful payload so a revisit paints immediately while a refetch runs. */
export function useCachedState<T>(key: string, fallback: T): [T, (value: T) => void, boolean] {
  const [state, setState] = useState<T>(() => peekCache<T>(key) ?? fallback);
  const [seenKey, setSeenKey] = useState(key);

  if (key !== seenKey) {
    setSeenKey(key);
    setState(peekCache<T>(key) ?? fallback);
  }

  const set = useCallback(
    (value: T) => {
      putCache(key, value);
      setState(value);
    },
    [key],
  );

  return [state, set, cache.has(key)];
}
