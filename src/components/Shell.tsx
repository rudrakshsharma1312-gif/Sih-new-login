import { type ReactNode } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

export function Shell({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

export function PageHead({
  kicker,
  title,
  aside,
}: {
  kicker: string;
  title: string;
  aside?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ember">{kicker}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {aside ? (
        <span className="font-mono text-[11px] tracking-wider text-mist">{aside}</span>
      ) : null}
    </div>
  );
}
