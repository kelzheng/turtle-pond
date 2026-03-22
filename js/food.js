// Food pellets
const Food = {
  items: [],

  spawn(x, y, time) {
    this.items.push({
      x: x,
      y: y,
      born: time,
      eaten: false,
      targeted: false,
      sinkSpeed: 0.01,
      alpha: 1,
      size: 10 + Math.random() * 4,
    });
  },

  update(dt, time, turtle) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      const age = (time - f.born) / 1000;

      // Slowly sink / fade
      f.alpha = Math.max(0, 1 - age / 15);

      // Mouth must overlap pellet (shell center stays far from small food on the ground)
      const reach = turtle._mouthDistanceTo(f.x, f.y);
      if (reach < 20 + f.size * 0.35 && !f.eaten) {
        f.eaten = true;
        f.alpha = 0;
        turtle._grow();
      }

      // Remove old or eaten food
      if (f.alpha <= 0 || age > 20) {
        this.items.splice(i, 1);
      }
    }
  },

  render(ctx, time) {
    const t = time * 0.001;
    for (const f of this.items) {
      if (f.eaten) continue;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.globalAlpha = f.alpha;

      // Food pellet — visible earthy circle
      ctx.textAlign = 'center';
      const bob = Math.sin(t * 2 + f.x * 0.1) * 2;

      // Outer glow
      ctx.fillStyle = 'rgba(180, 140, 90, 0.3)';
      ctx.beginPath();
      ctx.arc(0, bob, f.size * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // Inner pellet
      ctx.fillStyle = '#c09a60';
      ctx.beginPath();
      ctx.arc(0, bob, f.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      // ASCII on top
      ctx.fillStyle = '#8a6a40';
      ctx.font = `${Math.floor(f.size)}px monospace`;
      ctx.fillText('•', 0, bob + f.size * 0.15);

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
};
