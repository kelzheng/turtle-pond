// Main — entry point, game loop, canvas setup
const App = {
  canvas: null,
  ctx: null,
  clockCanvas: null,
  clockCtx: null,
  timeSlider: null,
  ripples: [],
  fireflies: [],
  lastTime: 0,
  stars: [],
  camX: 0,
  camY: 0,
  keys: {},
  /** Screen-space rects for unnamed creature labels in the status bar (filled each render). */
  _statusBarNameRegions: [],

  init() {
    this.canvas = document.getElementById('pond-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.clockCanvas = document.getElementById('clock-canvas');
    this.clockCtx = this.clockCanvas.getContext('2d');
    this.timeSlider = document.getElementById('time-slider');

    this._resize();
    window.addEventListener('resize', () => this._resize());

    // Init systems
    Pond.init(this.canvas);
    Turtle.init(Pond.cx, Pond.cy);
    Dragonflies.init(Pond);
    Fishes.init(Pond);
    Drawing.initDefaults(Pond);
    Input.init(this.canvas, Turtle, Dragonflies, Food, Drawing, Pond, this.ripples);

    // Eraser button
    const eraserBtn = document.getElementById('eraser-btn');
    eraserBtn.addEventListener('click', () => {
      Drawing.eraserMode = !Drawing.eraserMode;
      eraserBtn.classList.toggle('active', Drawing.eraserMode);
      this.canvas.style.cursor = Drawing.eraserMode ? 'crosshair' : 'default';
    });

    // Generate stars
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 2000,
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    // Time slider
    const now = new Date();
    this.timeSlider.value = now.getHours() * 60 + now.getMinutes();
    this.timeSlider.addEventListener('input', () => {
      TimeSystem.manualTime = parseInt(this.timeSlider.value);
    });

    // Click clock to reset to real time
    this.clockCanvas.addEventListener('click', () => {
      TimeSystem.manualTime = null;
      const now = new Date();
      this.timeSlider.value = now.getHours() * 60 + now.getMinutes();
    });

    // WASD camera panning
    window.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });

    // Center camera on pond
    this.camX = Pond.cx - window.innerWidth / 2;
    this.camY = Pond.cy - window.innerHeight / 2;

    this._applyUiChrome(TimeSystem.getCurrentPalette());

    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._loop(t));
  },

  _resize() {
    // Fixed world size — viewport just shows what fits
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  _loop(time) {
    try {
      const dt = Math.min(50, time - this.lastTime);
      this.lastTime = time;

      // Update slider if using real time
      if (TimeSystem.manualTime === null) {
        const now = new Date();
        this.timeSlider.value = now.getHours() * 60 + now.getMinutes();
      }

      // Camera pan with WASD
      const panSpeed = 0.4;
      if (this.keys['w']) this.camY -= panSpeed * dt;
      if (this.keys['s']) this.camY += panSpeed * dt;
      if (this.keys['a']) this.camX -= panSpeed * dt;
      if (this.keys['d']) this.camX += panSpeed * dt;

      // Update
      Turtle.update(dt, time, Pond, Food.items, this.ripples, Drawing);
      Food.update(dt, time, Turtle);
      LandFlies.update(dt, time, Pond);
      Dragonflies.update(dt, time, Pond, LandFlies);
      Fishes.update(dt, time, Pond, Food.items, Drawing);
      this._updateFireflies(dt, time);
      Input.updateHearts(dt);

      // Render
      const palette = TimeSystem.getCurrentPalette();
      this._render(time, palette);
    } catch (err) {
      console.error('Turtle Pond frame error:', err);
    }
    requestAnimationFrame((t) => this._loop(t));
  },

  _updateFireflies(dt, time) {
    const isNight = TimeSystem.isNight();
    const isDusk = TimeSystem.isDusk();

    // Spawn/despawn fireflies
    const targetCount = isNight ? 12 : (isDusk ? 5 : 0);

    while (this.fireflies.length < targetCount) {
      this.fireflies.push({
        x: Pond.cx + (Math.random() - 0.5) * Pond.rx * 2.5,
        y: Pond.cy + (Math.random() - 0.5) * Pond.ry * 2.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        phase: Math.random() * Math.PI * 2,
        size: 2 + Math.random() * 2,
      });
    }
    while (this.fireflies.length > targetCount) {
      this.fireflies.pop();
    }

    // Update fireflies
    const t = time * 0.001;
    for (const ff of this.fireflies) {
      ff.vx += (Math.random() - 0.5) * 0.02;
      ff.vy += (Math.random() - 0.5) * 0.02;
      ff.vx *= 0.98;
      ff.vy *= 0.98;
      ff.x += ff.vx * (dt / 16);
      ff.y += ff.vy * (dt / 16);

      // Keep near pond area
      const dx = Pond.cx - ff.x;
      const dy = Pond.cy - ff.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > Pond.rx * 1.5) {
        ff.vx += dx * 0.001;
        ff.vy += dy * 0.001;
      }
    }
  },

  _render(time, palette) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const t = time * 0.001;

    // Recover from any previous missed ctx.restore / bad matrix (stops turtle + HUD vanishing)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    // Clear with sky colour
    ctx.fillStyle = palette.sky;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    try {
      ctx.translate(-this.camX, -this.camY);

      // Stars (at night)
      if (TimeSystem.isNight() || TimeSystem.isDusk()) {
        const nightness = TimeSystem.isNight() ? 0.8 : 0.3;
        for (const star of this.stars) {
          const sx = star.x - this.camX;
          const sy = star.y - this.camY;
          if (sx < -5 || sx > w + 5 || sy < -5 || sy > h + 5) continue;
          const twinkle = Math.sin(t * 1.5 + star.twinkle) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(255, 255, 240, ${twinkle * nightness})`;
          ctx.fillRect(star.x, star.y, star.size, star.size);
        }
      }

      Pond.render(ctx, this.canvas, time, palette);
      Fishes.render(ctx, time, palette);
      Drawing.render(ctx, time);
      Food.render(ctx, time);
      LandFlies.render(ctx, time, palette);
      Pond.renderRipples(ctx, this.ripples, time);
      Turtle.render(ctx, time, palette);
      Dragonflies.render(ctx, time, palette);
      this._renderFireflies(ctx, time);
      Input.renderHearts(ctx, time);
    } finally {
      ctx.restore();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    this._applyUiChrome(palette);
    this._renderClock(time);
    this._renderStatusBar(ctx, palette);
  },

  _applyUiChrome(palette) {
    const u = TimeSystem.uiPalette(palette);
    const r = document.documentElement;
    r.style.setProperty('--ui-eraser-border', u.eraser.border);
    r.style.setProperty('--ui-eraser-color', u.eraser.color);
    r.style.setProperty('--ui-eraser-bg', u.eraser.bg);
    r.style.setProperty('--ui-slider-track', u.sliderTrack);
    r.style.setProperty('--ui-slider-thumb', u.sliderThumb);
  },

  _renderFireflies(ctx, time) {
    const t = time * 0.001;
    for (const ff of this.fireflies) {
      const glow = Math.sin(t * 2 + ff.phase) * 0.5 + 0.5;
      const alpha = glow * 0.7;

      // Outer glow
      ctx.fillStyle = `rgba(255, 230, 140, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(ff.x, ff.y, ff.size * 4, 0, Math.PI * 2);
      ctx.fill();

      // Inner dot
      ctx.fillStyle = `rgba(255, 240, 180, ${alpha})`;
      ctx.font = `${Math.floor(ff.size + 3)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('*', ff.x, ff.y);
    }
  },

  _renderClock(time) {
    const ctx = this.clockCtx;
    const size = 80;
    const cx = size / 2;
    const cy = size / 2;
    const r = 32;

    ctx.clearRect(0, 0, size, size);

    const minutes = TimeSystem.getMinutes();
    const hours = minutes / 60;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const inner = r - 4;
      const outer = r - 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.stroke();
    }

    const hourAngle = (hours / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hourAngle) * r * 0.5, cy + Math.sin(hourAngle) * r * 0.5);
    ctx.stroke();

    const minAngle = ((minutes % 60) / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(minAngle) * r * 0.7, cy + Math.sin(minAngle) * r * 0.7);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  },

  _renderStatusBar(ctx, palette) {
    this._statusBarNameRegions = [];

    const x = 14;
    let y = 20;
    const lineH = 15;
    const ui = TimeSystem.uiPalette(palette).status;

    const registerUnnamedLabel = (labelText, lineY, creature, type) => {
      if (creature.name) return;
      const w = ctx.measureText(labelText).width;
      this._statusBarNameRegions.push({
        left: x,
        top: lineY,
        right: x + w,
        bottom: lineY + lineH,
        creature,
        type,
      });
    };

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '11px monospace';
    ctx.globalAlpha = 1;

    const line = (text) => {
      ctx.fillText(text, x, y);
      y += lineH;
    };

    // Turtle stats
    ctx.fillStyle = ui.turtle;
    const tName = Turtle.name || 'turtle';
    const tFed = '●'.repeat(Math.min(Turtle.growthLevel, 20));
    const tLove = Turtle.pets ? ' ♥'.repeat(Math.min(Turtle.pets, 5)) : '';
    registerUnnamedLabel(tName, y, Turtle, 'turtle');
    line(`${tName}: ${tFed}${tLove}`);

    y += 4;

    // Dragonfly stats
    ctx.fillStyle = ui.dragonfly;
    for (let i = 0; i < Dragonflies.list.length; i++) {
      const df = Dragonflies.list[i];
      const name = df.name || `dragonfly ${i + 1}`;
      const fed = '●'.repeat(Math.min(df.growthLevel || 0, 12));
      const love = df.pets ? ' ♥'.repeat(Math.min(df.pets, 5)) : '';
      registerUnnamedLabel(name, y, df, 'dragonfly');
      line(`${name}: ${fed}${love}`);
    }

    y += 4;

    // Fish stats
    ctx.fillStyle = ui.fish;
    for (let i = 0; i < Fishes.list.length; i++) {
      const f = Fishes.list[i];
      const name = f.name || `fish ${i + 1}`;
      const fed = '●'.repeat(Math.min(f.growthLevel, 12));
      const love = f.pets ? ' ♥'.repeat(Math.min(f.pets, 5)) : '';
      registerUnnamedLabel(name, y, f, 'fish');
      line(`${name}: ${fed}${love}`);
    }

    y += 4;

    // Element counts
    let lilypads = 0, flowers = 0;
    for (const el of Drawing.elements) {
      if (el.type === 'lilypad') lilypads++;
      else if (el.type === 'landflower') flowers++;
    }
    ctx.fillStyle = ui.counts;
    line(`✿ ${flowers}  @ ${lilypads}`);

    ctx.globalAlpha = 1;
  },

  /** Hit-test status bar label in canvas pixel space (not world coords). */
  statusBarHitTest(screenX, screenY) {
    const pad = 3;
    for (const r of this._statusBarNameRegions) {
      if (
        screenX >= r.left - pad &&
        screenX <= r.right + pad &&
        screenY >= r.top - pad &&
        screenY <= r.bottom + pad
      ) {
        return { creature: r.creature, type: r.type };
      }
    }
    return null;
  }
};

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
