"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type StudyButtonProps = {
  deckId: string;
  className?: string;
  children: ReactNode;
};

export function StudyButton({
  deckId,
  className = "",
  children,
}: StudyButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        const session = crypto.randomUUID();
        router.push(`/decks/${deckId}/study?session=${session}`);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
