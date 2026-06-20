import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export default function SidebarSection({ title, description, action, children }: Props) {
  return (
    <section className="border-b border-neutral-200/80 px-5 py-5 last:border-b-0">
      <div className={`mb-4 ${action ? "flex items-start justify-between gap-3" : ""}`}>
        <div className="min-w-0">
          <h2 className="text-[14px] font-semibold text-text-base">{title}</h2>
          {description && (
            <p className="mt-1 text-[13px] leading-snug text-text-secondary">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
