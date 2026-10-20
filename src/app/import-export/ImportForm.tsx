"use client";

import { useRef, useState, type FormEvent } from "react";
import { importData } from "@/app/import-export/actions";
import { Button } from "@/components/Button";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    deckCount: number;
    cardCount: number;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Vui lòng chọn file JSON.");
      setResult(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File vượt quá 5MB. Hãy chọn file nhỏ hơn.");
      setResult(null);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await importData(formData);
      if (response.ok) {
        setResult({
          deckCount: response.deckCount,
          cardCount: response.cardCount,
        });
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setError(response.error);
      }
    } catch {
      setError("Không import được dữ liệu. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Chọn file JSON</span>
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept="application/json,.json"
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-600 hover:file:bg-indigo-100"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}

      {result && (
        <p role="status" className="text-sm text-emerald-600">
          Đã thêm {result.deckCount} deck và {result.cardCount} thẻ.
        </p>
      )}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang import..." : "Import"}
        </Button>
      </div>
    </form>
  );
}
