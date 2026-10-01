import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's stock scales. Any utility this project
 * adds in tailwind.config.js is invisible to it, and — this is the dangerous
 * part — it does not merge what it does not know: BOTH classes reach the DOM and
 * CSS source order decides, not class order. So `cn(cardBase, 'shadow-panel')`
 * would leave shadcn's `shadow` in place and silently lose the override.
 *
 * Registering the custom scales here makes the contract's `shadow-panel`,
 * `ease-smooth` and the project's keyframe animations behave like every other
 * utility. `src/test/cn.test.js` pins all three, plus the two merge behaviours
 * that have already caused real bugs in this migration.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      shadow: [{ shadow: ['panel', 'soft', 'soft-lg', 'dark-soft'] }],
      ease: [{ ease: ['smooth'] }],
      animate: [{ animate: ['fade-in', 'slide-up', 'slide-in-right', 'shimmer'] }]
    }
  }
});

/** Merge conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
