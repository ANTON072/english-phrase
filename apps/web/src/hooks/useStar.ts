import { useEffect, useState } from "react";
import { toast } from "sonner";
import { STAR_ENDPOINT } from "@/constants";

export function useStar(phraseId: number, initialStarred: number) {
  const [starred, setStarred] = useState(initialStarred);

  useEffect(() => {
    setStarred(initialStarred);
  }, [phraseId, initialStarred]);

  const toggle = async () => {
    const next = starred === 1 ? 0 : 1;
    setStarred(next);
    try {
      const res = await fetch(STAR_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phraseId, starred: next === 1 }),
      });
      if (!res.ok) throw new Error("Failed to update star");
    } catch {
      setStarred(starred);
      toast.error("スターの更新に失敗しました");
    }
  };

  return { starred, toggle };
}
