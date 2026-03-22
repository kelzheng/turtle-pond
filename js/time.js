// Time of day system
const TimeSystem = {
  manualTime: null, // null = use real time

  // Get current minutes since midnight (0-1440)
  getMinutes() {
    if (this.manualTime !== null) return this.manualTime;
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  },

  // Get normalized time (0-1 over 24h)
  getNormalized() {
    return this.getMinutes() / 1440;
  },

  // Get the current "period" and blend factor
  getPeriod() {
    const m = this.getMinutes();
    // 360=6am, 600=10am, 960=4pm, 1140=7pm, 1260=9pm
    if (m < 300) return { name: 'night', blend: 1 };
    if (m < 420) return { name: 'dawn', blend: (m - 300) / 120 };
    if (m < 600) return { name: 'morning', blend: (m - 420) / 180 };
    if (m < 960) return { name: 'day', blend: 1 };
    if (m < 1140) return { name: 'golden', blend: (m - 960) / 180 };
    if (m < 1260) return { name: 'dusk', blend: (m - 1140) / 120 };
    if (m < 1380) return { name: 'twilight', blend: (m - 1260) / 120 };
    return { name: 'night', blend: 1 };
  },

  // Colour palettes for each period
  palettes: {
    night:   { sky: '#0d1b2a', land: '#1a2a1a', water: '#0a1a2a', waterLight: '#122640', accent: '#1a3050' },
    dawn:    { sky: '#2d1b3d', land: '#2a3020', water: '#1a2535', waterLight: '#253045', accent: '#4a3060' },
    morning: { sky: '#c8d8c0', land: '#8aaa70', water: '#4a8888', waterLight: '#5aaa9a', accent: '#7ab5a0' },
    day:     { sky: '#d0dcc0', land: '#7a9a5a', water: '#3a8080', waterLight: '#5aaa95', accent: '#8ac5b0' },
    golden:  { sky: '#d4a56a', land: '#8a8a40', water: '#3a7a5a', waterLight: '#5a9a70', accent: '#b0a060' },
    dusk:    { sky: '#7a5a7a', land: '#4a5a38', water: '#2a5a6a', waterLight: '#3a6a7a', accent: '#7a5a80' },
    twilight:{ sky: '#2a3545', land: '#253525', water: '#152a3a', waterLight: '#1a3555', accent: '#2a4060' },
  },

  // Lerp between two hex colours
  lerpColour(a, b, t) {
    const pa = [parseInt(a.slice(1,3),16), parseInt(a.slice(3,5),16), parseInt(a.slice(5,7),16)];
    const pb = [parseInt(b.slice(1,3),16), parseInt(b.slice(3,5),16), parseInt(b.slice(5,7),16)];
    const r = Math.round(pa[0] + (pb[0]-pa[0]) * t);
    const g = Math.round(pa[1] + (pb[1]-pa[1]) * t);
    const bl = Math.round(pa[2] + (pb[2]-pa[2]) * t);
    return `rgb(${r},${g},${bl})`;
  },

  // Get the blended palette for the current time
  getCurrentPalette() {
    const m = this.getMinutes();
    const periods = [
      { start: 0,    name: 'night' },
      { start: 300,  name: 'dawn' },
      { start: 420,  name: 'morning' },
      { start: 600,  name: 'day' },
      { start: 960,  name: 'golden' },
      { start: 1140, name: 'dusk' },
      { start: 1260, name: 'twilight' },
      { start: 1380, name: 'night' },
    ];

    let curr = periods[0], next = periods[1];
    for (let i = 0; i < periods.length - 1; i++) {
      if (m >= periods[i].start && m < periods[i+1].start) {
        curr = periods[i];
        next = periods[i+1];
        break;
      }
    }
    if (m >= 1380) {
      curr = periods[7];
      next = periods[0];
    }

    const range = (next.start > curr.start) ? next.start - curr.start : (1440 - curr.start);
    const t = Math.min(1, (m - curr.start) / range);

    const cp = this.palettes[curr.name];
    const np = this.palettes[next.name];

    return {
      sky: this.lerpColour(cp.sky, np.sky, t),
      land: this.lerpColour(cp.land, np.land, t),
      water: this.lerpColour(cp.water, np.water, t),
      waterLight: this.lerpColour(cp.waterLight, np.waterLight, t),
      accent: this.lerpColour(cp.accent, np.accent, t),
    };
  },

  isNight() {
    const m = this.getMinutes();
    return m < 330 || m > 1290;
  },

  isDusk() {
    const m = this.getMinutes();
    return m > 1100 && m < 1320;
  },

  /** 0–1 perceived brightness of palette.sky (`rgb()` or `#rrggbb`). */
  skyLuminance(palette) {
    const sky = palette && palette.sky;
    if (!sky || typeof sky !== 'string') return 0.5;
    let r;
    let g;
    let b;
    const rgb = sky.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgb) {
      r = +rgb[1];
      g = +rgb[2];
      b = +rgb[3];
    } else if (sky[0] === '#') {
      const h = sky.slice(1);
      const n = h.length === 3
        ? [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)]
        : [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
      [r, g, b] = n;
    } else {
      return 0.5;
    }
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  },

  /** Open + closed eye colours (turtle, fish, dragonflies) from sky brightness. */
  eyeColours(palette) {
    const lum = this.skyLuminance(palette);
    if (lum < 0.42) {
      return { open: '#f2efe4', closed: '#9a9688' };
    }
    if (lum < 0.58) {
      return { open: '#1a1810', closed: '#3a3530' };
    }
    return { open: '#000000', closed: '#2a4a2a' };
  },
};
