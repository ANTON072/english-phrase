import { useRef, useState } from "react";
import { toast } from "sonner";
import { SPEECH_ENDPOINT } from "@/constants";

type VoiceState = "idle" | "loading" | "playing";

// phraseId をキーに Blob URL をメモリキャッシュする。
// ページ滞在中は同じフレーズの API 通信を1回に抑える。
const speechCache = new Map<number, string>();

// API から音声の Blob URL を取得する。キャッシュがあればそちらを返す。
// 取得した URL は revoke しないことでキャッシュを有効に保つ。
async function fetchSpeechUrl(phraseId: number, word: string): Promise<string> {
  if (speechCache.has(phraseId)) {
    return speechCache.get(phraseId)!;
  }
  const res = await fetch(SPEECH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phraseId, text: word }),
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

  const play = async () => {
    // 再生中・ロード中は二重実行しない
    if (voiceState !== "idle") return;
    setVoiceState("loading");

    let url: string;
    try {
      url = await fetchSpeechUrl(phraseId, word);
    } catch {
      setVoiceState("idle");
      toast.error("音声の取得に失敗しました");
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    const cleanup = () => {
      audioRef.current = null;
      setVoiceState("idle");
    };
    audio.addEventListener("ended", cleanup);
    audio.addEventListener("error", () => {
      cleanup();
      toast.error("音声の再生に失敗しました");
    });

    setVoiceState("playing");
    audio.play().catch(() => {
      cleanup();
      toast.error("音声の再生に失敗しました");
    });
  };

  return { voiceState, play };
}
