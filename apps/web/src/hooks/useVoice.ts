import { useRef, useState } from "react";
import { SPEECH_ENDPOINT } from "@/constants";

type VoiceState = "idle" | "loading" | "playing";

async function fetchSpeechUrl(phraseId: number, word: string): Promise<string | null> {
  const res = await fetch(SPEECH_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phraseId, text: word }),
  });
  if (!res.ok) return null;
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function useVoice(phraseId: number, word: string) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = async () => {
    if (voiceState !== "idle") return;
    setVoiceState("loading");

    try {
      const url = await fetchSpeechUrl(phraseId, word);
      if (!url) {
        setVoiceState("idle");
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
      audio.addEventListener("error", cleanup);

      setVoiceState("playing");
      audio.play();
    } catch {
      setVoiceState("idle");
    }
  };

  return { voiceState, play };
}
