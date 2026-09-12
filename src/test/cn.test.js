import { describe, it, expect } from 'vitest';
import { cn } from '../lib/cn';

/**
 * Three distinct tailwind-merge behaviours have produced real bugs in this
 * migration. Each one is silent: the class literal is still in the source, the
 * CSS rule is still in the bundle, and only the resolved className is wrong.
 * These tests pin the behaviour so a tailwind-merge upgrade or a change to
 * src/lib/cn.js cannot reintroduce them unnoticed.
 */
describe('cn()', () => {
  describe('mechanism C — custom utilities from tailwind.config.js', () => {
    // Without the extendTailwindMerge config these do NOT merge: both classes
    // reach the DOM and CSS source order decides, so the override silently loses.
    it.each([
      ['shadow-sm', 'shadow-panel', 'shadow-panel'],
      ['shadow', 'shadow-panel', 'shadow-panel'],
      ['shadow-panel', 'shadow-none', 'shadow-none'],
      ['ease-out', 'ease-smooth', 'ease-smooth'],
      ['animate-pulse', 'animate-slide-up', 'animate-slide-up']
    ])('%s + %s resolves to %s', (base, override, expected) => {
      expect(cn(base, override)).toBe(expected);
    });
  });

  describe('mechanism B — an arbitrary value loses to a later named one', () => {
    it('drops bg-[var(--panel-bg)] in favour of bg-card', () => {
      expect(cn('bg-[var(--panel-bg)]', 'bg-card')).toBe('bg-card');
    });

    // The P3 bug: ring-opacity-* and ring-<colour> share a conflict group, and
    // the colour came first, so the colour was the one deleted.
    it('lets ring-opacity delete an arbitrary ring colour written before it', () => {
      expect(cn('ring-[var(--accent)] ring-opacity-30')).toBe('ring-opacity-30');
    });
  });

  describe('mechanism A — a class deletes a differently-named one', () => {
    // The P5b bug: font-size lists leading among its conflicting groups, so a
    // later text-* silently removes an earlier leading-*. Restating it is the fix.
    it('lets a later font size delete an earlier line height', () => {
      expect(cn('text-sm leading-none', 'text-xs')).toBe('text-xs');
    });

    it('keeps the line height when it is restated after the font size', () => {
      expect(cn('text-sm leading-none', 'text-xs leading-none')).toBe('text-xs leading-none');
    });

    // Two more from the same table that P6 is likely to hit: Separator's base is
    // `shrink-0`, and line-clamp is a natural thing to add to a truncated title.
    it('lets flex-1 delete shrink-0', () => {
      expect(cn('shrink-0 bg-border', 'flex-1')).toBe('bg-border flex-1');
    });

    it('lets line-clamp delete display and overflow', () => {
      expect(cn('flex overflow-hidden', 'line-clamp-2')).toBe('line-clamp-2');
    });
  });
});
