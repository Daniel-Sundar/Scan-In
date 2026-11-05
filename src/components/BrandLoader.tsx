'use client';

import { motion } from 'framer-motion';
import { Logo } from './ui/static';

export function BrandLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid min-h-[60vh] place-items-center text-fg">
      <div className="flex flex-col items-center gap-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}>
          <Logo className="text-3xl" />
        </motion.div>
        <div className="relative h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
          <motion.span className="absolute inset-y-0 w-1/3 rounded-full bg-blue-500"
            animate={{ x: ['-100%', '300%'] }} transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }} />
        </div>
        <span className="sr-only">{label}…</span>
      </div>
    </div>
  );
}
