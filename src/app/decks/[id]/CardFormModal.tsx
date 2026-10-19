"use client";

import { useState, type FormEvent } from "react";
import {
  createCard,
  generateCardFromWord,
  updateCard,
} from "@/app/decks/[id]/actions";
import { Button, buttonClass } from "@/components/Button";
import { Input, Textarea } from "@/components/Input";
import { Modal } from "@/components/Modal";

type CardValues = {
  id: string;
  front: string;
  reading: string | null;
  back: string;
  example: string | null;
  exampleVi: string | null;
};

type CardFormModalProps = {
  deckId: string;
  card?: CardValues;
};

export function CardFormModal({ deckId, card }: CardFormModalProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [front, setFront] = useState("");
  const [reading, setReading] = useState("");
  const [back, setBack] = useState("");
  const [example, setExample] = useState("");
  const [exampleVi, setExampleVi] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function handleOpen() {
    setError(null);
    setAiError(null);
    setFront(card?.front ?? "");
    setReading(card?.reading ?? "");
    setBack(card?.back ?? "");
    setExample(card?.example ?? "");
    setExampleVi(card?.exampleVi ?? "");
    setOpen(true);
  }

  async function handleGenerate() {
    const word = front.trim();
    setAiError(null);

    if (!word) {
      setAiError("Nhập từ cần tạo trước.");
      return;
    }

    setAiPending(true);
    const result = await generateCardFromWord(word);
    setAiPending(false);

    if (!result.ok) {
      setAiError(result.error);
      return;
    }

    setReading(result.card.reading);
    setBack(result.card.meaningVi);
    setExample(result.card.example);
    setExampleVi(result.card.exampleVi);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setPending(true);
    setError(null);
    const result = card ? await updateCard(formData) : await createCard(formData);
    setPending(false);

    if (result.ok) setOpen(false);
    else setError(result.error);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={buttonClass(card ? "secondary" : "primary")}
      >
        {card ? "Sửa" : "+ Thêm thẻ"}
      </button>

      {open && (
        <Modal
          title={card ? "Sửa thẻ" : "Thêm thẻ"}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input type="hidden" name="deckId" value={deckId} />
            {card && <input type="hidden" name="id" value={card.id} />}
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  label="Từ / kanji (mặt trước)"
                  name="front"
                  value={front}
                  onChange={(event) => setFront(event.target.value)}
                  className="font-jp"
                  maxLength={100}
                  required
                />
              </div>
              {!card && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGenerate}
                  disabled={aiPending || pending}
                  className="shrink-0 whitespace-nowrap"
                >
                  {aiPending ? "Đang tạo..." : "✨ Tạo bằng AI"}
                </Button>
              )}
            </div>
            {aiError && <p className="text-sm text-rose-600">{aiError}</p>}
            <Input
              label="Cách đọc (hiragana)"
              name="reading"
              value={reading}
              onChange={(event) => setReading(event.target.value)}
              className="font-jp"
              maxLength={200}
            />
            <Input
              label="Nghĩa tiếng Việt"
              name="back"
              value={back}
              onChange={(event) => setBack(event.target.value)}
              maxLength={300}
              required
            />
            <Textarea
              label="Câu ví dụ (tiếng Nhật)"
              name="example"
              value={example}
              onChange={(event) => setExample(event.target.value)}
              className="font-jp"
            />
            <Textarea
              label="Nghĩa câu ví dụ"
              name="exampleVi"
              value={exampleVi}
              onChange={(event) => setExampleVi(event.target.value)}
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
