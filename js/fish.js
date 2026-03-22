// Fish — swim under the water surface
class Fish {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = 0.3 + Math.random() * 0.4;
    this.targetX = x;
    this.targetY = y;
    this.baseSize = 12 + Math.random() * 8;
    this.size = this.baseSize;
    this.growthLevel = 0;
    this.maxGrowth = 12;
    this.name = '';
    this.tailPhase = Math.random() * Math.PI * 2;
    this.depth = 0.3 + Math.random() * 0.5;
    this.eating = false;
    this.eatTimer = 0;
    this.dragging = false;

    // Colour — warm / complementary hues so fish read clearly on teal-green water
    const palettes = [
      { body: '#b84818', belly: '#f0a868' }, // koi rust
      { body: '#a03810', belly: '#ffc090' }, // deep orange
      { body: '#6b3d8f', belly: '#c4a0e8' }, // violet (pops vs green water)
      { body: '#1e5890', belly: '#7eb8e8' }, // saturated blue (not gray)
    ];
    this.palette = palettes[Math.floor(Math.random() * palettes.length)];
  }

  update(dt, time, pond, foodItems, drawing) {
    if (this.dragging) return;
    const t = time * 0.001;
    this.tailPhase += dt * 0.015;
    this.size = this.baseSize + this.growthLevel * 3;

    // Eating cooldown
    if (this.eating) {
      this.eatTimer -= dt;
      if (this.eatTimer <= 0) this.eating = false;
    }

    // Seek and eat nearby food
    if (!this.eating && foodItems) {
      let closest = null;
      let closestDist = 120; // detection radius
      for (const f of foodItems) {
        if (f.eaten) continue;
        const fdx = f.x - this.x;
        const fdy = f.y - this.y;
        const dist = Math.sqrt(fdx * fdx + fdy * fdy);
        if (dist < closestDist) {
          closest = f;
          closestDist = dist;
        }
      }
      if (closest) {
        // Swim toward food
        this.targetX = closest.x;
        this.targetY = closest.y;
        this.speed = 0.6 + Math.random() * 0.3;
        // Eat if close enough
        if (closestDist < 15) {
          closest.eaten = true; closest.alpha = 0;
          this.eating = true; this.eatTimer = 400;
          if (this.growthLevel < this.maxGrowth) this.growthLevel++;
        }
      }
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
    this.angle += diff * 0.04;

    // Slight wobble
    this.angle += Math.sin(t * 2 + this.tailPhase) * 0.01;

    this.x += Math.cos(this.angle) * this.speed * (dt / 16);
    this.y += Math.sin(this.angle) * this.speed * (dt / 16);

    // Reached target or left pond?
    if (dist < 20 || !pond.isInPond(this.x, this.y)) {
      this._pickTarget(pond);
    }
  }

  _pickTarget(pond) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.2 + Math.random() * 0.55;
    this.targetX = pond.cx + Math.cos(a) * pond.rx * r;
    this.targetY = pond.cy + Math.sin(a) * pond.ry * r;
    this.speed = 0.2 + Math.random() * 0.5;
  }

  render(ctx, time, palette) {
    const t = time * 0.001;
    const tailWag = Math.sin(this.tailPhase + t * 6) * 0.3;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // Stronger than before so glyphs stay visible on water; still slightly submerged
    ctx.globalAlpha = 0.62 + this.depth * 0.16;

    const s = this.size;
    const pal = palette || TimeSystem.getCurrentPalette();
    const eyes = TimeSystem.eyeColours(pal);

    // Body
    ctx.fillStyle = this.palette.body;
    ctx.font = `${Math.floor(s)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('>', s * 0.1, 0);

    // Tail
    ctx.save();
    ctx.translate(-s * 0.35, 0);
    ctx.rotate(tailWag);
    ctx.fillStyle = this.palette.body;
    ctx.font = `${Math.floor(s * 0.7)}px monospace`;
    ctx.fillText('<', 0, 0);
    ctx.restore();

    // Eyes (two pupils — same time-of-day scheme as turtle)
    ctx.fillStyle = eyes.open;
    ctx.font = `${Math.floor(s * 0.22)}px monospace`;
    const ex = s * 0.28;
    const ey = s * 0.06;
    ctx.fillText('•', ex, -ey);
    ctx.fillText('•', ex, ey);

    ctx.restore();

    // Name label
    if (this.name) {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = this.palette.body;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, this.y - this.size * 0.7);
    }
    ctx.globalAlpha = 1;
  }

  hitTest(mx, my) {
    const dx = mx - this.x;
    const dy = my - this.y;
    return dx * dx + dy * dy < (this.size + 8) * (this.size + 8);
  }
}

const Fishes = {
  list: [],

  init(pond) {
    this.list = [];
    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 0.5;
      const x = pond.cx + Math.cos(a) * pond.rx * r;
      const y = pond.cy + Math.sin(a) * pond.ry * r;
      const fish = new Fish(x, y);
      fish._pickTarget(pond);
      this.list.push(fish);
    }
  },

  update(dt, time, pond, foodItems, drawing) {
    for (const f of this.list) {
      f.update(dt, time, pond, foodItems, drawing);
    }
  },

  render(ctx, time, palette) {
    for (const f of this.list) {
      f.render(ctx, time, palette);
    }
  },

  hitTest(mx, my) {
    for (const f of this.list) {
      if (f.hitTest(mx, my)) return f;
    }
    return null;
  }
};
