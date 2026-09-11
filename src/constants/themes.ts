/**
 * Catálogo de temas visuales de Seña Word.
 *
 * Cada tema define 6 colores base. Al aplicarse (applyTheme) se derivan
 * el resto de variables del sistema (`--game-*`): superficies, textos,
 * bordes y las familias primaria (teal) / secundaria (naranja) / acento.
 *
 * - primary   → botones principales, anillos de progreso, focos
 * - secondary → resaltados, rachas, insignias secundarias
 * - accent    → final del degradado de títulos, detalles
 */

export interface ThemeColors {
  background: string;
  surface: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
}

export interface AppTheme {
  name: string;
  colors: ThemeColors;
}

/** Tema original de la app (se mantiene como opción por defecto). */
export const CLASSIC_THEME: AppTheme = {
  name: 'Clásico',
  colors: {
    background: '#0B1220',
    surface: '#1E293B',
    primary: '#0D9488',
    secondary: '#F97316',
    accent: '#FB923C',
    text: '#F8FAFC',
  },
};

export const APP_THEMES: AppTheme[] = [
  CLASSIC_THEME,
  {
    "name": "Cyberpunk",
    "colors": {
      "background": "#0B0F1A",
      "surface": "#151A2E",
      "primary": "#00F5FF",
      "secondary": "#FF00A8",
      "accent": "#B8FF00",
      "text": "#F0F4FF"
    }
  },
  {
    "name": "Océano Profundo",
    "colors": {
      "background": "#071A26",
      "surface": "#0D2B3A",
      "primary": "#168AAD",
      "secondary": "#52B69A",
      "accent": "#99D98C",
      "text": "#E8F6F3"
    }
  },
  {
    "name": "Bosque",
    "colors": {
      "background": "#101C16",
      "surface": "#192B20",
      "primary": "#2D6A4F",
      "secondary": "#40916C",
      "accent": "#95D5B2",
      "text": "#E9F5DB"
    }
  },
  {
    "name": "Atardecer",
    "colors": {
      "background": "#21151B",
      "surface": "#35202A",
      "primary": "#E85D04",
      "secondary": "#F48C06",
      "accent": "#FFBA08",
      "text": "#FFF1E6"
    }
  },
  {
    "name": "Noche Elegante",
    "colors": {
      "background": "#101114",
      "surface": "#191B20",
      "primary": "#6C63FF",
      "secondary": "#8E8E9F",
      "accent": "#C9B1FF",
      "text": "#F5F5F7"
    }
  },
  {
    "name": "Lectura",
    "colors": {
      "background": "#F4F0E6",
      "surface": "#EAE3D2",
      "primary": "#665A48",
      "secondary": "#8A7967",
      "accent": "#B08968",
      "text": "#29251F"
    }
  },
  {
    "name": "Paz",
    "colors": {
      "background": "#EEF5F3",
      "surface": "#FFFFFF",
      "primary": "#7AAFA3",
      "secondary": "#A8C7C0",
      "accent": "#D4A373",
      "text": "#263330"
    }
  },
  {
    "name": "Zen",
    "colors": {
      "background": "#E8E6D9",
      "surface": "#F4F1E8",
      "primary": "#657153",
      "secondary": "#9AA583",
      "accent": "#C98B65",
      "text": "#30332A"
    }
  },
  {
    "name": "Glaciar",
    "colors": {
      "background": "#EAF6FA",
      "surface": "#FFFFFF",
      "primary": "#4EA8DE",
      "secondary": "#48CAE4",
      "accent": "#90E0EF",
      "text": "#183642"
    }
  },
  {
    "name": "Volcán",
    "colors": {
      "background": "#180C0A",
      "surface": "#29120E",
      "primary": "#D00000",
      "secondary": "#E85D04",
      "accent": "#FFBA08",
      "text": "#FFF3E0"
    }
  },
  {
    "name": "Aurora",
    "colors": {
      "background": "#100B1F",
      "surface": "#1B1233",
      "primary": "#7B2CBF",
      "secondary": "#C77DFF",
      "accent": "#80FFDB",
      "text": "#F3E8FF"
    }
  },
  {
    "name": "Sakura",
    "colors": {
      "background": "#FFF5F7",
      "surface": "#FFFFFF",
      "primary": "#E5989B",
      "secondary": "#FFB4A2",
      "accent": "#B5838D",
      "text": "#3D2930"
    }
  },
  {
    "name": "Obsidiana",
    "colors": {
      "background": "#080808",
      "surface": "#141414",
      "primary": "#343434",
      "secondary": "#666666",
      "accent": "#FFFFFF",
      "text": "#F2F2F2"
    }
  },
  {
    "name": "Amatista",
    "colors": {
      "background": "#171020",
      "surface": "#241832",
      "primary": "#6D28D9",
      "secondary": "#9333EA",
      "accent": "#D8B4FE",
      "text": "#F5EEFF"
    }
  },
  {
    "name": "Tóxico",
    "colors": {
      "background": "#10150C",
      "surface": "#19200F",
      "primary": "#5C8D00",
      "secondary": "#8BC34A",
      "accent": "#CCFF00",
      "text": "#F2FFE0"
    }
  },
  {
    "name": "Neón Azul",
    "colors": {
      "background": "#070D18",
      "surface": "#0E1828",
      "primary": "#2563EB",
      "secondary": "#06B6D4",
      "accent": "#38BDF8",
      "text": "#E0F2FE"
    }
  },
  {
    "name": "Desierto",
    "colors": {
      "background": "#F3E4C8",
      "surface": "#FFF1D6",
      "primary": "#C06C3E",
      "secondary": "#D99A5B",
      "accent": "#E9C46A",
      "text": "#3A2920"
    }
  },
  {
    "name": "Pino Oscuro",
    "colors": {
      "background": "#0A1713",
      "surface": "#11231C",
      "primary": "#1B6B52",
      "secondary": "#3A9D78",
      "accent": "#A7C957",
      "text": "#E8F5E9"
    }
  },
  {
    "name": "Gótico",
    "colors": {
      "background": "#110B12",
      "surface": "#1D121F",
      "primary": "#6A1B4D",
      "secondary": "#9B315B",
      "accent": "#D4AF37",
      "text": "#F3EAF4"
    }
  },
  {
    "name": "Terminal",
    "colors": {
      "background": "#050805",
      "surface": "#0B110B",
      "primary": "#00FF41",
      "secondary": "#20C997",
      "accent": "#B6FF00",
      "text": "#D8FFD8"
    }
  },
  {
    "name": "Retro 70s",
    "colors": {
      "background": "#F2E2C4",
      "surface": "#FFF1D0",
      "primary": "#C44536",
      "secondary": "#E09F3E",
      "accent": "#669BBC",
      "text": "#342A24"
    }
  },
  {
    "name": "Corporate",
    "colors": {
      "background": "#F5F7FA",
      "surface": "#FFFFFF",
      "primary": "#2563EB",
      "secondary": "#64748B",
      "accent": "#14B8A6",
      "text": "#172033"
    }
  },
  {
    "name": "Midnight",
    "colors": {
      "background": "#090E1A",
      "surface": "#111827",
      "primary": "#3B82F6",
      "secondary": "#6366F1",
      "accent": "#22D3EE",
      "text": "#E5E7EB"
    }
  },
  {
    "name": "Coral",
    "colors": {
      "background": "#FFF5F2",
      "surface": "#FFFFFF",
      "primary": "#E76F51",
      "secondary": "#F4A261",
      "accent": "#2A9D8F",
      "text": "#35241F"
    }
  },
  {
    "name": "Uva",
    "colors": {
      "background": "#171021",
      "surface": "#241633",
      "primary": "#5A189A",
      "secondary": "#7B2CBF",
      "accent": "#E0AAFF",
      "text": "#F6EDFF"
    }
  },
  {
    "name": "Primavera",
    "colors": {
      "background": "#F3FAF0",
      "surface": "#FFFFFF",
      "primary": "#52B788",
      "secondary": "#74C69D",
      "accent": "#F9C74F",
      "text": "#243528"
    }
  },
  {
    "name": "Electricidad",
    "colors": {
      "background": "#0A0A0A",
      "surface": "#171717",
      "primary": "#FFD000",
      "secondary": "#FF7A00",
      "accent": "#00E5FF",
      "text": "#FAFAFA"
    }
  },
  {
    "name": "Minimalista",
    "colors": {
      "background": "#FAFAF9",
      "surface": "#FFFFFF",
      "primary": "#57534E",
      "secondary": "#A8A29E",
      "accent": "#78716C",
      "text": "#292524"
    }
  },
  {
    "name": "Space",
    "colors": {
      "background": "#080B20",
      "surface": "#111633",
      "primary": "#4F46E5",
      "secondary": "#7C3AED",
      "accent": "#F472B6",
      "text": "#EEF2FF"
    }
  },
  {
    "name": "Artístico",
    "colors": {
      "background": "#1A1625",
      "surface": "#272036",
      "primary": "#E6398F",
      "secondary": "#7C4DFF",
      "accent": "#00C2A8",
      "text": "#FFF0F6"
    }
  }
];

