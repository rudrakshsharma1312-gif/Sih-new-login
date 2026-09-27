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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-faint">{kicker}</p>
        <h1 className="mt-0.5 font-display text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      {aside ? (
        <span className="font-mono text-[10px] text-faint">{aside}</span>
      ) : null}
    </div>
  );
}
