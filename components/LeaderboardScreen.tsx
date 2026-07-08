"use client";

import {
  formatViews,
  initials,
  LEADERBOARD_BOARDS,
  type LeaderboardEntry,
} from "@/lib/leaderboard";
import { Flame } from "lucide-react";
import { useMemo, useState } from "react";

function Avatar({ entry, size = 40 }: { entry: LeaderboardEntry; size?: number }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${entry.avatar}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(entry.name)}
    </span>
  );
}

function FlameIcon({ className }: { className?: string }) {
  return <Flame className={className} aria-hidden />;
}

function rankBadge(rank: number) {
  if (rank === 1) return { ring: "bg-neutral-900 text-white", label: "1" };
  if (rank === 2) return { ring: "bg-neutral-400 text-white", label: "2" };
  if (rank === 3) return { ring: "bg-neutral-300 text-neutral-700", label: "3" };
  return { ring: "bg-neutral-100 text-neutral-500", label: String(rank) };
}

export default function LeaderboardScreen() {
  const [activeId, setActiveId] = useState(LEADERBOARD_BOARDS[0].id);

  const board = useMemo(
    () => LEADERBOARD_BOARDS.find((b) => b.id === activeId) ?? LEADERBOARD_BOARDS[0],
    [activeId],
  );

  const podium = board.entries.slice(0, 3);
  const rest = board.entries.slice(3);
  const you = board.entries.find((e) => e.isYou);
  const yourRank = you ? board.entries.indexOf(you) + 1 : null;

  // Podium display order: 2nd, 1st, 3rd for the classic stage look.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);
  const podiumHeights: Record<number, string> = { 0: "h-20", 1: "h-28", 2: "h-16" };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-72"
      />
      <div className="relative z-10 mx-auto w-full max-w-3xl px-8 py-10">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Leaderboard</h1>
          <p className="mt-1 text-[14px] text-neutral-500">
            Post consistently, climb the ranks. Updated for {monthLabel()}.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-neutral-200">
          {LEADERBOARD_BOARDS.map((b) => {
            const active = b.id === activeId;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setActiveId(b.id)}
                className={`-mb-px cursor-pointer border-b-2 px-0.5 pb-3 text-[14px] font-medium transition-colors ${active
                    ? "border-neutral-900 text-neutral-900"
                    : "border-transparent text-neutral-400 hover:text-neutral-700"
                  }`}
              >
                {b.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[13px] text-neutral-500">{board.blurb}</p>

        {/* Your standing callout */}
        {you && yourRank ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <Avatar entry={you} size={44} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-neutral-900">
                You&apos;re #{yourRank} in {board.label}
              </p>
              <p className="text-[12px] text-neutral-500">
                {nextStepCopy(board.entries, yourRank)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-orange-500 ring-1 ring-neutral-200">
              <FlameIcon className="h-3.5 w-3.5" />
              {you.streak}d
            </div>
          </div>
        ) : null}

        {/* Podium */}
        <div className="mt-7 flex items-end justify-center gap-3">
          {podiumOrder.map((entry) => {
            const realRank = board.entries.indexOf(entry) + 1;
            const orderIdx = podiumOrder.indexOf(entry);
            const badge = rankBadge(realRank);
            return (
              <div key={entry.id} className="flex w-1/3 flex-col items-center">
                <div className="relative">
                  <Avatar entry={entry} size={realRank === 1 ? 64 : 52} />
                  <span
                    className={`absolute -bottom-1 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-white ${badge.ring}`}
                  >
                    {badge.label}
                  </span>
                </div>
                <p className="mt-3 max-w-full truncate text-center text-[13px] font-semibold text-neutral-900">
                  {entry.isYou ? "You" : entry.name}
                </p>
                <p className="text-[11px] text-neutral-400">{entry.carousels} carousels</p>
                <div
                  className={`mt-2 flex w-full ${podiumHeights[orderIdx]} items-start justify-center rounded-t-xl bg-linear-to-b ${realRank === 1
                      ? "from-neutral-200 to-neutral-50"
                      : "from-neutral-100 to-neutral-50"
                    } pt-2 text-[11px] font-semibold text-neutral-500`}
                >
                  {formatViews(entry.views)} views
                </div>
              </div>
            );
          })}
        </div>

        {/* Ranked list */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white">
          <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-neutral-100 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            <span>Rank</span>
            <span>Creator</span>
            <span className="text-right">Carousels · Streak</span>
          </div>
          <ul>
            {rest.map((entry) => {
              const realRank = board.entries.indexOf(entry) + 1;
              return (
                <li
                  key={entry.id}
                  className={`grid grid-cols-[40px_1fr_auto] items-center gap-3 px-4 py-3 transition-colors ${entry.isYou ? "bg-neutral-100" : "hover:bg-neutral-50"
                    }`}
                >
                  <span className="text-[14px] font-semibold tabular-nums text-neutral-400">
                    {realRank}
                  </span>
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar entry={entry} />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-neutral-900">
                        {entry.isYou ? "You" : entry.name}
                        {entry.isYou ? (
                          <span className="ml-2 rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            you
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[12px] text-neutral-400">{entry.handle}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-4 text-right">
                    <span className="text-[14px] font-semibold tabular-nums text-neutral-900">
                      {entry.carousels}
                    </span>
                    <span className="flex w-12 items-center justify-end gap-1 text-[13px] font-medium tabular-nums text-orange-500">
                      <FlameIcon className="h-3.5 w-3.5" />
                      {entry.streak}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="mt-4 text-center text-[12px] text-neutral-400">
          Rankings reset on the 1st. Carousels are the tiebreaker, streaks break ties.
        </p>
      </div>
    </div>
  );
}

function monthLabel(): string {
  return new Date().toLocaleString("en-US", { month: "long" });
}

function nextStepCopy(entries: LeaderboardEntry[], yourRank: number): string {
  if (yourRank === 1) return "You're on top. Keep posting to defend your streak.";
  const ahead = entries[yourRank - 2];
  const gap = ahead.carousels - entries[yourRank - 1].carousels + 1;
  return `${gap} more carousel${gap === 1 ? "" : "s"} to pass ${ahead.isYou ? "the next spot" : ahead.name}.`;
}
