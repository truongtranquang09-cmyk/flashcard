"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import type { ActionResult } from "@/lib/action-result";

type DeleteButtonProps = {
  action: () => Promise<ActionResult>;
  confirmMessage: string;
  label?: string;
};

export function DeleteButton({
  action,
  confirmMessage,
  label = "Xóa",
}: DeleteButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;

    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);

    if (!result.ok) setError(result.error);
  }

  return (
    <span className="inline-flex flex-col items-start">
      <Button
        type="button"
        variant="danger"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? "Đang xóa..." : label}
      </Button>
      {error && <span className="mt-1 text-xs text-rose-600">{error}</span>}
    </span>
  );
}
