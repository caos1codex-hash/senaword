'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Check, BarChart3, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/stores/game-store';
import { AVAILABLE_LETTERS, isDynamicLetter } from '@/constants/letters';

type FilterTab = 'all' | 'learned' | 'unlearned' | 'dynamic' | 'words';

const tabs: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'learned', label: 'Aprendidas' },
  { key: 'unlearned', label: 'Por aprender' },
  { key: 'dynamic', label: '〰️ Movimiento' },
  { key: 'words', label: '📖 Palabras' },
];

export function LetterBrowser() {
  const goBack = useGameStore((s) => s.goBack);
  const startPractice = useGameStore((s) => s.startPractice);
  const letterProgress = useGameStore((s) => s.letterProgress);
  const getLetterData = useGameStore((s) => s.getLetterData);
  const getCaptureMode = useGameStore((s) => s.getCaptureMode);
  const customWords = useGameStore((s) => s.customWords);
  const letterTextOverrides = useGameStore((s) => s.letterTextOverrides);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const filteredLetters = useMemo(() => {
    let letters: string[] =
      filter === 'words' ? [...customWords] : [...AVAILABLE_LETTERS];

    if (filter === 'learned') {
      letters = letters.filter((l) => letterProgress[l]?.learned);
    } else if (filter === 'unlearned') {
      letters = letters.filter((l) => !letterProgress[l]?.learned);
    } else if (filter === 'dynamic') {
      letters = letters.filter((l) => getCaptureMode(l) === 'video');
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      letters = letters.filter((l) => {
        const info = getLetterData(l);
        return (
          l.toLowerCase().includes(q) ||
          info?.description.toLowerCase().includes(q) ||
          info?.tip.toLowerCase().includes(q)
        );
      });
    }

    return letters;
  }, [filter, search, letterProgress, getLetterData, getCaptureMode, customWords, letterTextOverrides]);

  return (
    <main className="aaa-stage flex-1 flex flex-col px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-2xl mx-auto flex flex-col gap-4"
      >
        {/* Header glass */}
        <div className="glass-regular glass-highlight squircle depth-1 flex items-center gap-3 p-3 pr-5">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-11 w-11 rounded-2xl hover:bg-white/5" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Letras</h1>
            <p className="text-xs text-game-text-secondary">
              {AVAILABLE_LETTERS.length} letras disponibles · toca para practicar
            </p>
          </div>
        </div>

        {/* Search floating */}
        <div className="glass-thin glass-highlight squircle-sm relative depth-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-game-text-muted" aria-hidden="true" />
          <Input
            placeholder="Buscar letra..."
            aria-label="Buscar letra por nombre o descripción"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 h-12 bg-transparent border-0 text-game-text placeholder:text-game-text-muted focus-visible:ring-0"
          />
        </div>

        {/* Segmented glass control */}
        <div className="glass-ultra-thin squircle-sm p-1 grid grid-cols-5 gap-1" role="tablist" aria-label="Filtrar letras">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={filter === t.key}
              onClick={() => setFilter(t.key)}
              className={`h-10 rounded-[0.9rem] text-sm font-semibold transition-all duration-300 ${
                filter === t.key
                  ? 'bg-gradient-to-b from-teal-400/25 to-teal-500/10 text-teal-100 border border-teal-300/25 depth-1'
                  : 'text-game-text-secondary hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <motion.div
          key={filter + search}
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.025 } } }}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3"
        >
          {filteredLetters.map((letter) => {
            const progress = letterProgress[letter];
            const isLearned = progress?.learned ?? false;
            const practiceCount = progress?.practiceCount ?? 0;

            return (
              <motion.div
                key={letter}
                variants={{ hidden: { opacity: 0, scale: 0.9, y: 10 }, show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } } }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.94 }}
              >
                <div
                  className={`card-solid relative overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded-[1.4rem] p-3 flex flex-col items-center justify-center gap-1 aspect-square depth-1 ${
                    isLearned ? 'border-emerald-300/25' : ''
                  }`}
                  onClick={() => startPractice(letter)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Practicar letra ${letter}${isLearned ? ' (aprendida)' : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      startPractice(letter);
                    }
                  }}
                >
                  {isLearned && (
                    <span
                      aria-label="Aprendida"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-emerald-400/20 border border-emerald-300/30 flex items-center justify-center"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                    </span>
                  )}

                  <span className={`${letter.length > 4 ? 'text-base' : letter.length > 1 ? 'text-xl' : 'text-3xl'} font-black tracking-tight ${isLearned ? 'text-emerald-100' : 'text-white'} text-center leading-tight`}>
                    {letter}
                  </span>
                  {getCaptureMode(letter) === 'video' ? (
                    <span className="text-[9px] font-bold text-orange-200 bg-orange-400/10 border border-orange-300/20 rounded-full px-2 py-0.5 uppercase tracking-wider">
                      🎥 video
                    </span>
                  ) : isDynamicLetter(letter) ? (
                    <span className="text-[9px] font-bold text-orange-200 bg-orange-400/10 border border-orange-300/20 rounded-full px-2 py-0.5 uppercase tracking-wider">
                      〰️ movimiento
                    </span>
                  ) : null}

                  {practiceCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-game-text-muted tabular-nums">
                      <BarChart3 className="w-2.5 h-2.5" aria-hidden="true" />
                      {practiceCount}
                    </span>
                  )}
                  {isLearned && <span className="absolute bottom-0 inset-x-6 h-0.5 rounded-full bg-emerald-300/60" />}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredLetters.length === 0 && (
          <div className="glass-ultra-thin squircle flex flex-col items-center justify-center py-12 text-center">
            {filter === 'words' ? (
              <>
                <BookOpen className="w-10 h-10 text-game-text-muted mb-3" aria-hidden="true" />
                <p className="text-game-text-secondary font-semibold">No tienes palabras aún</p>
                <p className="text-game-text-muted text-sm mt-1">Créalas en Entrenar IA → Mis palabras</p>
              </>
            ) : (
              <>
                <Search className="w-10 h-10 text-game-text-muted mb-3" aria-hidden="true" />
                <p className="text-game-text-secondary font-semibold">Sin resultados</p>
                <p className="text-game-text-muted text-sm mt-1">Intenta con otro término de búsqueda</p>
              </>
            )}
          </div>
        )}
      </motion.div>
    </main>
  );
}
