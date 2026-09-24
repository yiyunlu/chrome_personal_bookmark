import { useEffect, useState } from 'react';
import { storageGet, storageSet } from '../lib/storage';

const THEME_STORAGE_KEY = 'tabhub_theme_mode';

/**
 * The theme-cycle button's next-mode rule.
 *
 * The naive fixed cycle (system -> light -> dark -> system) can land on
 * `system` when `system` resolves to the same appearance the user is already
 * looking at — e.g. an OS in dark mode, current mode `dark`, next `system`,
 * which also renders dark. The click looks like a no-op (only the glyph
 * changes), and the user needs two clicks to reach light.
 *
 * This skips `system` whenever it would not change what's on screen, so
 * every click is a visible change, and all three modes stay reachable within
 * two clicks:
 *   - from `system`: always switches to the mode `system` is NOT currently
 *     rendering (a visible change is guaranteed since we're leaving system).
 *   - from `light`/`dark`: switches to `system` if `system` would render the
 *     other appearance (a real change), otherwise skips straight past
 *     `system` to the other fixed mode.
 */
export function nextThemeMode(current, resolvedSystem) {
  if (current === 'system') {
    return resolvedSystem === 'dark' ? 'light' : 'dark';
  }
  if (current === 'light') {
    return resolvedSystem === 'dark' ? 'system' : 'dark';
  }
  // current === 'dark'
  return resolvedSystem === 'light' ? 'system' : 'light';
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState('system');
  const [systemTheme, setSystemTheme] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  const resolvedTheme = themeMode === 'system' ? systemTheme : themeMode;

  useEffect(() => {
    (async () => {
      const savedMode = await storageGet(THEME_STORAGE_KEY);
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setThemeMode(savedMode);
      }
    })();

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMediaChange = (event) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onMediaChange);
    return () => media.removeEventListener('change', onMediaChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const handleThemeModeChange = async (mode) => {
    setThemeMode(mode);
    await storageSet(THEME_STORAGE_KEY, mode);
  };

  return { themeMode, resolvedTheme, systemTheme, handleThemeModeChange };
}