export function getTheme(name: string): AppTheme {
  return APP_THEMES.find((t) => t.name === name) ?? CLASSIC_THEME;
}

// ---------- Utilidades de color ----------

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) =>
    Math.round(clamp01(v / 255) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/** Mezcla dos hex. t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex(r1 + (r2 - r1) * k, g1 + (g2 - g1) * k, b1 + (b2 - b1) * k);
}

export function hexWithAlpha(hex: string, alpha01: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha01)})`;
}

/** Luminancia relativa 0-1 (para decidir texto claro/oscuro y modo light). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastText(hex: string): string {
  return luminance(hex) > 0.5 ? '#101418' : '#FFFFFF';
}

// ---------- Aplicación del tema ----------

function setVar(el: HTMLElement, name: string, value: string): void {
  el.style.setProperty(name, value);
}

/**
 * Aplica un tema escribiendo variables `--game-*` en <html>.
 * Las utilidades Tailwind (`bg-game-card`, `text-game-text`, …) las
 * referencian, así toda la herramienta cambia al instante.
 */
export function applyTheme(name: string): void {
  if (typeof document === 'undefined') return;
  const theme = getTheme(name);
  const c = theme.colors;
  const root = document.documentElement;

  const tealDark = mixHex(c.primary, '#000000', 0.22);
  const tealLight = mixHex(c.primary, '#FFFFFF', 0.35);
  const orangeLight = mixHex(c.secondary, '#FFFFFF', 0.3);
  const orangeDeep = mixHex(c.secondary, '#000000', 0.38);
  const textSecondary = mixHex(c.background, c.text, 0.68);
  const textMuted = mixHex(c.background, c.text, 0.48);
  const border = mixHex(c.background, c.text, 0.16);
  const cardHover = mixHex(c.surface, c.text, 0.1);

  // Superficies y texto
  setVar(root, '--game-bg', c.background);
  setVar(root, '--game-bg-light', mixHex(c.background, c.surface, 0.55));
  setVar(root, '--game-card', c.surface);
  setVar(root, '--game-card-hover', cardHover);
  setVar(root, '--game-text', c.text);
  setVar(root, '--game-text-secondary', textSecondary);
  setVar(root, '--game-text-muted', textMuted);
  setVar(root, '--game-border', border);

  // Familia primaria (ranura "teal" del sistema)
  setVar(root, '--game-teal', c.primary);
  setVar(root, '--game-teal-dark', tealDark);
  setVar(root, '--game-teal-light', tealLight);
  setVar(root, '--game-teal-glow', hexWithAlpha(c.primary, 0.3));

  // Familia secundaria (ranura "naranja" del sistema)
  setVar(root, '--game-orange', c.secondary);
  setVar(root, '--game-orange-light', orangeLight);
  setVar(root, '--game-orange-deep', orangeDeep);

  // Acento: final del degradado de títulos + detalles
  setVar(root, '--game-accent-soft', c.accent);
  setVar(root, '--game-gradient-from', tealLight);
  setVar(root, '--game-gradient-mid', c.primary);
  setVar(root, '--game-gradient-to', c.accent);

  // Compat shadcn (ya se guardaban como hex en este proyecto)
  setVar(root, '--background', c.background);
  setVar(root, '--foreground', c.text);
  setVar(root, '--card', c.surface);
  setVar(root, '--card-foreground', c.text);
  setVar(root, '--popover', c.surface);
  setVar(root, '--popover-foreground', c.text);
  setVar(root, '--primary', c.primary);
  setVar(root, '--primary-foreground', contrastText(c.primary));
  setVar(root, '--secondary', c.secondary);
  setVar(root, '--secondary-foreground', contrastText(c.secondary));
  setVar(root, '--muted', mixHex(c.background, c.surface, 0.6));
  setVar(root, '--muted-foreground', textSecondary);
  setVar(root, '--accent', c.accent);
  setVar(root, '--accent-foreground', contrastText(c.accent));
  setVar(root, '--border', border);
  setVar(root, '--input', border);
  setVar(root, '--ring', c.primary);
  setVar(root, '--sidebar', c.background);
  setVar(root, '--sidebar-foreground', c.text);
  setVar(root, '--sidebar-primary', c.primary);
  setVar(root, '--sidebar-primary-foreground', contrastText(c.primary));
  setVar(root, '--sidebar-accent', c.surface);
  setVar(root, '--sidebar-accent-foreground', c.text);
  setVar(root, '--sidebar-border', border);
  setVar(root, '--sidebar-ring', c.primary);

  root.dataset.theme = theme.name;
  root.dataset.themeMode = luminance(c.background) > 0.45 ? 'light' : 'dark';
}
