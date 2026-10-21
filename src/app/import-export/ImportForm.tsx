"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  importData,
  importExcel,
  type ImportResult,
} from "@/app/import-export/actions";
import { Button, type ButtonVariant } from "@/components/Button";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 20 * 1024 * 1024;

export type ImportFormat = "json" | "excel";

type FormatConfig = {
  label: string;
  accept: string;
  extension: string;
  emptyError: string;
  submitLabel: string;
  buttonVariant: ButtonVariant;
  fileInputClass: string;
  importAction: (formData: FormData) => Promise<ImportResult>;
};

const FORMATS: Record<ImportFormat, FormatConfig> = {
  json: {
    label: "Chọn file JSON",
    accept: "application/json,.json",
    extension: ".json",
    emptyError: "Vui lòng chọn file JSON.",
    submitLabel: "Import JSON",
    buttonVariant: "primary",
    fileInputClass:
      "file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100",
    importAction: importData,
  },
  excel: {
    label: "Chọn file Excel (.xlsx)",
    accept:
      ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: ".xlsx",
    emptyError: "Vui lòng chọn file Excel (.xlsx).",
    submitLabel: "Import Excel",
    buttonVariant: "excel",
    fileInputClass:
      "file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100",
    importAction: importExcel,
  },
};

function validateFiles(files: File[], config: FormatConfig): string | null {
  if (files.length === 0) return config.emptyError;

  let totalSize = 0;

  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(config.extension)) {
      return `File "${file.name}" không đúng định dạng ${config.extension}.`;
    }

    if (file.size === 0) return `File "${file.name}" rỗng.`;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" vượt quá 5MB.`;
    }

    totalSize += file.size;
  }

  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return "Tổng dung lượng các file vượt quá 20MB.";
  }

  return null;
}

type ImportFormProps = {
  format: ImportFormat;
};

export function ImportForm({ format }: ImportFormProps) {
  const config = FORMATS[format];
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    deckCount: number;
    cardCount: number;
    fileCount: number;
  } | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedCount(event.target.files?.length ?? 0);
    setError(null);
    setResult(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const files = Array.from(inputRef.current?.files ?? []);
    const validationError = validateFiles(files, config);
    if (validationError) {
      setError(validationError);
      setResult(null);
      return;
    }

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await config.importAction(formData);
      if (response.ok) {
        setResult({
          deckCount: response.deckCount,
          cardCount: response.cardCount,
          fileCount: response.fileCount,
        });
        if (inputRef.current) inputRef.current.value = "";
        setSelectedCount(0);
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
        <span className="font-medium text-slate-700">{config.label}</span>
        <input
          ref={inputRef}
          type="file"
          name="files"
          multiple
          accept={config.accept}
          onChange={handleChange}
          className={`w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-medium ${config.fileInputClass}`}
        />
      </label>

      {selectedCount > 0 && (
        <p className="text-xs text-slate-500">Đã chọn {selectedCount} file.</p>
      )}

      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}

      {result && (
        <p role="status" className="text-sm text-emerald-600">
          Đã thêm {result.deckCount} deck và {result.cardCount} thẻ từ{" "}
          {result.fileCount} file.
        </p>
      )}

      <div>
        <Button
          type="submit"
          variant={config.buttonVariant}
          disabled={pending}
        >
          {pending ? "Đang import..." : config.submitLabel}
        </Button>
      </div>
    </form>
  );
}
