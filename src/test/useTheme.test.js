import { describe, it, expect } from 'vitest';
import { nextThemeMode } from '../hooks/useTheme';

/* nextThemeMode(current, resolvedSystem) is the theme-cycle button's next-mode
   rule. It must skip `system` whenever `system` would render the same
   appearance already on screen — otherwise a click looks like a no-op (only
   the glyph changes) and the user needs two clicks to see a visible change.
   All 6 (current x resolvedSystem) combinations are covered here. */
describe('nextThemeMode', () => {
  it('from system, light OS: goes to dark (a visible change, system already looked light)', () => {
    expect(nextThemeMode('system', 'light')).toBe('dark');
  });

  it('from system, dark OS: goes to light (a visible change, system already looked dark)', () => {
    expect(nextThemeMode('system', 'dark')).toBe('light');
  });

  it('from light, light OS: skips system (it would also render light) and goes to dark', () => {
    expect(nextThemeMode('light', 'light')).toBe('dark');
  });

  it('from light, dark OS: goes to system (a real, visible change to dark)', () => {
    expect(nextThemeMode('light', 'dark')).toBe('system');
  });

  it('from dark, light OS: goes to system (a real, visible change to light)', () => {
    expect(nextThemeMode('dark', 'light')).toBe('system');
  });

  it('from dark, dark OS: skips system (it would also render dark) and goes to light', () => {
    expect(nextThemeMode('dark', 'dark')).toBe('light');
  });

  it('never returns the current mode — every click is a change of mode', () => {
    const modes = ['system', 'light', 'dark'];
    const systemThemes = ['light', 'dark'];
    for (const mode of modes) {
      for (const systemTheme of systemThemes) {
        expect(nextThemeMode(mode, systemTheme)).not.toBe(mode);
      }
    }
  });
});
