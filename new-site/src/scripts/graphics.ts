// Explorable data graphics. With a mouse, `.graphic[data-hover]` shows the nearest data point's
// label (atlas films, models, category pairs) and `.graphic[data-scrub]` slides through a sprite
// of frames (brain slices). Touch devices keep the static graphic. Data loads on first hover.

type PointData = { kind: 'points'; w: number; h: number; points: [number, number, string, string][] };
type GridData = { kind: 'grid'; w: number; h: number; x0: number; y0: number; side: number; labels: string[]; values: number[][] };
type HoverData = PointData | GridData;

const cache = new Map<string, Promise<HoverData>>();
const load = (name: string) => {
  if (!cache.has(name)) cache.set(name, fetch(`/v2/graphics/${name}-hover.json`).then(response => response.json()));
  return cache.get(name)!;
};

/** Where a w×h mask drawn with `contain` sits inside its layer, in viewport pixels. */
function fit(layer: HTMLElement, w: number, h: number) {
  const rect = layer.getBoundingClientRect();
  const scale = Math.min(rect.width / w, rect.height / h);
  return { scale, left: rect.left + (rect.width - w * scale) / 2, top: rect.top + (rect.height - h * scale) / 2 };
}

function setupHover(graphic: HTMLElement) {
  const host = graphic.closest<HTMLElement>('.card, .shelf-note') ?? graphic;
  const layer = graphic.querySelector<HTMLElement>('.graphic-ink')!;
  const tip = Object.assign(document.createElement('span'), { className: 'graphic-tip', hidden: true });
  const mark = Object.assign(document.createElement('span'), { className: 'graphic-mark', hidden: true });
  tip.setAttribute('aria-hidden', 'true');
  mark.setAttribute('aria-hidden', 'true');
  graphic.append(mark, tip);
  let data: HoverData | undefined;

  const hide = () => { tip.hidden = true; mark.hidden = true; };
  const show = (x: number, y: number, title: string, detail: string, cell?: { w: number; h: number }) => {
    const box = graphic.getBoundingClientRect();
    const left = x - box.left;
    const top = y - box.top;
    mark.toggleAttribute('data-cell', Boolean(cell));
    Object.assign(mark.style, cell ? { left: `${left}px`, top: `${top}px`, width: `${cell.w}px`, height: `${cell.h}px` } : { left: `${left}px`, top: `${top}px`, width: '', height: '' });
    tip.innerHTML = '';
    tip.append(title);
    if (detail) tip.append(Object.assign(document.createElement('small'), { textContent: detail }));
    tip.toggleAttribute('data-below', top < 56);
    // Keep the label inside the frame horizontally.
    tip.hidden = false;
    mark.hidden = false;
    const half = tip.offsetWidth / 2;
    tip.style.left = `${Math.min(Math.max(left, half + 8), box.width - half - 8)}px`;
    tip.style.top = `${top}px`;
  };

  host.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse' && !data) load(graphic.dataset.hover!).then(result => { data = result; });
  });
  host.addEventListener('pointerleave', hide);
  host.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !data) return;
    const { scale, left, top } = fit(layer, data.w, data.h);
    const x = (event.clientX - left) / scale;
    const y = (event.clientY - top) / scale;
    if (data.kind === 'points') {
      let best = -1;
      let bestDistance = (18 / scale) ** 2;
      data.points.forEach(([px, py], i) => {
        const distance = (px - x) ** 2 + (py - y) ** 2;
        if (distance < bestDistance) { best = i; bestDistance = distance; }
      });
      if (best < 0) return hide();
      const [px, py, title, detail] = data.points[best];
      show(left + px * scale, top + py * scale, title, detail);
    } else {
      const n = data.labels.length;
      const size = data.side / n;
      const col = Math.floor((x - data.x0) / size);
      const row = Math.floor((y - data.y0) / size);
      if (col < 0 || row < 0 || col >= n || row >= n) return hide();
      const pair = row === col ? `${data.labels[row]} vs. ${data.labels[col]}` : `${data.labels[row]} × ${data.labels[col]}`;
      const cellLeft = left + (data.x0 + col * size) * scale;
      const cellTop = top + (data.y0 + row * size) * scale;
      show(cellLeft, cellTop, pair, `Mean feature correlation ${data.values[row][col].toFixed(2)}`, { w: size * scale, h: size * scale });
      // The label sits above the cell's centre, not its corner.
      tip.style.left = `${parseFloat(tip.style.left) + (size * scale) / 2}px`;
    }
  });
}

function setupScrub(graphic: HTMLElement) {
  const host = graphic.closest<HTMLElement>('.card') ?? graphic;
  const layers = [...graphic.querySelectorAll<HTMLElement>('.graphic-ink, .graphic-accent')];
  const frames = Number(graphic.dataset.frames);
  const base = `/v2/graphics/${graphic.dataset.scrub}`;
  const hint = Object.assign(document.createElement('span'), { className: 'graphic-scrub-hint', hidden: true, textContent: 'Move across to slice through the brain' });
  hint.setAttribute('aria-hidden', 'true');
  graphic.append(hint);
  let ready = false;

  const preload = () => Promise.all(['ink', 'accent'].map(layer => new Promise(resolve => {
    const image = new Image();
    image.onload = image.onerror = resolve;
    image.src = `${base}-${layer}.webp`;
  })));
  const reset = () => {
    graphic.classList.remove('is-scrubbing');
    graphic.style.removeProperty('--ink-mask');
    graphic.style.removeProperty('--accent-mask');
    layers.forEach(layer => { layer.style.maskPosition = ''; layer.style.webkitMaskPosition = ''; });
    hint.hidden = true;
  };

  host.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse') return;
    hint.hidden = false;
    if (!ready) preload().then(() => { ready = true; });
  });
  host.addEventListener('pointerleave', reset);
  host.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !ready) return;
    const rect = layers[0].getBoundingClientRect();
    const t = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const frame = Math.round(t * (frames - 1));
    // Each sprite frame is 4:3 and the sprite is scaled to the layer's height. Mask positions use
    // the untransformed layout size, not the hover-scaled rect.
    const { offsetWidth: width, offsetHeight: height } = layers[0];
    const frameWidth = (height * 4) / 3;
    const position = `${(width - frameWidth) / 2 - frame * frameWidth}px 0`;
    graphic.classList.add('is-scrubbing');
    graphic.style.setProperty('--ink-mask', `url(${base}-ink.webp)`);
    graphic.style.setProperty('--accent-mask', `url(${base}-accent.webp)`);
    layers.forEach(layer => { layer.style.maskPosition = position; layer.style.webkitMaskPosition = position; });
    hint.hidden = true;
  });
}

if (matchMedia('(hover: hover)').matches) {
  document.querySelectorAll<HTMLElement>('.graphic[data-hover]').forEach(setupHover);
  document.querySelectorAll<HTMLElement>('.graphic[data-scrub]').forEach(setupScrub);
}
