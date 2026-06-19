"use client";

import Link from "next/link";

export default function TopNav() {
  return (
    <header className="border-b border-neutral-200/80 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-8 py-4">
        <div className="flex items-center gap-8">
          <Link href="/templates" className="text-lg font-bold tracking-tight text-neutral-900">
            Carousel Studio
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink href="/templates" active>
              Templates
            </NavLink>
            <NavLink href="/">Editor</NavLink>
            <NavLink href="/kanban">AI Studio</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#B4A2D7] px-5 py-2.5 text-sm font-semibold text-neutral-900 transition-opacity hover:opacity-90"
          >
            + Create
          </Link>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-neutral-100 text-neutral-900"
          : "text-[#8E8E93] hover:bg-neutral-50 hover:text-neutral-800"
      }`}
    >
      {children}
    </Link>
  );
}
