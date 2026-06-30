"use client";

import SignInModal from "@/components/SignInModal";
import { signOut, useSession } from "@/lib/auth-client";
import {
  formatRelativeTime,
  generationTitle,
  type Generation
} from "@/lib/generations";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface Props {
  generations: Generation[];
}

export default function GenerationSidebar({ generations }: Props) {
  const pathname = usePathname();
  const activeId = pathname.startsWith("/design/") ? pathname.split("/")[2] : null;
  const { data: session, isPending } = useSession();
  const [signInOpen, setSignInOpen] = useState(false);

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
          New Carousel
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

      <div className="px-2">
        <Link
          href="/leaderboard"
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
            pathname === "/leaderboard"
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          <svg
            className="h-4 w-4 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 11V3H8v8M5 21h14M9 21V11H4v10M20 21V7h-5v14"
            />
          </svg>
          Leaderboard
        </Link>
      </div>

      <div className="px-2 pb-1">
        <Link
          href="/settings"
          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
            pathname === "/settings"
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          <svg
            className="h-4 w-4 text-neutral-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </Link>
      </div>

      <div className="border-t border-neutral-200/80 px-3 py-3">
        {isPending ? (
          <div className="h-9 w-full animate-pulse rounded-lg bg-neutral-100" />
        ) : session?.user ? (
          <div className="flex items-center gap-2.5">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={28}
                height={28}
                className="shrink-0 rounded-full"
                aria-hidden
              />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[12px] font-medium text-neutral-600">
                {(session.user.name || session.user.email || "?").charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-neutral-800">
                {session.user.name || session.user.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="shrink-0 rounded-md px-2 py-1 text-[12px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-800"
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSignInOpen(true)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-[13px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Sign in
          </button>
        )}
      </div>

      <SignInModal
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        callbackURL={pathname}
      />
    </aside>
  );
}
