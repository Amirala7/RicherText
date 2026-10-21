// Glass refraction (ADR 0021): in Chromium, backdrop-filter accepts an SVG
// filter, so the glass edges bend what's behind with a slight colour split.
// Safari and Firefox keep the frosted blur. Returns a clean-up function.
export function refract(el: HTMLElement, strength: number): () => void {
  const chromium = "chrome" in window;
  if (!chromium || !CSS.supports("backdrop-filter", "blur(1px)")) {
    return () => {};
  }
  const NS = "http://www.w3.org/2000/svg";
  const id = `rt-glass-${Math.random().toString(36).slice(2)}`;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  const filter = document.createElementNS(NS, "filter");
  for (const [k, v] of Object.entries({
    id,
    filterUnits: "userSpaceOnUse",
    primitiveUnits: "userSpaceOnUse",
    "color-interpolation-filters": "sRGB",
    x: "0",
    y: "0",
  })) {
    filter.setAttribute(k, v);
  }
  svg.appendChild(filter);
  document.body.appendChild(svg);

  const build = () => {
    const w = Math.round(el.offsetWidth);
    const h = Math.round(el.offsetHeight);
    if (!w || !h) return;
    const rad = Math.min(
      parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
      h / 2,
    );
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(w, h);
    const band = Math.min(h / 2, 16);
    const hx = w / 2;
    const hy = h / 2;
    // Signed distance to the rounded rectangle's edge.
    const sd = (x: number, y: number) => {
      const qx = Math.abs(x - hx) - (hx - rad);
      const qy = Math.abs(y - hy) - (hy - rad);
      return (
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0) -
        rad
      );
    };
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const d = -sd(px, py);
        let dx = 0;
        let dy = 0;
        if (d > 0 && d < band) {
          const nx = sd(px + 1, py) - sd(px - 1, py);
          const ny = sd(px, py + 1) - sd(px, py - 1);
          const len = Math.hypot(nx, ny) || 1;
          const t = 1 - d / band;
          dx = (-nx / len) * t * t;
          dy = (-ny / len) * t * t;
        }
        const o = (y * w + x) * 4;
        img.data[o] = 128 + dx * 127;
        img.data[o + 1] = 128 + dy * 127;
        img.data[o + 2] = 128;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    filter.setAttribute("width", String(w));
    filter.setAttribute("height", String(h));
    const channel = (scale: number, matrix: string, r: string) =>
      `<feDisplacementMap in="soft" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d${r}"/>` +
      `<feColorMatrix in="d${r}" type="matrix" values="${matrix} 0 0 0 1 0" result="${r}"/>`;
    filter.innerHTML =
      `<feImage href="${canvas.toDataURL()}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>` +
      `<feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="soft"/>` +
      channel(strength, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0 ", "cr") +
      channel(strength * 1.04, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0 ", "cg") +
      channel(strength * 1.08, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0 ", "cb") +
      `<feBlend in="cr" in2="cg" mode="screen" result="rg"/><feBlend in="rg" in2="cb" mode="screen" result="rgb"/>` +
      `<feColorMatrix in="rgb" type="saturate" values="1.5"/>`;
    el.style.backdropFilter = `url(#${id})`;
    el.style.setProperty("-webkit-backdrop-filter", `url(#${id})`);
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new ResizeObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(build, 60);
  });
  observer.observe(el);
  return () => {
    clearTimeout(timer);
    observer.disconnect();
    svg.remove();
    el.style.backdropFilter = "";
    el.style.removeProperty("-webkit-backdrop-filter");
  };
}
