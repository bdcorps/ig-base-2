"use client";

import SlideRenderer from "@/components/SlideRenderer";
import { type Generation } from "@/lib/generations";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import * as motion from "motion/react-client";
import { useEffect, useRef, useState } from "react";

interface Props {
  generation: Generation;
  onOpen: () => void;
  onDelete: () => void;
}

export default function GenerationPreviewCard({ generation, onOpen, onDelete }: Props) {
  const firstSlide = generation.slides[0];
  const isBusy = generation.status === "pending" || generation.status === "running";
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function copyPrompt() {
    await navigator.clipboard.writeText(generation.prompt);
    setCopied(true);
    setMenuOpen(false);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function confirmDelete() {
    onDelete();
    setDeleteOpen(false);
  }

  return (
    <motion.div
      ref={ref}
      initial="rest"
      whileHover="hover"
      animate="rest"
      className="group relative aspect-1080/1350 w-full cursor-pointer overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-200 transition hover:ring-neutral-300"
    >
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-0 cursor-pointer"
        aria-label="Open generation"
      />
      {firstSlide && width > 0 ? (
        <motion.div
          className="pointer-events-none h-full w-full"
          variants={{ rest: { scale: 1 }, hover: { scale: 1.04 } }}
          transition={{ duration: 0.1, ease: "easeIn" }}
        >
          <SlideRenderer
            design={firstSlide.design}
            theme={firstSlide.theme}
            displayWidth={width}
          />
        </motion.div>
      ) : (
        <div className="pointer-events-none flex h-full w-full items-center justify-center">
          {isBusy ? (
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
          ) : null}
        </div>
      )}

      <div className="absolute right-2 top-2 z-10">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((open) => !open);
          }}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/90 text-neutral-700 opacity-0 shadow-sm ring-1 ring-black/10 backdrop-blur transition hover:bg-white hover:text-neutral-950 group-hover:opacity-100 focus:opacity-100"
          aria-label="Generation actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-pointer"
              aria-label="Close generation actions"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen(false);
              }}
            />
            <div
              role="menu"
              onClick={(event) => event.stopPropagation()}
              className="absolute right-0 top-full z-20 mt-1 min-w-[150px] rounded-lg border border-neutral-200 bg-white py-1 shadow-sm"
            >
              <button
                type="button"
                role="menuitem"
                onClick={copyPrompt}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[13px] text-primary hover:bg-neutral-50"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy prompt"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-[13px] text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {deleteOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`delete-generation-title-${generation.id}`}
          aria-describedby={`delete-generation-description-${generation.id}`}
          onClick={(event) => event.stopPropagation()}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2
              id={`delete-generation-title-${generation.id}`}
              className="text-base font-semibold text-neutral-950"
            >
              Delete generation?
            </h2>
            <p
              id={`delete-generation-description-${generation.id}`}
              className="mt-2 text-sm leading-5 text-neutral-600"
            >
              This will remove this carousel from your recent generations.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="cursor-pointer rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
