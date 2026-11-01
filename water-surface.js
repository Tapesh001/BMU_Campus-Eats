// Wrap the home screen in <water-surface>. Mark each interactive box with data-water-box.
class WaterSurface extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `<style>
      :host { display: block; position: relative; isolation: isolate; }
      canvas { position: absolute; inset: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 10; }
    </style><slot></slot><canvas aria-hidden="true"></canvas>`;
    this.canvas = shadow.querySelector("canvas");
  }

  connectedCallback() {
    const canvas = this.canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const controller = this.controller = new AbortController();
    const options = { signal: controller.signal, passive: true };
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const waves = [];
    const pops = new Map();
    let lastWake;
    let frame;
    let width;
    let height;

    const pop = (box, strength) => {
      pops.get(box)?.cancel();
      const animation = box.animate([
        { scale: "1" }, { scale: String(1 + strength), offset: 0.35 }, { scale: "1" }
      ], { duration: 330, easing: "ease-out" });
      pops.set(box, animation);
      animation.onfinish = () => pops.delete(box);
    };

    function draw(now) {
      ctx.clearRect(0, 0, width, height);
      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        const progress = Math.min(1, (now - wave.start) / wave.duration);
        const radius = wave.range * progress;
        for (const target of wave.targets) {
          if (!target.hit && target.distance <= radius) {
            target.hit = true;
            pop(target.box, 0.035 * (1 - progress));
          }
        }
        for (let ring = 0; ring < 3; ring++) {
          const r = radius - ring * 9;
          if (r <= 0) continue;
          ctx.globalAlpha = (1 - progress) ** 2 * wave.opacity / (1 + ring);
          for (const [offset, color] of [[0, "#287c91"], [1.6, "#fff"]]) {
            ctx.beginPath();
            ctx.arc(wave.x, wave.y, r + offset, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
        if (progress === 1) waves.splice(i, 1);
      }
      frame = waves.length ? requestAnimationFrame(draw) : undefined;
    }

    const disturb = (event, click) => {
      if (motion.matches) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const now = performance.now();
      const box = event.target.closest?.("[data-water-box]");
      const anchor = click && event.detail === 0 && box ? box.getBoundingClientRect() : null;
      const x = (anchor ? anchor.left + anchor.width / 2 : event.clientX) - rect.left;
      const y = (anchor ? anchor.top + anchor.height / 2 : event.clientY) - rect.top;
      if (!click && lastWake && (now - lastWake.time < 50 || Math.hypot(x - lastWake.x, y - lastWake.y) < 5)) return;
      if (!click) lastWake = { x, y, time: now };
      width = rect.width;
      height = rect.height;
      const ratio = Math.min(devicePixelRatio, 2, 4096 / Math.max(width, height));
      const pixelsX = Math.max(1, Math.round(width * ratio));
      const pixelsY = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== pixelsX || canvas.height !== pixelsY) {
        canvas.width = pixelsX;
        canvas.height = pixelsY;
        ctx.setTransform(pixelsX / width, 0, 0, pixelsY / height, 0, 0);
      }
      const range = click ? Math.min(600, Math.max(width, height)) : 82;
      const targets = [];
      for (const tile of this.querySelectorAll("[data-water-box]")) {
        const bounds = tile.getBoundingClientRect();
        const dx = Math.max(bounds.left - rect.left - x, x - (bounds.right - rect.left), 0);
        const dy = Math.max(bounds.top - rect.top - y, y - (bounds.bottom - rect.top), 0);
        const distance = Math.hypot(dx, dy);
        if (distance < range && (click || !pops.has(tile))) targets.push({ box: tile, distance });
      }
      if (waves.length >= 32) waves.shift();
      waves.push({ x, y, start: now, duration: click ? 1100 : 630, range,
        opacity: click ? 0.7 : 0.32, targets });
      if (frame === undefined) frame = requestAnimationFrame(draw);
    };
    this.addEventListener("pointermove", event => disturb(event, false), options);
    this.addEventListener("click", event => disturb(event, true), options);
    const clear = () => {
      cancelAnimationFrame(frame);
      frame = undefined;
      waves.length = 0;
      for (const animation of pops.values()) animation.cancel();
      pops.clear();
      ctx.clearRect(0, 0, width || 0, height || 0);
    };
    motion.addEventListener("change", clear, options);
    controller.signal.addEventListener("abort", clear);
  }

  disconnectedCallback() {
    this.controller?.abort();
  }
}

customElements.define("water-surface", WaterSurface);
