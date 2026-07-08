"use client";

import AppRail from "@/components/AppRail";

export default function StudioShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-white text-neutral-900">
      <AppRail />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
