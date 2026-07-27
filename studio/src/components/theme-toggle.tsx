'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

/**
 * Light / dark / follow-the-system.
 *
 * The choice is written to `data-theme` on <html>, which the stylesheet reads.
 * `system` removes the attribute so the media query takes over again.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem('norvik-theme');
    if (stored === 'light' || stored === 'dark') setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
      window.localStorage.removeItem('norvik-theme');
    } else {
      root.setAttribute('data-theme', theme);
      window.localStorage.setItem('norvik-theme', theme);
    }
  }, [theme]);

  const options: { value: Theme; label: string; hint: string }[] = [
    { value: 'light', label: 'Claro', hint: 'Tema claro' },
    { value: 'dark', label: 'Oscuro', hint: 'Tema oscuro' },
    { value: 'system', label: 'Auto', hint: 'Seguir al sistema' },
  ];

  return (
    <div
      className="flex items-center gap-px rounded-xs border border-[var(--color-line)] p-px"
      role="group"
      aria-label="Tema de color"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setTheme(option.value)}
          aria-pressed={theme === option.value}
          title={option.hint}
          className={`px-2.5 py-1 text-xs tracking-wide transition-colors ${
            theme === option.value
              ? 'bg-[var(--color-ink)] text-[var(--color-canvas)]'
              : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-sunk)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
