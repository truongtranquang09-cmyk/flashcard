"use client";

import { buttonClass } from "@/components/Button";
import {
  getSpeechText,
  speakJapanese,
  useJapaneseSpeechAvailable,
} from "@/lib/speech";

type SpeakButtonProps = {
  front: string;
  reading: string | null;
  className?: string;
};

export function SpeakButton({
  front,
  reading,
  className = "",
}: SpeakButtonProps) {
  const available = useJapaneseSpeechAvailable();

  if (!available) return null;

  return (
    <button
      type="button"
      onClick={() => speakJapanese(getSpeechText(front, reading))}
      aria-label="Nghe phát âm"
      title="Nghe phát âm"
      className={`${buttonClass("secondary")} px-2.5 py-1 text-xs ${className}`}
    >
      <span aria-hidden="true">🔊</span>
      <span>Nghe</span>
    </button>
  );
}
