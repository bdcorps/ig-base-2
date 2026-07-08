import AppRail from "@/components/AppRail";

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white text-neutral-900">
      <AppRail />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
