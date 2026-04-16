import type { PhraseResponse } from "@english-phrase/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_ENDPOINT } from "@/constants";

async function fetchPhrase(signal: AbortSignal): Promise<PhraseResponse> {
  const res = await fetch(API_ENDPOINT, { method: "POST", signal });
  if (!res.ok) throw new Error("Failed to fetch phrase");
  return res.json() as Promise<PhraseResponse>;
}

export function usePhrase() {
  const [phrase, setPhrase] = useState<PhraseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    // 前回のリクエストが進行中であればキャンセルして競合を防ぐ
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setLoading(true);
    setError(null);
    try {
      let next = await fetchPhrase(signal);
      // 同じフレーズが返ってきた場合は再取得する
      if (prevIdRef.current !== null && next.id === prevIdRef.current) {
        next = await fetchPhrase(signal);
      }
      prevIdRef.current = next.id;
      setPhrase(next);
    } catch (err) {
      // AbortError は load() の再呼び出しによる意図的なキャンセルのため無視する
      if ((err as Error).name === "AbortError") return;
      setError("Failed to load phrase. Please try again.");
    } finally {
      // キャンセル済みのリクエストが loading を false に戻さないようにガードする
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { phrase, loading, error, load };
}
