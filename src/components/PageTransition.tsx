'use client';

import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useContext, useState, type ReactNode } from 'react';

/** Position of each page in the navigation order. Moving to a higher number
 *  pushes forward (new page enters from the right); a lower number goes back
 *  (new page enters from the left). Same rank counts as forward. */
const RANK: Record<string, number> = {
  '/': 0, '/login': 1, '/register': 1, '/dashboard': 1,
  '/admin/students': 2, '/scan': 2, '/admin/teachers': 3, '/admin/allocations': 4,
  '/contact': 5, '/privacy': 6, '/terms': 7, '/cookies': 8, '/data-deletion': 9,
};
const rank = (p: string) => RANK[p] ?? (p.startsWith('/admin') ? 3 : 10);

/** Keeps the outgoing page's router state while it animates out, so it doesn't
 *  flip to the new route's content mid-exit. */
function Frozen({ children }: { children: ReactNode }) {
  const ctx = useContext(LayoutRouterContext);
  const [frozen] = useState(ctx);
  return <LayoutRouterContext.Provider value={frozen}>{children}</LayoutRouterContext.Provider>;
}

const variants: Variants = {
  enter: (dir: number) => ({ x: `${dir * 100}%`, opacity: 0.4 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: `${dir * -100}%`, opacity: 0.4 }),
};

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [nav, setNav] = useState({ path: pathname, dir: 1 });
  const dir = nav.path === pathname ? nav.dir : rank(pathname) >= rank(nav.path) ? 1 : -1;
  if (nav.path !== pathname) setNav({ path: pathname, dir });

  if (reduce) return <>{children}</>;
  return (
    <AnimatePresence mode="popLayout" initial={false} custom={dir}>
      <motion.div
        key={pathname}
        custom={dir}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
        data-page={pathname}
      >
        <Frozen>{children}</Frozen>
      </motion.div>
    </AnimatePresence>
  );
}
