'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Check, Paintbrush } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/stores/game-store';
import { APP_THEMES } from '@/constants/themes';
import { useSoundEffects } from '@/hooks/use-sound-effects';

export function ThemeScreen() {
  const goBack = useGameStore((s) => s.goBack);
  const activeTheme = useGameStore((s) => s.activeTheme);
  const setActiveTheme = useGameStore((s) => s.setActiveTheme);
  const { playClick } = useSoundEffects();

  const handleSelect = (name: string) => {
    if (name === activeTheme) return;
    playClick();
    setActiveTheme(name);
  };

  return (
    <main className="aaa-stage flex-1 flex flex-col px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-2xl mx-auto flex flex-col gap-4"
      >
        {/* Header */}
        <div className="glass-regular glass-highlight squircle depth-1 flex items-center gap-3 p-3 pr-5">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-11 w-11 rounded-2xl hover:bg-white/5" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Temas</h1>
            <p className="text-xs text-game-text-secondary">
              {APP_THEMES.length} aspectos · toca una tarjeta para aplicarlo
            </p>
          </div>
        </div>

        {/* Grid de tarjetas */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-8"
        >
          {APP_THEMES.map((theme) => {
            const c = theme.colors;
            const isActive = theme.name === activeTheme;
            return (
              <motion.div
                key={theme.name}
                variants={{
                  hidden: { opacity: 0, scale: 0.92, y: 10 },
                  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } },
                }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <button
                  onClick={() => handleSelect(theme.name)}
                  aria-label={`Aplicar tema ${theme.name}${isActive ? ' (activo)' : ''}`}
                  aria-pressed={isActive}
                  className="w-full text-left rounded-[1.4rem] overflow-hidden depth-1 outline-none focus-visible:ring-2 focus-visible:ring-teal-300 transition-shadow"
                  style={{
                    background: c.surface,
                    border: `2px solid ${isActive ? c.primary : 'transparent'}`,
                    boxShadow: isActive ? `0 8px 30px -8px ${c.primary}` : undefined,
                  }}
                >
                  {/* Vista previa con los colores del propio tema */}
                  <span className="block p-3" style={{ background: c.background }}>
                    <span
                      className="block rounded-xl px-3 py-2.5 mb-2.5"
                      style={{ background: c.surface, border: `1px solid ${c.primary}55` }}
                    >
                      <span className="block text-xl font-black leading-none" style={{ color: c.text }}>
                        Aa
                      </span>
                      <span className="block text-[10px] mt-1" style={{ color: c.primary }}>
                        Título de ejemplo
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      {[c.primary, c.secondary, c.accent, c.text].map((dot) => (
                        <span
                          key={dot}
                          className="w-5 h-5 rounded-full border border-black/20"
                          style={{ background: dot }}
                        />
                      ))}
                    </span>
                  </span>
                  {/* Nombre */}
                  <span className="flex items-center justify-between gap-2 px-3 py-2.5">
                    <span className="text-sm font-bold truncate" style={{ color: c.text }}>
                      {theme.name}
                    </span>
                    {isActive ? (
                      <span
                        className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                        style={{ background: c.primary, color: c.background }}
                        aria-hidden="true"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <Paintbrush className="w-4 h-4 shrink-0 opacity-50" style={{ color: c.text }} aria-hidden="true" />
                    )}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </main>
  );
}
