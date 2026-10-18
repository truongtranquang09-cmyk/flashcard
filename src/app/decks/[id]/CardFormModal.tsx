"use client";

import { useState, type FormEvent } from "react";
import { createCard, updateCard } from "@/app/decks/[id]/actions";
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

  function handleOpen() {
    setError(null);
    setOpen(true);
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
            <Input
              label="Từ / kanji (mặt trước)"
              name="front"
              defaultValue={card?.front}
              className="font-jp"
              maxLength={100}
              required
            />
            <Input
              label="Cách đọc (hiragana)"
              name="reading"
              defaultValue={card?.reading ?? ""}
              className="font-jp"
              maxLength={200}
            />
            <Input
              label="Nghĩa tiếng Việt"
              name="back"
              defaultValue={card?.back}
              maxLength={300}
              required
            />
            <Textarea
              label="Câu ví dụ (tiếng Nhật)"
              name="example"
              defaultValue={card?.example ?? ""}
              className="font-jp"
            />
            <Textarea
              label="Nghĩa câu ví dụ"
              name="exampleVi"
              defaultValue={card?.exampleVi ?? ""}
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
