/**
 * Lógica de la home: selector de perfil y enlaces al editor.
 * Solo se carga en index.html; el editor carga main.ts.
 */

type Profile = 'entrenador' | 'club';

const STORAGE_KEY = 'easydrill-profile';

function getStoredProfile(): Profile {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'entrenador' || v === 'club') return v;
  } catch {
    /* ignore */
  }
  return 'entrenador';
}

function setStoredProfile(p: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, p);
  } catch {
    /* ignore */
  }
}

function initHome(): void {
  const cards = document.querySelectorAll<HTMLButtonElement>('.profile-card[data-profile]');
  const content = document.getElementById('profile-content');
  if (!content) return;

  function setProfile(profile: Profile): void {
    setStoredProfile(profile);
    content.setAttribute('data-profile', profile);
    cards.forEach((card) => {
      const isActive = card.dataset.profile === profile;
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-pressed', String(isActive));
    });
  }

  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const profile = card.dataset.profile as Profile;
      if (profile) {
        setProfile(profile);
        content.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  setProfile(getStoredProfile());
}

function initCarousel(): void {
  const carousel = document.getElementById('home-carousel');
  const prevBtn = document.querySelector<HTMLButtonElement>('.carousel-btn-prev');
  const nextBtn = document.querySelector<HTMLButtonElement>('.carousel-btn-next');
  if (!carousel || !prevBtn || !nextBtn) return;

  const cardWidth = 280 + 20; // ancho tarjeta + gap
  const visibleCards = Math.min(3, Math.floor((carousel.parentElement?.clientWidth ?? 920) / cardWidth));

  prevBtn.addEventListener('click', () => {
    carousel.scrollBy({ left: -visibleCards * cardWidth, behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', () => {
    carousel.scrollBy({ left: visibleCards * cardWidth, behavior: 'smooth' });
  });
}

/* --- Fondo animado del hero: trazos que se dibujan (círculos, cruces, flechas) y desaparecen --- */

const HERO_COLORS = [
  'rgba(37, 99, 235, 0.45)',
  'rgba(220, 38, 38, 0.42)',
  'rgba(22, 163, 74, 0.42)',
  'rgba(234, 88, 12, 0.42)',
  'rgba(124, 58, 237, 0.42)',
];

type ShapeKind = 'circle' | 'cross' | 'arrow';

interface DrawnShape {
  kind: ShapeKind;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  startTime: number;
  drawDuration: number;
  holdDuration: number;
  fadeDuration: number;
}

const DRAW_MS = 1200;
const HOLD_MS = 2800;
const FADE_MS = 1000;
const SPAWN_INTERVAL_MS = 1800;

const STROKE_THICK = 6;
const STROKE_THIN = 2.5;
const TAPER_SEGMENTS = 48;

function sampleQuadLength(
  x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, n: number
): number {
  let len = 0;
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const t1 = 1 - t;
    const x = t1 * t1 * x0 + 2 * t1 * t * cx + t * t * x1;
    const y = t1 * t1 * y0 + 2 * t1 * t * cy + t * t * y1;
    len += Math.hypot(x - px, y - py);
    px = x; py = y;
  }
  return len;
}

function getQuadPoint(
  x0: number, y0: number, cx: number, cy: number, x1: number, y1: number,
  dist: number, totalLen: number
): { x: number; y: number } {
  if (totalLen <= 0) return { x: x1, y: y1 };
  const n = 24;
  let acc = 0;
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const t1 = 1 - t;
    const x = t1 * t1 * x0 + 2 * t1 * t * cx + t * t * x1;
    const y = t1 * t1 * y0 + 2 * t1 * t * cy + t * t * y1;
    const seg = Math.hypot(x - px, y - py);
    if (acc + seg >= dist) {
      const u = (dist - acc) / seg;
      return { x: px + u * (x - px), y: py + u * (y - py) };
    }
    acc += seg;
    px = x; py = y;
  }
  return { x: x1, y: y1 };
}

function getPathLength(kind: ShapeKind, size: number): number {
  if (kind === 'circle') return 2 * Math.PI * size;
  if (kind === 'cross') {
    const d = size * 0.9;
    const bulge = 0.35;
    const l1 = sampleQuadLength(-d, -d, bulge * d, -bulge * d, d, d, 20);
    const l2 = sampleQuadLength(d, -d, -bulge * d, bulge * d, -d, d, 20);
    return l1 + l2;
  }
  const len = size * 1.8;
  const head = size * 0.6;
  const curveH = len * 0.2;
  const bodyLen = sampleQuadLength(-len / 2, 0, 0, curveH, len / 2, 0, 20);
  const headSeg = Math.sqrt(head * head + (head * 0.7) * (head * 0.7));
  return bodyLen + 2 * headSeg;
}

function getPointOnPath(kind: ShapeKind, size: number, t: number): { x: number; y: number } {
  if (kind === 'circle') {
    const a = t * Math.PI * 2;
    return { x: size * Math.cos(a), y: size * Math.sin(a) };
  }
  if (kind === 'cross') {
    const d = size * 0.9;
    const bulge = 0.35;
    const l1 = sampleQuadLength(-d, -d, bulge * d, -bulge * d, d, d, 20);
    const l2 = sampleQuadLength(d, -d, -bulge * d, bulge * d, -d, d, 20);
    const total = l1 + l2;
    if (t <= l1 / total) {
      return getQuadPoint(-d, -d, bulge * d, -bulge * d, d, d, t * total, l1);
    }
    return getQuadPoint(d, -d, -bulge * d, bulge * d, -d, d, t * total - l1, l2);
  }
  const len = size * 1.8;
  const head = size * 0.6;
  const curveH = len * 0.2;
  const bodyLen = sampleQuadLength(-len / 2, 0, 0, curveH, len / 2, 0, 20);
  const headSeg = Math.sqrt(head * head + (head * 0.7) * (head * 0.7));
  const total = bodyLen + 2 * headSeg;
  const tNorm = t * total;
  if (tNorm <= bodyLen) {
    return getQuadPoint(-len / 2, 0, 0, curveH, len / 2, 0, tNorm, bodyLen);
  }
  if (tNorm <= bodyLen + headSeg) {
    const u = (tNorm - bodyLen) / headSeg;
    return {
      x: len / 2 - u * head,
      y: -head * 0.7 * u,
    };
  }
  const u = (tNorm - bodyLen - headSeg) / headSeg;
  return {
    x: len / 2 - u * head,
    y: head * 0.7 * u,
  };
}

function drawShapeWithProgress(
  ctx: CanvasRenderingContext2D,
  s: DrawnShape,
  size: number,
  drawProgress: number,
  opacity: number
): void {
  const totalLength = getPathLength(s.kind, size);
  const visibleLength = drawProgress * totalLength;

  ctx.save();
  ctx.strokeStyle = s.color;
  ctx.globalAlpha = opacity;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.translate(s.x, s.y);
  ctx.rotate(s.rotation);

  const n = TAPER_SEGMENTS;
  for (let i = 0; i < n; i++) {
    const d0 = (i / n) * visibleLength;
    const d1 = ((i + 1) / n) * visibleLength;
    if (d0 >= visibleLength) break;
    const t0 = d0 / totalLength;
    const t1 = Math.min(1, d1 / totalLength);
    const p0 = getPointOnPath(s.kind, size, t0);
    const p1 = getPointOnPath(s.kind, size, t1);
    const progressAtStart = d0 / visibleLength;
    const lineWidth = STROKE_THICK * (1 - progressAtStart) + STROKE_THIN * progressAtStart;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  ctx.restore();
}

function initHeroBackground(): void {
  const canvas = document.getElementById('hero-bg-canvas') as HTMLCanvasElement;
  const hero = document.querySelector('.home-hero');
  if (!canvas || !hero || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const shapes: DrawnShape[] = [];
  const rnd = (min: number, max: number) => min + Math.random() * (max - min);

  /** Zona central del hero donde está el título, texto y CTA. Evitamos spawn ahí. */
  const TEXT_ZONE = { xMin: 0.28, xMax: 0.72, yMin: 0.28, yMax: 0.72 };

  function randomPositionOutsideTextZone(w: number, h: number): { x: number; y: number } {
    const bands: Array<() => { x: number; y: number }> = [
      () => ({ x: rnd(0.08 * w, TEXT_ZONE.xMin * w), y: rnd(0.12 * h, 0.88 * h) }),
      () => ({ x: rnd(TEXT_ZONE.xMax * w, 0.92 * w), y: rnd(0.12 * h, 0.88 * h) }),
      () => ({ x: rnd(TEXT_ZONE.xMin * w, TEXT_ZONE.xMax * w), y: rnd(0.12 * h, TEXT_ZONE.yMin * h) }),
      () => ({ x: rnd(TEXT_ZONE.xMin * w, TEXT_ZONE.xMax * w), y: rnd(TEXT_ZONE.yMax * h, 0.88 * h) }),
    ];
    const band = bands[Math.floor(Math.random() * bands.length)];
    return band();
  }

  function spawnShape(now: number, stagger?: number): void {
    const start = now + (stagger ?? 0);
    const w = hero.getBoundingClientRect().width;
    const h = hero.getBoundingClientRect().height;
    const baseSize = Math.min(w, h) * 0.07 * rnd(0.7, 1.3);
    const pos = randomPositionOutsideTextZone(w, h);
    shapes.push({
      kind: ['circle', 'cross', 'arrow'][Math.floor(Math.random() * 3)] as ShapeKind,
      x: pos.x,
      y: pos.y,
      color: HERO_COLORS[Math.floor(Math.random() * HERO_COLORS.length)],
      size: baseSize,
      rotation: rnd(0, Math.PI * 2),
      startTime: start,
      drawDuration: rnd(DRAW_MS * 0.8, DRAW_MS * 1.2),
      holdDuration: rnd(HOLD_MS * 0.9, HOLD_MS * 1.3),
      fadeDuration: rnd(FADE_MS * 0.8, FADE_MS * 1.2),
    });
  }

  let nextSpawn = 0;
  let animationId: number;

  function setSize(): void {
    const rect = hero.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function frame(t: number): void {
    const rect = hero.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    while (shapes.length > 0 && t > shapes[0].startTime + shapes[0].drawDuration + shapes[0].holdDuration + shapes[0].fadeDuration) {
      shapes.shift();
    }

    if (t >= nextSpawn) {
      spawnShape(t);
      nextSpawn = t + rnd(SPAWN_INTERVAL_MS * 0.7, SPAWN_INTERVAL_MS * 1.4);
    }

    shapes.forEach((s) => {
      const elapsed = t - s.startTime;
      if (elapsed < 0) return;

      const drawEnd = s.drawDuration;
      const holdEnd = drawEnd + s.holdDuration;
      const fadeEnd = holdEnd + s.fadeDuration;

      let drawProgress: number;
      let opacity: number;

      if (elapsed < drawEnd) {
        drawProgress = elapsed / drawEnd;
        opacity = 1;
      } else if (elapsed < holdEnd) {
        drawProgress = 1;
        opacity = 1;
      } else if (elapsed < fadeEnd) {
        drawProgress = 1;
        opacity = 1 - (elapsed - holdEnd) / s.fadeDuration;
      } else {
        return;
      }

      drawShapeWithProgress(ctx, s, s.size, drawProgress, opacity);
    });

    animationId = requestAnimationFrame(frame);
  }

  setSize();
  const t0 = performance.now();
  nextSpawn = t0;
  for (let i = 0; i < 3; i++) {
    spawnShape(t0, i * (SPAWN_INTERVAL_MS / 2));
  }
  animationId = requestAnimationFrame(frame);

  const ro = new ResizeObserver(() => setSize());
  ro.observe(hero);
}

/* --- Mobile navigation toggle --- */
function initMobileNav(): void {
  const toggle = document.getElementById('nav-toggle') as HTMLButtonElement | null;
  const nav = document.getElementById('home-nav') as HTMLElement | null;
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    // Swap icon
    const icon = toggle.querySelector('i')!;
    icon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
    // Lock body scroll when menu is open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close menu when clicking a nav link
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.querySelector('i')!.className = 'fa-solid fa-bars';
      document.body.style.overflow = '';
    });
  });
}

if (document.body.classList.contains('home')) {
  initHome();
  initCarousel();
  initHeroBackground();
  initMobileNav();
}
