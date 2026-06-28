'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, Check, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameStore } from '@/stores/game-store';
import { AVAILABLE_LETTERS, LETTER_INFO } from '@/constants/letters';

type FilterTab = 'all' | 'learned' | 'unlearned';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

export function LetterBrowser() {
  const goBack = useGameStore((s) => s.goBack);
  const startPractice = useGameStore((s) => s.startPractice);
  const letterProgress = useGameStore((s) => s.letterProgress);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');

  const filteredLetters = useMemo(() => {
    let letters = [...AVAILABLE_LETTERS];

    // Filter by tab
    if (filter === 'learned') {
      letters = letters.filter((l) => letterProgress[l]?.learned);
    } else if (filter === 'unlearned') {
      letters = letters.filter((l) => !letterProgress[l]?.learned);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      letters = letters.filter((l) => {
        const info = LETTER_INFO[l];
        return (
          l.toLowerCase().includes(q) ||
          info?.description.toLowerCase().includes(q) ||
          info?.handshape.toLowerCase().includes(q)
        );
      });
    }

    return letters;
  }, [filter, search, letterProgress]);

  return (
    <main className="flex-1 flex flex-col px-4 py-6 bg-mesh">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goBack} className="h-10 w-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Letras</h1>
            <p className="text-sm text-game-text-secondary">
              {AVAILABLE_LETTERS.length} letras disponibles
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-game-text-muted" />
          <Input
            placeholder="Buscar letra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 bg-game-card border-game-border text-game-text placeholder:text-game-text-muted"
          />
        </div>

        {/* Filter tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
          <TabsList className="bg-game-card border border-game-border w-full h-11">
            <TabsTrigger
              value="all"
              className="flex-1 h-full text-sm font-medium data-[state=active]:bg-game-teal/20 data-[state=active]:text-game-teal"
            >
              Todas
            </TabsTrigger>
            <TabsTrigger
              value="learned"
              className="flex-1 h-full text-sm font-medium data-[state=active]:bg-game-success/20 data-[state=active]:text-game-success"
            >
              Aprendidas
            </TabsTrigger>
            <TabsTrigger
              value="unlearned"
              className="flex-1 h-full text-sm font-medium data-[state=active]:bg-game-orange/20 data-[state=active]:text-game-orange"
            >
              Por aprender
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Letter Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          key={filter + search}
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3"
        >
          {filteredLetters.map((letter) => {
            const progress = letterProgress[letter];
            const isLearned = progress?.learned ?? false;
            const practiceCount = progress?.practiceCount ?? 0;

            return (
              <motion.div key={letter} variants={item}>
                <Card
                  className="letter-card bg-game-card border-game-border cursor-pointer group relative overflow-hidden"
                  onClick={() => startPractice(letter)}
                >
                  <CardContent className="p-3 flex flex-col items-center justify-center gap-1 aspect-square">
                    {/* Learned badge */}
                    {isLearned && (
                      <Badge
                        className="absolute top-1.5 right-1.5 h-5 w-5 p-0 flex items-center justify-center bg-game-success/20 border-0"
                      >
                        <Check className="w-3 h-3 text-game-success" />
                      </Badge>
                    )}

                    {/* Letter */}
                    <span className="text-3xl font-black text-game-text group-hover:text-game-teal transition-colors">
                      {letter}
                    </span>

                    {/* Practice count */}
                    {practiceCount > 0 && (
                      <div className="flex items-center gap-0.5 text-[10px] text-game-text-muted">
                        <BarChart3 className="w-2.5 h-2.5" />
                        {practiceCount}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Empty state */}
        {filteredLetters.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Search className="w-10 h-10 text-game-text-muted mb-3" />
            <p className="text-game-text-secondary font-medium">Sin resultados</p>
            <p className="text-game-text-muted text-sm mt-1">
              Intenta con otro término de búsqueda
            </p>
          </div>
        )}
      </motion.div>
    </main>
  );
}