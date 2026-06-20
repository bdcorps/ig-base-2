"use client";

import GenerationSidebar from "@/components/GenerationSidebar";
import { useGenerations } from "@/context/GenerationsContext";

export default function StudioShell({ children }: { children: React.ReactNode }) {
  const { generations } = useGenerations();

  return (
    <div className="flex h-screen overflow-hidden bg-white text-neutral-900">
      <GenerationSidebar generations={generations} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
