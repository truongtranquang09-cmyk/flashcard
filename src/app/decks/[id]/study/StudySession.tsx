"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { submitReview } from "@/app/decks/[id]/study/actions";
import { buttonClass } from "@/components/Button";
import { SpeakButton } from "@/components/SpeakButton";
import { previewIntervalDays, type Sm2State } from "@/lib/sm2";
import {
  getSpeechText,
  speakJapanese,
  stopSpeaking,
  useJapaneseSpeechAvailable,
} from "@/lib/speech";

export type StudyCard = Sm2State & {
  id: string;
  front: string;
  reading: string | null;
  back: string;
  example: string | null;
  exampleVi: string | null;
};

type StudySessionProps = {
  deckId: string;
  cards: StudyCard[];
};

type StudyDirection = "ja-vi" | "vi-ja";

const DIRECTION_LABELS: Record<StudyDirection, string> = {
  "ja-vi": "Nhật → Việt",
  "vi-ja": "Việt → Nhật",
};

const RATINGS = [
  {
    quality: 0,
    key: "1",
    label: "Quên",
    className:
      "bg-rose-600 text-white hover:bg-rose-700 focus-visible:outline-rose-600",
  },
  {
    quality: 3,
    key: "2",
    label: "Khó",
    className:
      "bg-amber-500 text-white hover:bg-amber-600 focus-visible:outline-amber-500",
  },
  {
    quality: 4,
    key: "3",
    label: "Tốt",
    className:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-indigo-600",
  },
  {
    quality: 5,
    key: "4",
    label: "Dễ",
    className:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-emerald-600",
  },
] as const;

