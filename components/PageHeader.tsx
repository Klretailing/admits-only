import type { ReactNode } from 'react';

/* Signature page header used across the app for a consistent, designed
   identity: accent eyebrow → display title → subtitle, with an action slot
   that stacks below on mobile, over a faint brand wash and a gradient
   hairline. One component so every page carries the same visual language. */

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative mb-6">
      {/* faint brand wash behind the header */}
      <div
        aria-hidden
        className="absolute -inset-x-4 -top-4 bottom-0 pointer-events-none rounded-2xl bg-gradient-to-br from-accent/[0.04] via-transparent to-transparent"
      />
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
            <span className="w-1 h-1 rounded-full bg-accent" />
            {eyebrow}
          </p>
          <h1 className="mt-1.5 text-2xl lg:text-[28px] font-bold font-display text-primary tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500 max-w-xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {/* gradient hairline */}
      <div className="relative mt-5 h-px bg-gradient-to-r from-accent/30 via-slate-200 to-transparent" />
    </div>
  );
}
