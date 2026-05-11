// Map ViaggiaTreno train numbers to commuter/regional line badges with brand colors.
// Patterns are checked in order from most specific to most generic.

export interface LineBadgeInfo {
  label: string;
  bgColor: string;
  textColor: string;
}

interface LinePattern {
  label: string;
  bgColor: string;
  test: (n: number) => boolean;
}

const startsWith = (n: number, prefix: number): boolean => {
  const ns = n.toString();
  const ps = prefix.toString();
  return ns.startsWith(ps);
};

const between = (n: number, lo: number, hi: number) => n >= lo && n <= hi;

// Order matters: specific exact matches first.
const LINE_PATTERNS: LinePattern[] = [
  // S4: 7xx and exact 1709
  { label: 'S4', bgColor: '#83bb26', test: (n) => n === 1709 || between(n, 700, 799) },
  // S11 exact 33173
  { label: 'S11', bgColor: '#a593c6', test: (n) => n === 33173 || startsWith(n, 250) || startsWith(n, 252) },
  // S1
  { label: 'S1', bgColor: '#e40520', test: (n) => startsWith(n, 108) || startsWith(n, 118) || startsWith(n, 240) || startsWith(n, 241) },
  // S2
  { label: 'S2', bgColor: '#009879', test: (n) => startsWith(n, 226) || startsWith(n, 242) },
  // S3: 8xx (3 digit)
  { label: 'S3', bgColor: '#a90a2e', test: (n) => between(n, 800, 899) },
  // S5
  { label: 'S5', bgColor: '#f39123', test: (n) => startsWith(n, 245) },
  // S6
  { label: 'S6', bgColor: '#f6d200', test: (n) => startsWith(n, 246) },
  // S7
  { label: 'S7', bgColor: '#e50071', test: (n) => startsWith(n, 247) },
  // S8
  { label: 'S8', bgColor: '#f6b6b6', test: (n) => startsWith(n, 248) },
  // S9
  { label: 'S9', bgColor: '#a2338a', test: (n) => startsWith(n, 249) || startsWith(n, 304) || startsWith(n, 314) || startsWith(n, 344) },
  // S12
  { label: 'S12', bgColor: '#2c5234', test: (n) => startsWith(n, 256) },
  // S13
  { label: 'S13', bgColor: '#a76d11', test: (n) => startsWith(n, 243) || startsWith(n, 328) },
  // S19
  { label: 'S19', bgColor: '#663333', test: (n) => startsWith(n, 259) },
  // RE80
  { label: 'RE80', bgColor: '#004dff', test: (n) => startsWith(n, 255) },
  // R14
  { label: 'R14', bgColor: '#94C120', test: (n) => startsWith(n, 258) },
  // R16: 16xx and 46xx (4 digit)
  { label: 'R16', bgColor: '#94C120', test: (n) => between(n, 1600, 1699) || between(n, 4600, 4699) },
  // RE8: 28xx (4 digit)
  { label: 'RE8', bgColor: '#E40314', test: (n) => between(n, 2800, 2899) },
  // RE5: 25xx (4 digit) — checked after S5 (245xx already excluded since 5-digit)
  { label: 'RE5', bgColor: '#E40314', test: (n) => between(n, 2500, 2599) },
];

const FALLBACK_COLORS: Record<string, { bg: string; text: string }> = {
  FR: { bg: '#BD2D30', text: '#FFFFFF' },
  IC: { bg: '#3C88D9', text: '#FFFFFF' },
  EC: { bg: '#4EAC63', text: '#FFFFFF' },
};

const DEFAULT_FALLBACK = { bg: '#CCCCCC', text: '#1a1a1a' };

export function getLineBadge(
  trainNumber: number,
  categoria?: string | null,
  categoriaDescrizione?: string | null,
): LineBadgeInfo | null {
  for (const p of LINE_PATTERNS) {
    if (p.test(trainNumber)) {
      return { label: p.label, bgColor: p.bgColor, textColor: '#FFFFFF' };
    }
  }
  // Fallback: use sigla from categoria or categoriaDescrizione
  const sigla = (categoria || categoriaDescrizione || '').trim().toUpperCase();
  if (!sigla) return null;
  const colors = FALLBACK_COLORS[sigla] || DEFAULT_FALLBACK;
  return { label: sigla, bgColor: colors.bg, textColor: colors.text };
}

// Delay color helper: green (<=2) / yellow (3-7) / red (>7).
export function getDelayColorClass(delay: number): string {
  if (delay <= 2) return 'text-success';
  if (delay <= 7) return 'text-warning';
  return 'text-delay-high';
}
