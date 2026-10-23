"use client";

import { useEffect, useState } from "react";

export function getSpeechText(front: string, reading: string | null): string {
  const trimmedReading = reading?.trim();
  return trimmedReading ? trimmedReading : front;
}

export function isSpeechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function findJapaneseVoice(): SpeechSynthesisVoice | undefined {
  if (!isSpeechAvailable()) return undefined;

  return window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.toLowerCase().startsWith("ja"));
}

export function hasJapaneseVoice(): boolean {
  return findJapaneseVoice() !== undefined;
}

export function speakJapanese(text: string): void {
  if (!isSpeechAvailable()) return;

  const trimmed = text.trim();
  if (!trimmed) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(trimmed);
  utterance.lang = "ja-JP";
  utterance.rate = 0.9;

  const voice = findJapaneseVoice();
  if (voice) utterance.voice = voice;

  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechAvailable()) window.speechSynthesis.cancel();
}

export function useJapaneseSpeechAvailable(): boolean {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!isSpeechAvailable()) return;

    const synth = window.speechSynthesis;
    const update = () => setAvailable(hasJapaneseVoice());

    update();
    synth.addEventListener("voiceschanged", update);

    return () => synth.removeEventListener("voiceschanged", update);
  }, []);

  return available;
}
