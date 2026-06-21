"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export default function FeedbackModal({ open, onClose, onSubmit }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  if (!open) return null;

  const displayRating = hoveredRating ?? rating;

  async function handleSubmit() {
    if (!rating) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Close feedback"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        >
          <CloseIcon />
        </button>

        <p className="pr-8 text-[15px] leading-relaxed text-neutral-800">
          Hiya — I&apos;m Carousel Studio. I&apos;m trying to get better at making carousels, can
          you let me know why you did/didn&apos;t like this one?
        </p>

        <div className="mt-5">
          <p className="mb-2 text-[13px] font-medium text-neutral-600">Rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`Rate ${value} out of 5`}
                onClick={() => setRating(value)}
                onMouseEnter={() => setHoveredRating(value)}
                onMouseLeave={() => setHoveredRating(null)}
                className="rounded-md p-1 transition-transform hover:scale-110"
              >
                <StarIcon filled={displayRating != null && value <= displayRating} />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="feedback-comment" className="mb-2 block text-[13px] font-medium text-neutral-600">
            Comments (optional)
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            placeholder="What worked well or what could be better?"
            className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-[14px] text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-700"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      className={filled ? "text-amber-400" : "text-neutral-300"}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
