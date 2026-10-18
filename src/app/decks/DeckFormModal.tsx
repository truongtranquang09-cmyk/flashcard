"use client";

import { useState, type FormEvent } from "react";
import { createDeck, updateDeck } from "@/app/decks/actions";
import { Button, buttonClass } from "@/components/Button";
import { Input } from "@/components/Input";
import { Modal } from "@/components/Modal";

type DeckFormModalProps = {
  deck?: { id: string; name: string };
};

export function DeckFormModal({ deck }: DeckFormModalProps) {
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
    const result = deck ? await updateDeck(formData) : await createDeck(formData);
    setPending(false);

    if (result.ok) setOpen(false);
    else setError(result.error);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={buttonClass(deck ? "secondary" : "primary")}
      >
        {deck ? "Sửa" : "+ Deck mới"}
      </button>

      {open && (
        <Modal
          title={deck ? "Sửa deck" : "Deck mới"}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {deck && <input type="hidden" name="id" value={deck.id} />}
            <Input
              label="Tên deck"
              name="name"
              defaultValue={deck?.name}
              maxLength={100}
              required
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
