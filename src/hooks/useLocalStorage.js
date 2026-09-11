import { useCallback, useEffect, useRef, useState } from 'react';

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — ignore */
  }
}

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    const stored = loadJSON(key, undefined);
    if (stored !== undefined) return stored;
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    saveJSON(keyRef.current, value);
  }, [value]);

  const reset = useCallback(
    (next) => {
      setValue(next);
    },
    []
  );

  return [value, setValue, reset];
}
