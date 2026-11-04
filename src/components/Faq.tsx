'use client';

import { useState } from 'react';

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q}>
            <h3>
              <button aria-expanded={isOpen} aria-controls={`faq-${i}`} id={`faq-h-${i}`} onClick={() => setOpen(isOpen ? null : i)}
                className="flex min-h-[56px] w-full items-center justify-between gap-4 px-5 py-3 text-left font-semibold hover:bg-cobalt/5">
                {it.q}
                <span aria-hidden className={`text-link transition-transform ${isOpen ? 'rotate-45' : ''}`}>＋</span>
              </button>
            </h3>
            <div id={`faq-${i}`} role="region" aria-labelledby={`faq-h-${i}`}
              className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
              <div className="overflow-hidden"><p className="px-5 pb-4 text-sm text-muted">{it.a}</p></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
