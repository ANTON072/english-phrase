import { useCallback, useEffect, useRef, useState } from "react";
import { API_ENDPOINT } from "@/constants";
import type { Phrase } from "@/types";

async function fetchPhrase(): Promise<Phrase> {
  const res = await fetch(API_ENDPOINT, { method: "POST" });
  if (!res.ok) throw new Error("Failed to fetch phrase");
  return res.json() as Promise<Phrase>;
}

export function usePhrase() {
  const [phrase, setPhrase] = useState<Phrase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevIdRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let next = await fetchPhrase();
      if (prevIdRef.current !== null && next.id === prevIdRef.current) {
        next = await fetchPhrase();
      }
      prevIdRef.current = next.id;
      setPhrase(next);
    } catch {
      setError("Failed to load phrase. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { phrase, loading, error, load };
}
