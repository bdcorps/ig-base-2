"use client";

import {
  formatRelativeTime,
  generationTitle,
  type Generation
} from "@/lib/generations";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  generations: Generation[];
}

export default function GenerationSidebar({ generations }: Props) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/design/") ? pathname.split("/")[2] : null;

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-neutral-200/80">
      <div className="flex items-center justify-start border-neutral-200/80 px-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-neutral-900"
        >
          <Image src="/logo.svg" alt="" width={24} height={24} className="shrink-0" aria-hidden />
          Carousel Studio
        </Link>
      </div>

      <div className="p-2">
        <Link
          href="/"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          <svg
            className="h-4 w-4 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Design
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 border-t border-neutral-200/80">
        <p className="px-2 pb-1 text-[13px] leading-relaxed text-neutral-500">RECENTS</p>
        {generations.length === 0 ? (
          <p className="px-2 py-4 text-[13px] leading-relaxed text-neutral-400">
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {generations.map((gen) => {
              const selected = gen.id === activeId;
              return (
                <li key={gen.id}>
                  <Link
                    href={`/design/${gen.id}`}
                    className={`group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${selected
                      ? "bg-white"
                      : "hover:bg-neutral-100/80"
                      }`}
                  >
                    {/* <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${gen.status === "running" ? "animate-pulse" : ""
                        }`}
                      style={{ backgroundColor: statusDotColor(gen.status) }}
                      aria-hidden
                    /> */}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13px] leading-snug ${selected ? "font-medium text-neutral-900" : "text-neutral-700"
                          }`}
                      >
                        {generationTitle(gen.prompt)}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-neutral-400">
                        {gen.status === "running"
                          ? "Designing…"
                          : gen.status === "error"
                            ? "Failed"
                            : gen.status === "complete"
                              ? `${gen.slides.length} slide${gen.slides.length === 1 ? "" : "s"}`
                              : "Queued"}{" "}
                        | {formatRelativeTime(gen.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* <div className="border-t border-neutral-200/80 px-4 py-3">
        <nav className="flex flex-col gap-1 text-[13px]">
          <Link
            href="/templates"
            className="rounded-md px-2 py-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            Templates
          </Link>
          <Link
            href="/kanban"
            className="rounded-md px-2 py-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
          >
            Kanban board
          </Link>
        </nav>
      </div> */}
    </aside>
  );
}
