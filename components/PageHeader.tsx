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
  icon,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Optional glyph rendered in an accent tile to the left of the title. */
  icon?: ReactNode;
}) {
  return (
    <div className="relative mb-6">
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3.5">
          {/* Icons arrive as text-white for the old purple tile; the tile is paper
              now, so [&_svg]:!text-ink forces them to ink whatever their colour. */}
          {icon && (
            <span className="mt-1 w-11 h-11 rounded-xl border-[1.5px] border-ink text-ink bg-card flex items-center justify-center flex-shrink-0 shadow-md [&_svg]:!text-ink">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            {/* The eyebrow is a margin note in pencil, not a tracked label. */}
            <p className="note text-[19px] text-slate-600 -ml-0.5">{eyebrow}</p>
            <h1 className="mt-0.5 text-2xl lg:text-[28px] font-bold font-display text-primary tracking-tight leading-tight">
              {title}
            </h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500 max-w-xl">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {/* gradient hairline */}
      <div className="relative mt-5 border-t-[1.5px] border-dashed border-slate-300" />
    </div>
  );
}
