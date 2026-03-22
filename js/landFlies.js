// Slow land flies — double-click land to spawn; dragonflies hunt them
const LandFlies = {
  list: [],
  maxCount: 24,

  _pickLandTarget(f, pond) {
    const w = pond.worldW;
    const h = pond.worldH;
    for (let k = 0; k < 40; k++) {
      const tx = 24 + Math.random() * (w - 48);
      const ty = 24 + Math.random() * (h - 48);
      if (!pond.isInPond(tx, ty)) {
        f.targetX = tx;
        f.targetY = ty;
        return;
      }
    }
  },

  spawn(x, y, time) {
    if (this.list.length >= this.maxCount) this.list.shift();
    const fly = {
      x,
      y,
      angle: Math.random() * Math.PI * 2,
      speed: 0.22 + Math.random() * 0.18,
      targetX: x,
      targetY: y,
      wingPhase: Math.random() * Math.PI * 2,
      eaten: false,
      born: time,
      size: 7 + Math.random() * 3,
    };
    this._pickLandTarget(fly, Pond);
    this.list.push(fly);
  },

  update(dt, time, pond) {
    const t = time * 0.001;
    const canvas = document.getElementById('pond-canvas');
    const m = 16;
    const maxX = canvas ? canvas.width - m : pond.worldW - m;
    const maxY = canvas ? canvas.height - m : pond.worldH - m;

    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      if (f.eaten) {
        this.list.splice(i, 1);
        continue;
      }

      f.wingPhase += dt * 0.022;

      const dx = f.targetX - f.x;
      const dy = f.targetY - f.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const targetAngle = Math.atan2(dy, dx);

      let diff = targetAngle - f.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      f.angle += diff * 0.055;
      f.angle += Math.sin(t * 4 + f.wingPhase) * 0.018;

      f.x += Math.cos(f.angle) * f.speed * (dt / 16);
      f.y += Math.sin(f.angle) * f.speed * (dt / 16);

      f.x = Math.max(m, Math.min(maxX, f.x));
      f.y = Math.max(m, Math.min(maxY, f.y));

      if (dist < 12) {
        this._pickLandTarget(f, pond);
        f.speed = 0.22 + Math.random() * 0.18;
      }
    }
  },

  render(ctx, time, palette) {
    const t = time * 0.001;
    const pal = palette || (typeof TimeSystem !== 'undefined' ? TimeSystem.getCurrentPalette() : null);
    const darkScene = pal && TimeSystem.skyLuminance(pal) < 0.46;

    for (const f of this.list) {
      if (f.eaten) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);

      const s = f.size;
      const flap = 0.78 + Math.abs(Math.sin(f.wingPhase * 2 + t * 12)) * 0.3;
      const lwWing = Math.max(0.85, s * 0.085) * (darkScene ? 1.2 : 1);
      const lwBody = Math.max(1, s * 0.1) * (darkScene ? 1.15 : 1);

      if (darkScene) {
        ctx.globalAlpha = 0.58;
        ctx.strokeStyle = 'rgba(235, 220, 188, 0.92)';
        ctx.lineWidth = lwWing;
        ctx.lineCap = 'round';
        const span = s * 0.55 * flap;
        const arm = s * 0.32 * flap;
        ctx.beginPath();
        ctx.moveTo(0, -span);
        ctx.lineTo(0, span);
        ctx.moveTo(-arm, 0);
        ctx.lineTo(arm, 0);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#f2e8d4';
        ctx.lineWidth = lwBody;
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, 0);
        ctx.lineTo(s * 0.2, 0);
        ctx.stroke();
        ctx.fillStyle = '#faf4ea';
        ctx.beginPath();
        ctx.arc(s * 0.22, 0, s * 0.11, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = 'rgba(55, 45, 35, 0.85)';
        ctx.lineWidth = lwWing;
        ctx.lineCap = 'round';
        const span = s * 0.55 * flap;
        const arm = s * 0.32 * flap;
        ctx.beginPath();
        ctx.moveTo(0, -span);
        ctx.lineTo(0, span);
        ctx.moveTo(-arm, 0);
        ctx.lineTo(arm, 0);
        ctx.stroke();

        ctx.globalAlpha = 0.92;
        ctx.strokeStyle = '#2a2218';
        ctx.lineWidth = lwBody;
        ctx.beginPath();
        ctx.moveTo(-s * 0.45, 0);
        ctx.lineTo(s * 0.2, 0);
        ctx.stroke();
        ctx.fillStyle = '#1a1510';
        ctx.beginPath();
        ctx.arc(s * 0.22, 0, s * 0.11, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },
};
