'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/game-store';
import { applyTheme } from '@/constants/themes';

/**
 * Aplica el tema activo escribiendo variables CSS en <html>.
 * Se vuelve a aplicar al cambiar de tema o al rehidratar el store.
 */
export function ThemeEffect() {
  const activeTheme = useGameStore((s) => s.activeTheme);

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  return null;
}
