// Pond rendering — water, land, edges
const Pond = {
  // Pond shape defined as a set of points forming an irregular oval
  points: [],
  waterChars: ['~', '~', '~', '≈', '∽', '∼'],
  landChars: ['.', ' ', '.', ' ', ' ', '.', ' ', ' '],
  grassChars: ['.', ' ', '.', ' '],
  stoneChars: ['·', '·'],
  fontSize: 14,
  charW: 0,
  charH: 0,
  cx: 0,
  cy: 0,
  rx: 0,
  ry: 0,

  // Fixed world size — pond doesn't scale with window
  worldW: 800,
  worldH: 700,

  init(canvas) {
    // Fixed pond dimensions
    this.cx = this.worldW * 0.48;
    this.cy = this.worldH * 0.52;
    this.rx = this.worldW * 0.35;
    this.ry = this.worldH * 0.33;
    this.charW = this.fontSize * 0.65;
    this.charH = this.fontSize * 1.2;

    // Generate irregular pond boundary with perlin-ish wobble
    this.points = [];
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      const wobble = 1 + 0.08 * Math.sin(a * 3.7) + 0.05 * Math.cos(a * 7.3) + 0.03 * Math.sin(a * 11.1);
      this.points.push({
        x: this.cx + Math.cos(a) * this.rx * wobble,
        y: this.cy + Math.sin(a) * this.ry * wobble
      });
    }
  },

  resize(canvas) {
    // no-op — pond is fixed size now
  },

  // Check if a point is inside the pond
  isInPond(x, y) {
    const dx = (x - this.cx) / this.rx;
    const dy = (y - this.cy) / this.ry;
    const dist = dx * dx + dy * dy;
    // Use the same wobble for consistency
    const a = Math.atan2(dy, dx);
    const wobble = 1 + 0.08 * Math.sin(a * 3.7) + 0.05 * Math.cos(a * 7.3) + 0.03 * Math.sin(a * 11.1);
    return dist < wobble * wobble;
  },

  // Get distance from pond edge (negative = inside, positive = outside)
  distFromEdge(x, y) {
    const dx = (x - this.cx) / this.rx;
    const dy = (y - this.cy) / this.ry;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const a = Math.atan2(dy, dx);
    const wobble = 1 + 0.08 * Math.sin(a * 3.7) + 0.05 * Math.cos(a * 7.3) + 0.03 * Math.sin(a * 11.1);
    return dist - wobble;
  },

  render(ctx, canvas, time, palette) {
    const w = canvas.width;
    const h = canvas.height;
    const t = time * 0.001;

    ctx.font = `${this.fontSize}px monospace`;

    // Draw pond background fill — same shape as the wave boundary, just slightly larger
    ctx.fillStyle = palette.water;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    const fillMargin = 1.08; // slight overshoot so no gaps at edges
    // Use the same wobble as the pond boundary points
    ctx.moveTo(
      this.cx + (this.points[0].x - this.cx) * fillMargin,
      this.cy + (this.points[0].y - this.cy) * fillMargin
    );
    for (let i = 0; i < this.points.length; i++) {
      const cur = this.points[i];
      const next = this.points[(i + 1) % this.points.length];
      const cx1 = this.cx + (cur.x - this.cx) * fillMargin;
      const cy1 = this.cy + (cur.y - this.cy) * fillMargin;
      const nx = this.cx + (next.x - this.cx) * fillMargin;
      const ny = this.cy + (next.y - this.cy) * fillMargin;
      const midX = (cx1 + nx) / 2;
      const midY = (cy1 + ny) / 2;
      ctx.quadraticCurveTo(cx1, cy1, midX, midY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // Render grid of ASCII characters
    for (let y = 0; y < h; y += this.charH) {
      for (let x = 0; x < w; x += this.charW) {
        const d = this.distFromEdge(x, y);

        if (d < -0.05) {
          // Water
          const waveOffset = Math.sin(x * 0.02 + t * 0.8) * 0.5 + Math.cos(y * 0.015 + t * 0.6) * 0.5;
          const charIdx = Math.floor((x * 0.1 + y * 0.1 + t * 2 + waveOffset) % this.waterChars.length);
          const char = this.waterChars[Math.abs(charIdx) % this.waterChars.length];

          // Depth-based colour
          const depth = Math.min(1, Math.abs(d) * 1.5);
          const alpha = 0.7 + depth * 0.25;

          // Shimmer
          const shimmer = Math.sin(x * 0.05 + y * 0.03 + t * 1.5) * 0.15;

          if (depth < 0.3) {
            ctx.fillStyle = palette.waterLight;
            ctx.globalAlpha = alpha + shimmer;
          } else {
            ctx.fillStyle = palette.water;
            ctx.globalAlpha = alpha + shimmer * 0.5;
          }
          ctx.fillText(char, x, y + this.fontSize);

        } else if (d < 0.08) {
          // Pond edge — muddy shore
          ctx.fillStyle = palette.land;
          ctx.globalAlpha = 0.8;
          const edgeChars = ['·', '.', ':', '·', '.'];
          const ci = Math.floor((x * 0.3 + y * 0.2) % edgeChars.length);
          ctx.fillText(edgeChars[ci], x, y + this.fontSize);

        } else if (d < 0.18) {
          // Grass ring near pond edge — very subtle
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = palette.land;
          const ci = Math.floor((x * 0.2 + y * 0.3) % this.grassChars.length);
          ctx.fillText(this.grassChars[Math.abs(ci) % this.grassChars.length], x, y + this.fontSize);

        } else {
          // Land — very minimal, mostly blank
          ctx.fillStyle = palette.land;
          const hash = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
          const r = hash - Math.floor(hash);
          if (r > 0.985) {
            // Very rare subtle dot
            ctx.globalAlpha = 0.2;
            ctx.fillText('·', x, y + this.fontSize);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  },

  // Render water ripples
  renderRipples(ctx, ripples, time) {
    const t = time * 0.001;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rip = ripples[i];
      const age = (time - rip.born) / 1000;
      if (age > rip.duration) {
        ripples.splice(i, 1);
        continue;
      }
      const progress = age / rip.duration;
      const radius = rip.maxRadius * progress;
      const alpha = (1 - progress) * 0.4;

      ctx.strokeStyle = `rgba(200, 230, 220, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Second ring
      if (radius > 5) {
        ctx.strokeStyle = `rgba(200, 230, 220, ${alpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(rip.x, rip.y, radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
};
