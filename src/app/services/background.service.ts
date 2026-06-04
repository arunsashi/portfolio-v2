import { DOCUMENT, inject, Injectable } from '@angular/core';

/**
 * Generates the canvas "glyph grid" background at runtime.
 *
 * Two stacked layers:
 * - A dense 200px tile of small code marks (+, { }, ;, </>, *), sparkles, and
 *   travel marks (paper plane, location pin) — the ambient texture.
 * - A sparse 1280px layer holding 1–5 oversized glyphs — the easter egg. The
 *   large period means only a handful appear per screenful, at random spots,
 *   instead of echoing with every tile repeat.
 *
 * Layout is randomized on every page load — each visit/refresh draws a fresh
 * scatter (it stays put during in-app navigation since the service only runs
 * once per boot).
 *
 * The static tile in styles.scss remains the no-JS / pre-boot fallback; this
 * service simply overrides body's background once at startup.
 */
@Injectable({ providedIn: 'root' })
export class BackgroundService {
  private readonly document = inject(DOCUMENT);

  /** Dense-texture tile (square). */
  private static readonly TILE = 200;
  /** 3×3 placement cells — one glyph per cell keeps the scatter overlap-free. */
  private static readonly GRID = 3;
  /** Period of the sparse big-glyph layer. */
  private static readonly SPARSE = 1280;

  init(): void {
    // Fresh seed per page load — every refresh gets a new scatter.
    const rand = mulberry32(Math.floor(Math.random() * 0xffffffff));
    const fill = this.dotColor();
    const tile = this.buildTile(rand, fill);
    const sparse = this.buildSparseLayer(rand, fill);

    const body = this.document.body;
    body.style.backgroundImage = `${toUrl(sparse)}, ${toUrl(tile)}`;
    body.style.backgroundSize =
      `${String(BackgroundService.SPARSE)}px ${String(BackgroundService.SPARSE)}px, ` +
      `${String(BackgroundService.TILE)}px ${String(BackgroundService.TILE)}px`;
  }

  /** The repeating texture: every glyph small, every cell occupied. */
  private buildTile(rand: () => number, fill: string): string {
    const cell = BackgroundService.TILE / BackgroundService.GRID;
    const cells = shuffle(
      Array.from({ length: BackgroundService.GRID ** 2 }, (_, i) => i),
      rand,
    );

    // Fill every cell (one random glyph appears twice) — an always-empty cell
    // repeats with the tile and reads as an ordered blank band.
    const occupants: GlyphDef[] = [
      ...GLYPHS,
      GLYPHS[Math.floor(rand() * GLYPHS.length)] ?? (GLYPHS[0]),
    ];

    const parts = occupants.map((glyph, i) => {
      const slot = cells[i] ?? 0;
      const col = slot % BackgroundService.GRID;
      const row = Math.floor(slot / BackgroundService.GRID);
      const scale = 0.85 + rand() * 0.3;
      // Jitter across the cell's full span (clamped to stay inside the tile);
      // origin-biased placement leaves aligned gutters between repeats.
      const x = col * cell + 4 + rand() * Math.max(cell - 8 - glyph.w * scale, 0);
      const y = row * cell + 4 + rand() * Math.max(cell - 8 - glyph.h * scale, 0);
      const rot = Math.round(rand() * 30 - 15);
      const transform =
        `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${String(rot)}) scale(${scale.toFixed(2)})`;
      return `<g transform="${transform}">${glyph.svg}</g>`;
    });

    // A few plain dots fill the gaps so the texture stays even from afar.
    for (let i = 0; i < 5; i++) {
      const cx = (6 + rand() * (BackgroundService.TILE - 12)).toFixed(1);
      const cy = (6 + rand() * (BackgroundService.TILE - 12)).toFixed(1);
      parts.push(`<circle cx="${cx}" cy="${cy}" r="2"/>`);
    }

    return wrapSvg(parts.join(''), BackgroundService.TILE, fill);
  }

  /** The easter egg: 1–5 oversized glyphs scattered over a large period. */
  private buildSparseLayer(rand: () => number, fill: string): string {
    const size = BackgroundService.SPARSE;
    const count = 1 + Math.floor(rand() * 5);
    const parts: string[] = [];

    for (let i = 0; i < count; i++) {
      const glyph = GLYPHS[Math.floor(rand() * GLYPHS.length)] ?? (GLYPHS[0]);
      const scale = 1.6 + rand() * 0.9;
      const margin = 24;
      const x = margin + rand() * (size - 2 * margin - glyph.w * scale);
      const y = margin + rand() * (size - 2 * margin - glyph.h * scale);
      const rot = Math.round(rand() * 40 - 20);
      const transform =
        `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${String(rot)}) scale(${scale.toFixed(2)})`;
      parts.push(`<g transform="${transform}">${glyph.svg}</g>`);
    }

    return wrapSvg(parts.join(''), size, fill);
  }

  /** Keep glyph color in sync with the --color-dot token. */
  private dotColor(): string {
    const value = getComputedStyle(this.document.documentElement)
      .getPropertyValue('--color-dot')
      .trim();
    return value === '' ? '#ccc7b8' : value;
  }
}

/** Glyph fragments drawn at the origin, with their rough bounding box. */
interface GlyphDef {
  svg: string;
  w: number;
  h: number;
}

const GLYPHS: readonly GlyphDef[] = [
  { svg: '<text x="0" y="13" font-size="15">+</text>', w: 10, h: 16 },
  { svg: '<text x="0" y="12" font-size="13">{ }</text>', w: 24, h: 15 },
  { svg: '<text x="0" y="13" font-size="14">;</text>', w: 8, h: 16 },
  { svg: '<text x="0" y="12" font-size="13">&lt;/&gt;</text>', w: 24, h: 15 },
  { svg: '<text x="0" y="13" font-size="15">*</text>', w: 10, h: 16 },
  // Four-point sparkle.
  { svg: '<path d="M6 0l1.6 4.4L12 6l-4.4 1.6L6 12 4.4 7.6 0 6l4.4-1.6z"/>', w: 12, h: 12 },
  // Paper plane (two folded triangles).
  { svg: '<path d="M16 0L0 7l6.2 1.7z"/><path d="M16 0L7.8 9.4l2.5 5.4z"/>', w: 16, h: 15 },
  // Location pin with a punched-out hole.
  {
    svg:
      '<path fill-rule="evenodd" d="M6 0a6 6 0 0 1 6 6c0 4.4-6 9.6-6 9.6S0 10.4 0 6a6 6 0 0 1 ' +
      '6-6zm0 3.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z"/>',
    w: 12,
    h: 16,
  },
];

function wrapSvg(inner: string, size: number, fill: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}">` +
    `<g fill="${fill}" font-family="monospace" font-weight="bold">${inner}</g></svg>`
  );
}

function toUrl(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Small, fast seeded PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher–Yates. */
function shuffle(values: number[], rand: () => number): number[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
