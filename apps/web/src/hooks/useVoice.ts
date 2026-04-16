import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SPEECH_ENDPOINT } from "@/constants";

type VoiceState = "idle" | "loading" | "playing";

// phraseId をキーに Blob URL をメモリキャッシュする。
// ページ滞在中は同じフレーズの API 通信を1回に抑える。
const speechCache = new Map<number, string>();

// API から音声の Blob URL を取得する。キャッシュがあればそちらを返す。
// 取得した URL は revoke しないことでキャッシュを有効に保つ。
async function fetchSpeechUrl(
  phraseId: number,
  word: string,
  signal: AbortSignal
): Promise<string> {
  if (speechCache.has(phraseId)) {
    return speechCache.get(phraseId)!;
  }
  const res = await fetch(SPEECH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phraseId, text: word }),
    signal,
  });
  if (!res.ok) throw new Error("音声の取得に失敗しました");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  speechCache.set(phraseId, url);
  return url;
}

export function useVoice(phraseId: number, word: string) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // アンマウント時: フェッチ中断 & 再生停止
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const play = async () => {
    // 再生中・ロード中は二重実行しない
    if (voiceState !== "idle") return;
    setVoiceState("loading");

    const controller = new AbortController();
    abortRef.current = controller;

    let url: string;
    try {
      url = await fetchSpeechUrl(phraseId, word, controller.signal);
    } catch (err) {
      // アンマウント済み、または中断された場合は何もしない
      if (!mountedRef.current || (err instanceof Error && err.name === "AbortError")) return;
      setVoiceState("idle");
      toast.error("音声の取得に失敗しました");
      return;
    }

    // フェッチ完了後にアンマウントされていた場合は中断
    if (!mountedRef.current) return;

    const audio = new Audio(url);
    audioRef.current = audio;

    const onEnded = () => {
      audioRef.current = null;
      if (mountedRef.current) setVoiceState("idle");
    };
    const onError = () => {
      audioRef.current = null;
      if (mountedRef.current) {
        setVoiceState("idle");
        toast.error("音声の再生に失敗しました");
      }
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    setVoiceState("playing");
    audio.play().catch(() => {
      audioRef.current = null;
      if (mountedRef.current) {
        setVoiceState("idle");
        toast.error("音声の再生に失敗しました");
      }
    });
  };

  return { voiceState, play };
}
