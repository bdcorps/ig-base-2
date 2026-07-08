"use client";

import { LayoutGrid, LayoutTemplate, Settings, SquarePlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

interface RailItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  matches: (pathname: string) => boolean;
}

const ITEMS: RailItem[] = [
  {
    label: "Create",
    href: "/",
    matches: (p) => p === "/" || p.startsWith("/design/"),
    icon: SquarePlus,
  },
  {
    label: "Templates",
    href: "/templates",
    matches: (p) => p.startsWith("/templates"),
    icon: LayoutTemplate,
  },
  {
    label: "Designs",
    href: "/designs",
    matches: (p) => p.startsWith("/designs"),
    icon: LayoutGrid,
  },
  {
    label: "Settings",
    href: "/settings",
    matches: (p) => p.startsWith("/settings"),
    icon: Settings,
  },
];

export default function AppRail() {
  const pathname = usePathname();

  // While a design is open the workspace shows its own asset rail (images +
  // stickers) in place of the global nav rail.
  if (pathname.startsWith("/design/")) return null;

  return (
    <nav className="flex h-full w-[76px] shrink-0 flex-col items-center gap-1 border-r border-neutral-200/80 bg-white py-4">
      <Link href="/" className="mb-3 flex h-10 w-10 items-center justify-center" aria-label="Home">
        <Image src="/logo.svg" alt="Carousel Studio" width={28} height={28} className="shrink-0" />
      </Link>

      {ITEMS.map((item) => {
        const active = item.matches(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className="group flex w-full flex-col items-center gap-1 py-1.5"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${active
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 group-hover:bg-neutral-100 group-hover:text-neutral-900"
                }`}
            >
              <Icon className="h-[22px] w-[22px]" />
            </span>
            <span
              className={`text-[11px] leading-none transition-colors ${active ? "font-medium text-neutral-900" : "text-neutral-500 group-hover:text-neutral-900"
                }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
