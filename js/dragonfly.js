// Dragonfly — state, AI, rendering
class Dragonfly {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0.8 + Math.random() * 0.5;
    this.targetX = x;
    this.targetY = y;
    this.size = 20 + Math.random() * 6;
    this.dragging = false;
    this.wingPhase = Math.random() * Math.PI * 2;
    this.hoverTimer = 0;
    this.hovering = false;
    this.name = '';

    // Colour — iridescent pastels
    const hues = [
      { r: 120, g: 180, b: 200 }, // blue
      { r: 150, g: 170, b: 210 }, // lavender
      { r: 130, g: 200, b: 180 }, // teal
    ];
    this.colour = hues[Math.floor(Math.random() * hues.length)];
  }

  update(dt, time, pond) {
    if (this.dragging) return;

    const t = time * 0.001;
    this.wingPhase += dt * 0.03;

    if (this.hovering) {
      this.hoverTimer -= dt;
      // Gentle bob while hovering
      this.y += Math.sin(t * 3) * 0.1;
      this.x += Math.cos(t * 2.3) * 0.05;
      if (this.hoverTimer <= 0) {
        this.hovering = false;
        this._pickTarget(pond);
      }
      return;
    }

    // Move toward target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);

    // Smooth turn
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * 0.08;

    // Add some erratic movement
    this.angle += Math.sin(t * 5 + this.wingPhase) * 0.03;

    this.x += Math.cos(this.angle) * this.speed * (dt / 16);
    this.y += Math.sin(this.angle) * this.speed * (dt / 16);

    // Reached target?
    if (dist < 15) {
      if (Math.random() < 0.4) {
        this.hovering = true;
        this.hoverTimer = 1000 + Math.random() * 3000;
      } else {
        this._pickTarget(pond);
      }
    }

    // Keep on screen
    const canvas = document.getElementById('pond-canvas');
    const m = 30;
    this.x = Math.max(m, Math.min(canvas.width - m, this.x));
    this.y = Math.max(m, Math.min(canvas.height - m, this.y));
  }

  _pickTarget(pond) {
    // Dragonflies stay near the pond
    const a = Math.random() * Math.PI * 2;
    const r = 0.5 + Math.random() * 0.8;
    this.targetX = pond.cx + Math.cos(a) * pond.rx * r;
    this.targetY = pond.cy + Math.sin(a) * pond.ry * r;
    this.speed = 0.5 + Math.random() * 1;
  }

  hitTest(mx, my) {
    const dx = mx - this.x;
    const dy = my - this.y;
    return dx * dx + dy * dy < (this.size + 8) * (this.size + 8);
  }

  render(ctx, time) {
    const t = time * 0.001;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const s = this.size;
    const flapOpen = 0.82 + Math.abs(Math.sin(this.wingPhase * 2 + t * 15)) * 0.28;
    const { r, g, b } = this.colour;

    // Local +x = forward (flight). Thorax / wing attachment at origin so the + sits on the body axis.
    const tailX = -s * 0.5;
    const neckX = s * 0.16;
    const headR = s * 0.09;
    const headCx = neckX + headR;

    // Wings — + centered on thorax (0,0), lying on the same line as abdomen + thorax
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = `rgb(${r + 50},${g + 50},${b + 50})`;
    ctx.lineWidth = Math.max(1.2, s * 0.06);
    ctx.lineCap = 'round';
    const span = s * 0.48 * flapOpen;
    const arm = s * 0.38 * flapOpen;
    ctx.beginPath();
    ctx.moveTo(0, -span);
    ctx.lineTo(0, span);
    ctx.moveTo(-arm, 0);
    ctx.lineTo(arm, 0);
    ctx.stroke();

    // Abdomen + thorax (single stroke through wing cross)
    ctx.globalAlpha = 0.88;
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = Math.max(1.5, s * 0.075);
    ctx.beginPath();
    ctx.moveTo(tailX, 0);
    ctx.lineTo(neckX, 0);
    ctx.stroke();

    // Head — circle tangent to thorax end at neckX
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(headCx, 0, headR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Name label
    if (this.name) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = `rgb(${this.colour.r},${this.colour.g},${this.colour.b})`;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, this.y - this.size * 0.7);
    }
    ctx.globalAlpha = 1;
  }
}

const Dragonflies = {
  list: [],

  init(pond) {
    this.list = [];
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.5;
      const x = pond.cx + Math.cos(a) * pond.rx * r;
      const y = pond.cy + Math.sin(a) * pond.ry * r;
      const df = new Dragonfly(x, y);
      df._pickTarget(pond);
      this.list.push(df);
    }
  },

  update(dt, time, pond) {
    for (const df of this.list) {
      df.update(dt, time, pond);
    }
  },

  render(ctx, time) {
    for (const df of this.list) {
      df.render(ctx, time);
    }
  },

  hitTest(mx, my) {
    for (const df of this.list) {
      if (df.hitTest(mx, my)) return df;
    }
    return null;
  }
};
