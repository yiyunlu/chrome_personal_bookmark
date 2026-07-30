import { useEffect, useState } from 'react';
import { storageGet, storageSet } from '../lib/storage';

const THEME_STORAGE_KEY = 'tabhub_theme_mode';

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

  return { themeMode, resolvedTheme, handleThemeModeChange };
}
