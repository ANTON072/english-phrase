import { useRef, useState } from "react";
import { toast } from "sonner";
import { SPEECH_ENDPOINT } from "@/constants";

type VoiceState = "idle" | "loading" | "playing";

async function fetchSpeechUrl(phraseId: number, word: string): Promise<string> {
  const res = await fetch(SPEECH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phraseId, text: word }),
  });
  if (!res.ok) throw new Error("音声の取得に失敗しました");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function useVoice(phraseId: number, word: string) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = async () => {
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
      URL.revokeObjectURL(url);
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
