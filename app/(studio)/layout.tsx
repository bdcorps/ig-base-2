"use client";

import StudioShell from "@/components/StudioShell";
import { GenerationsProvider } from "@/context/GenerationsContext";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <GenerationsProvider>
      <StudioShell>{children}</StudioShell>
    </GenerationsProvider>
  );
}
