// Big rock in the middle of the pond
const PondRock = {
  x: 0,
  y: 0,
  size: 90,

  init(pond) {
    this.x = pond.cx + pond.rx * 0.05;
    this.y = pond.cy - pond.ry * 0.1;
  },

  render(ctx, time) {
    const s = this.size;
    ctx.save();
    ctx.translate(this.x, this.y);

    // Irregular rock shape using bezier curves
    ctx.fillStyle = 'rgba(115,112,100,0.55)';
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.1);
    ctx.bezierCurveTo(-s * 0.75, -s * 0.35, -s * 0.4, -s * 0.5, -s * 0.1, -s * 0.45);
    ctx.bezierCurveTo(s * 0.15, -s * 0.55, s * 0.5, -s * 0.4, s * 0.7, -s * 0.25);
    ctx.bezierCurveTo(s * 0.85, -s * 0.15, s * 0.8, s * 0.1, s * 0.65, s * 0.25);
    ctx.bezierCurveTo(s * 0.5, s * 0.4, s * 0.2, s * 0.45, -s * 0.05, s * 0.38);
    ctx.bezierCurveTo(-s * 0.3, s * 0.42, -s * 0.55, s * 0.3, -s * 0.7, s * 0.15);
    ctx.bezierCurveTo(-s * 0.8, s * 0.05, -s * 0.78, -s * 0.05, -s * 0.7, -s * 0.1);
    ctx.closePath();
    ctx.fill();

    // ASCII rock texture
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#4a4a3a';
    ctx.globalAlpha = 0.7;

    ctx.font = `${Math.floor(s * 0.3)}px monospace`;
    ctx.fillText('O', -s * 0.4, -s * 0.15);
    ctx.fillText('@', s * 0.3, -s * 0.1);
    ctx.fillText('O', s * 0.5, s * 0.1);
    ctx.fillText('@', -s * 0.15, s * 0.1);

    ctx.font = `${Math.floor(s * 0.22)}px monospace`;
    ctx.fillText('o', -s * 0.55, s * 0.08);
    ctx.fillText('o', s * 0.1, -s * 0.3);
    ctx.fillText('o', s * 0.45, s * 0.25);
    ctx.fillText('o', -s * 0.35, s * 0.25);

    ctx.font = `${Math.floor(s * 0.16)}px monospace`;
    ctx.fillStyle = '#5a5a4a';
    ctx.fillText('·', 0, -s * 0.2);
    ctx.fillText('·', -s * 0.25, -s * 0.3);
    ctx.fillText('·', s * 0.2, s * 0.2);
    ctx.fillText('·', -s * 0.5, -s * 0.1);
    ctx.fillText('·', s * 0.55, -s * 0.05);
    ctx.fillText('·', -s * 0.1, s * 0.3);
    ctx.fillText('·', s * 0.35, -s * 0.25);

    ctx.restore();
    ctx.globalAlpha = 1;
  }
};