export function StudySession({ deckId, cards }: StudySessionProps) {
  const [queue] = useState<StudyCard[]>(cards);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [pending, setPending] = useState(false);
  const [direction, setDirection] = useState<StudyDirection>("ja-vi");
  const [hintShown, setHintShown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const card = queue[index];
  const finished = index >= queue.length;
  const reversed = direction === "vi-ja";
  const hasReading = Boolean(card?.reading?.trim());
  const canShowHint = !reversed && !revealed && !hintShown && hasReading;
  const speechAvailable = useJapaneseSpeechAvailable();
  const showSpeak = speechAvailable && (revealed || !reversed);
  const speechText = card ? getSpeechText(card.front, card.reading) : "";

  const flipCard = useCallback(() => {
    setRevealed((current) => !current);
    setHasRevealed(true);
  }, []);

  const toggleDirection = useCallback(() => {
    stopSpeaking();
    setDirection((current) => (current === "ja-vi" ? "vi-ja" : "ja-vi"));
    setRevealed(false);
    setHasRevealed(false);
    setHintShown(false);
  }, []);

  const rate = useCallback(
    async (quality: number) => {
      if (!card || !hasRevealed || inFlight.current) return;

      inFlight.current = true;
      setPending(true);
      setError(null);

      const result = await submitReview(card.id, quality);

      inFlight.current = false;
      setPending(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      stopSpeaking();
      setIndex((current) => current + 1);
      setRevealed(false);
      setHasRevealed(false);
      setHintShown(false);
    },
    [card, hasRevealed],
  );

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (finished) return;

      if (event.key === " ") {
        event.preventDefault();
        flipCard();
        return;
      }

      if ((event.key === "h" || event.key === "H") && canShowHint) {
        event.preventDefault();
        setHintShown(true);
        return;
      }

      if ((event.key === "p" || event.key === "P") && showSpeak) {
        event.preventDefault();
        speakJapanese(speechText);
        return;
      }

      if (!hasRevealed || pending) return;
      const rating = RATINGS.find((item) => item.key === event.key);
      if (rating) {
        event.preventDefault();
        void rate(rating.quality);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    finished,
    hasRevealed,
    pending,
    rate,
    flipCard,
    canShowHint,
    showSpeak,
    speechText,
  ]);

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-600">
          Không có thẻ đến hạn hôm nay. Hãy quay lại sau nhé!
        </p>
        <Link
          href={`/decks/${deckId}`}
          prefetch={false}
          className={`${buttonClass()} mt-4`}
        >
          Quay lại deck
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex flex-col gap-4">
        <ProgressHeader
          reviewed={index}
          total={queue.length}
          showExit={false}
          deckId={deckId}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-lg font-semibold text-slate-800">
            Đã học xong {queue.length} thẻ!
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Các thẻ vừa ôn sẽ quay lại khi đến hạn.
          </p>
          <Link
            href={`/decks/${deckId}`}
            prefetch={false}
            className={`${buttonClass()} mt-4`}
          >
            Quay lại deck
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ProgressHeader
        reviewed={index}
        total={queue.length}
        showExit
        deckId={deckId}
        direction={direction}
        onToggleDirection={toggleDirection}
      />

      <div className="relative [perspective:1200px]">
        <button
          type="button"
          aria-label={revealed ? "Lật về mặt trước" : "Lật sang mặt sau"}
          onClick={flipCard}
          className={`relative block aspect-[3/2] w-full rounded-2xl border border-slate-200 bg-white shadow-sm transition-transform duration-[400ms] [transform-style:preserve-3d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
            revealed ? "[transform:rotateY(180deg)]" : ""
          }`}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-2xl bg-white p-6 [backface-visibility:hidden]">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Mặt trước
            </p>
            {reversed ? (
              <p className="mt-4 max-w-full whitespace-pre-line break-words text-center text-3xl font-semibold leading-snug text-slate-800 sm:text-4xl">
                {card.back}
              </p>
            ) : (
              <p className="font-jp mt-4 text-center text-5xl font-semibold text-slate-800 sm:text-6xl">
                {hintShown && hasReading ? (
                  <ruby>
                    {card.front}
                    <rt className="text-sm font-normal text-slate-500">
                      {card.reading}
                    </rt>
                  </ruby>
                ) : (
                  card.front
                )}
              </p>
            )}
            <p className="mt-6 text-sm text-slate-400">
              Bấm vào thẻ hoặc nhấn Space để lật
            </p>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-2xl bg-white p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            {reversed ? (
              <p className="font-jp max-w-full text-center text-4xl font-semibold text-slate-800 sm:text-5xl">
                {card.reading?.trim() ? (
                  <ruby>
                    {card.front}
                    <rt className="text-sm font-normal text-slate-500">
                      {card.reading}
                    </rt>
                  </ruby>
                ) : (
                  card.front
                )}
              </p>
            ) : (
              <>
                <p className="font-jp text-center text-3xl font-semibold text-slate-800">
                  {card.reading?.trim() ? (
                    <ruby>
                      {card.front}
                      <rt className="text-sm font-normal text-slate-500">
                        {card.reading}
                      </rt>
                    </ruby>
                  ) : (
                    card.front
                  )}
                </p>
                <p className="mt-3 text-center text-lg text-slate-700">
                  {card.back}
                </p>
              </>
            )}
            {card.example && (
              <div className="mt-4 w-full border-t border-slate-200 pt-4 text-center">
                <p className="font-jp text-base text-slate-700">
                  {card.example}
                </p>
                {card.exampleVi && (
                  <p className="mt-1 text-sm text-slate-500">{card.exampleVi}</p>
                )}
              </div>
            )}
          </div>
        </button>
        {showSpeak && (
          <SpeakButton
            front={card.front}
            reading={card.reading}
            className="absolute right-3 top-3 z-10 shadow-sm"
          />
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}

      {!revealed && (
        <div className="flex flex-wrap justify-center gap-2">
          {canShowHint && (
            <button
              type="button"
              onClick={() => setHintShown(true)}
              title="Nhấn phím H"
              className={buttonClass("secondary")}
            >
              Gợi ý cách đọc
            </button>
          )}
          <button
            type="button"
            onClick={flipCard}
            className={buttonClass("primary")}
          >
            Lật thẻ
          </button>
        </div>
      )}

      {hasRevealed && (
        <div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {RATINGS.map((rating) => {
              const days = previewIntervalDays(card, rating.quality);
              return (
                <button
                  key={rating.quality}
                  type="button"
                  onClick={() => void rate(rating.quality)}
                  disabled={pending}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${rating.className}`}
                >
                  <span>{rating.label}</span>
                  <span className="text-xs font-normal opacity-80">
                    sau {days} ngày
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            Phím tắt: 1 Quên · 2 Khó · 3 Tốt · 4 Dễ
          </p>
        </div>
      )}
    </div>
  );
}

type ProgressHeaderProps = {
  reviewed: number;
  total: number;
  showExit: boolean;
  deckId: string;
  direction?: StudyDirection;
  onToggleDirection?: () => void;
};

function ProgressHeader({
  reviewed,
  total,
  showExit,
  deckId,
  direction = "ja-vi",
  onToggleDirection,
}: ProgressHeaderProps) {
  const progress = Math.round((reviewed / total) * 100);
  const nextDirection: StudyDirection = direction === "ja-vi" ? "vi-ja" : "ja-vi";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Đã học {reviewed} / {total}
        </p>
        {showExit && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleDirection}
              aria-label={`Chiều đang học: ${DIRECTION_LABELS[direction]}. Bấm để đổi sang ${DIRECTION_LABELS[nextDirection]}`}
              title={`Đổi sang ${DIRECTION_LABELS[nextDirection]}`}
              className={buttonClass("secondary")}
            >
              <span className="text-slate-500">Chiều:</span>
              <span className="font-semibold text-indigo-600">
                {DIRECTION_LABELS[direction]}
              </span>
            </button>
            <Link
              href={`/decks/${deckId}`}
              prefetch={false}
              className={buttonClass("secondary")}
            >
              Thoát
            </Link>
          </div>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={reviewed}
        aria-label="Tiến độ học"
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </>
  );
}
