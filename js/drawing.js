// Drawing system — lily pads, flowers, rocks
const Drawing = {
  elements: [],
  isDrawing: false,
  lastDrawX: 0,
  lastDrawY: 0,
  minDrawDist: 50, // min distance between drawn elements
  maxElements: Infinity, // no limit on drawn elements
  eraserMode: false,

  // Lily pad ASCII patterns
  lilyPadChars: ['@', '◎'],
  flowerChars: ['✿', '*', '❀', '✾', '⚘'],
  landFlowerChars: ['*', '+', '✿', '❀'],

  // Pastel flower colours
  flowerColours: [
    '#d4a0b0', // dusty pink
    '#b0a0d4', // lavender
    '#d4c8a0', // pale yellow
    '#a0d4b0', // mint
    '#d4b0a0', // peach
  ],

  startDraw(x, y) {
    this.isDrawing = true;
    this.lastDrawX = x;
    this.lastDrawY = y;
  },

  continueDraw(x, y, pond) {
    if (!this.isDrawing) return;
    if (this.elements.length >= this.maxElements) return;

    const dx = x - this.lastDrawX;
    const dy = y - this.lastDrawY;
    if (dx * dx + dy * dy < this.minDrawDist * this.minDrawDist) return;

    const inPond = pond.isInPond(x, y);

    if (inPond) {
      // Draw lily pad on water
      this.elements.push({
        type: 'lilypad',
        x: x,
        y: y,
        size: 24 + Math.random() * 14,
        rotation: Math.random() * Math.PI * 2,
        char: this.lilyPadChars[Math.floor(Math.random() * this.lilyPadChars.length)],
        colour: `hsl(${120 + Math.random() * 30}, ${40 + Math.random() * 20}%, ${45 + Math.random() * 15}%)`,
        hasFlower: Math.random() > 0.5,
        flowerColour: this.flowerColours[Math.floor(Math.random() * this.flowerColours.length)],
        flowerChar: this.flowerChars[Math.floor(Math.random() * this.flowerChars.length)],
      });
    } else {
      // Draw on land
      const r = Math.random();
      if (r < 0.6) {
        // Flower
        this.elements.push({
          type: 'landflower',
          x: x,
          y: y,
          size: 18 + Math.random() * 10,
          char: this.landFlowerChars[Math.floor(Math.random() * this.landFlowerChars.length)],
          colour: this.flowerColours[Math.floor(Math.random() * this.flowerColours.length)],
        });
      } else {
        // Rock
        this.elements.push({
          type: 'rock',
          x: x,
          y: y,
          size: 18 + Math.random() * 12,
          char: this.rockChars[Math.floor(Math.random() * this.rockChars.length)],
          colour: `hsl(${30 + Math.random() * 20}, ${15 + Math.random() * 10}%, ${50 + Math.random() * 15}%)`,
        });
      }
    }

    this.lastDrawX = x;
    this.lastDrawY = y;
  },

  endDraw() {
    this.isDrawing = false;
  },

  // Also place a single element on click
  placeAt(x, y, pond) {
    if (this.elements.length >= this.maxElements) return;
    const inPond = pond.isInPond(x, y);
    if (inPond) {
      this.elements.push({
        type: 'lilypad',
        x: x,
        y: y,
        size: 26 + Math.random() * 14,
        rotation: Math.random() * Math.PI * 2,
        char: this.lilyPadChars[Math.floor(Math.random() * this.lilyPadChars.length)],
        colour: `hsl(${120 + Math.random() * 30}, ${40 + Math.random() * 20}%, ${45 + Math.random() * 15}%)`,
        hasFlower: Math.random() > 0.4,
        flowerColour: this.flowerColours[Math.floor(Math.random() * this.flowerColours.length)],
        flowerChar: this.flowerChars[Math.floor(Math.random() * this.flowerChars.length)],
      });
    } else {
      this.elements.push({
        type: 'landflower',
        x: x,
        y: y,
        size: 20 + Math.random() * 10,
        char: this.landFlowerChars[Math.floor(Math.random() * this.landFlowerChars.length)],
        colour: this.flowerColours[Math.floor(Math.random() * this.flowerColours.length)],
      });
    }
  },

  render(ctx, time) {
    const t = time * 0.001;

    for (const el of this.elements) {
      ctx.save();
      ctx.translate(el.x, el.y);

      if (el.type === 'lilypad') {
        // Gentle bob on water
        const bob = Math.sin(t * 0.8 + el.x * 0.05) * 1.5;
        ctx.translate(0, bob);
        ctx.rotate(el.rotation + Math.sin(t * 0.3 + el.x * 0.02) * 0.05);

        // Lily pad
        ctx.fillStyle = el.colour;
        ctx.globalAlpha = 0.8;
        ctx.font = `${el.size}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(el.char, 0, 0);

        // Flower on top
        if (el.hasFlower) {
          ctx.fillStyle = el.flowerColour;
          ctx.globalAlpha = 0.9;
          ctx.font = `${el.size * 0.6}px monospace`;
          ctx.fillText(el.flowerChar, el.size * 0.15, -el.size * 0.15);
        }

      } else if (el.type === 'landflower') {
        ctx.fillStyle = el.colour;
        ctx.globalAlpha = 0.8;
        ctx.font = `${el.size}px monospace`;
        ctx.textAlign = 'center';
        // Gentle sway
        const sway = Math.sin(t * 1.5 + el.x * 0.03) * 0.1;
        ctx.rotate(sway);
        ctx.fillText(el.char, 0, 0);

        // Stem
        ctx.fillStyle = '#5a7a4a';
        ctx.font = `${el.size * 0.5}px monospace`;
        ctx.fillText('|', 0, el.size * 0.4);

      } else if (el.type === 'rock') {
        ctx.fillStyle = el.colour;
        ctx.globalAlpha = 0.7;
        ctx.font = `${el.size}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(el.char, 0, 0);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  },

  // Hit test — returns element at position or null
  hitTest(mx, my) {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      const dx = mx - el.x;
      const dy = my - el.y;
      if (dx * dx + dy * dy < el.size * el.size) return el;
    }
    return null;
  },

  // Remove a specific element
  removeElement(el) {
    const idx = this.elements.indexOf(el);
    if (idx !== -1) this.elements.splice(idx, 1);
  },

  // Remove element near position (for eraser)
  eraseAt(mx, my) {
    for (let i = this.elements.length - 1; i >= 0; i--) {
      const el = this.elements[i];
      const dx = mx - el.x;
      const dy = my - el.y;
      if (dx * dx + dy * dy < (el.size + 10) * (el.size + 10)) {
        this.elements.splice(i, 1);
        return true;
      }
    }
    return false;
  },

  // Pre-populate some lily pads
  initDefaults(pond) {
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 0.5;
      const x = pond.cx + Math.cos(a) * pond.rx * r;
      const y = pond.cy + Math.sin(a) * pond.ry * r;
      this.elements.push({
        type: 'lilypad',
        x: x,
        y: y,
        size: 28 + Math.random() * 16,
        rotation: Math.random() * Math.PI * 2,
        char: this.lilyPadChars[Math.floor(Math.random() * this.lilyPadChars.length)],
        colour: `hsl(${120 + Math.random() * 30}, ${40 + Math.random() * 20}%, ${45 + Math.random() * 15}%)`,
        hasFlower: Math.random() > 0.5,
        flowerColour: this.flowerColours[Math.floor(Math.random() * this.flowerColours.length)],
        flowerChar: this.flowerChars[Math.floor(Math.random() * this.flowerChars.length)],
      });
    }
  }
};
