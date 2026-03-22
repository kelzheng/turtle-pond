// Input handling — mouse/touch: drag, double-click, draw, erase, right-click pet
const Input = {
  mouseX: 0,
  mouseY: 0,
  dragging: null,
  draggingType: null,
  dragOffsetX: 0,
  dragOffsetY: 0,
  mouseDown: false,
  drawMode: false,
  lastClickTime: 0,
  lastClickX: 0,
  lastClickY: 0,
  didDrag: false,
  clickedCreature: null,
  pendingStatusBarName: null,
  statusBarNameCancelled: false,
  _statusBarDownSX: 0,
  _statusBarDownSY: 0,
  hearts: [], // floating heart animations

  init(canvas, turtle, dragonflies, food, drawing, pond, ripples) {
    this.canvas = canvas;
    this.turtle = turtle;
    this.dragonflies = dragonflies;
    this.food = food;
    this.drawing = drawing;
    this.pond = pond;
    this.ripples = ripples;

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) return; // right-click handled separately
      this._onDown(e.clientX, e.clientY, e);
    });
    canvas.addEventListener('mousemove', (e) => this._onMove(e.clientX, e.clientY));
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 2) return;
      this._onUp(e.clientX, e.clientY);
    });
    canvas.addEventListener('dblclick', (e) => this._onDoubleClick(e.clientX, e.clientY));

    // Right-click for petting/hearts
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this._onRightClick(e.clientX, e.clientY);
    });

    // Touch events
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this._onDown(t.clientX, t.clientY, e);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      this._onMove(t.clientX, t.clientY);
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (t) this._onUp(t.clientX, t.clientY);
      else this._onUp(0, 0);
    }, { passive: false });
  },

  _getPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX + App.camX,
      y: (clientY - rect.top) * scaleY + App.camY
    };
  },

  /** Canvas pixel coordinates (status bar / UI — no camera offset). */
  _screenPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  },

  // Find any creature at position (turtle, fish, dragonfly)
  _creatureAt(x, y) {
    if (this.turtle.hitTest(x, y)) return { creature: this.turtle, type: 'turtle' };
    const df = this.dragonflies.hitTest(x, y);
    if (df) return { creature: df, type: 'dragonfly' };
    if (typeof Fishes !== 'undefined') {
      const fish = Fishes.hitTest(x, y);
      if (fish) return { creature: fish, type: 'fish' };
    }
    return null;
  },

  _onRightClick(clientX, clientY) {
    const pos = this._getPos(clientX, clientY);
    const hit = this._creatureAt(pos.x, pos.y);
    if (hit) {
      const c = hit.creature;
      if (!c.pets) c.pets = 0;
      c.pets++;
      // Heart size grows with total pets (capped)
      const heartSize = Math.min(36, 14 + c.pets * 2);
      this.hearts.push({
        x: c.x,
        y: c.y - (c.size || 20) * 0.5,
        born: performance.now(),
        duration: 1500,
        baseSize: heartSize,
      });
    }
  },

  _onDown(clientX, clientY, e) {
    const pos = this._getPos(clientX, clientY);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.mouseDown = true;
    this.didDrag = false;
    this.clickedCreature = null;
    this.pendingStatusBarName = null;
    this.statusBarNameCancelled = false;

    // Eraser mode
    if (this.drawing.eraserMode) {
      this.drawing.eraseAt(pos.x, pos.y);
      this.drawMode = true;
      return;
    }

    // Unnamed creature names: click the label in the status bar (canvas pixels)
    const sp = this._screenPos(clientX, clientY);
    const barHit = App.statusBarHitTest(sp.x, sp.y);
    if (barHit) {
      this.pendingStatusBarName = barHit;
      this._statusBarDownSX = sp.x;
      this._statusBarDownSY = sp.y;
      return;
    }

    // Check turtle
    if (this.turtle.hitTest(pos.x, pos.y)) {
      this.dragging = this.turtle;
      this.draggingType = 'turtle';
      this.clickedCreature = this.turtle;
      this.turtle.dragging = true;
      this.dragOffsetX = this.turtle.x - pos.x;
      this.dragOffsetY = this.turtle.y - pos.y;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Check dragonflies
    const df = this.dragonflies.hitTest(pos.x, pos.y);
    if (df) {
      this.dragging = df;
      this.draggingType = 'dragonfly';
      this.clickedCreature = df;
      df.dragging = true;
      this.dragOffsetX = df.x - pos.x;
      this.dragOffsetY = df.y - pos.y;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Check fish (now draggable)
    if (typeof Fishes !== 'undefined') {
      const fish = Fishes.hitTest(pos.x, pos.y);
      if (fish) {
        this.dragging = fish;
        this.draggingType = 'fish';
        this.clickedCreature = fish;
        fish.dragging = true;
        this.dragOffsetX = fish.x - pos.x;
        this.dragOffsetY = fish.y - pos.y;
        this.canvas.style.cursor = 'grabbing';
        return;
      }
    }

    // Check drawn elements
    const el = this.drawing.hitTest(pos.x, pos.y);
    if (el) {
      this.dragging = el;
      this.draggingType = 'element';
      this.dragOffsetX = el.x - pos.x;
      this.dragOffsetY = el.y - pos.y;
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    // Otherwise, start drawing
    this.drawMode = true;
    this.drawing.startDraw(pos.x, pos.y);
  },

  _onMove(clientX, clientY) {
    const pos = this._getPos(clientX, clientY);
    this.mouseX = pos.x;
    this.mouseY = pos.y;

    if (this.drawing.eraserMode && this.mouseDown) {
      this.drawing.eraseAt(pos.x, pos.y);
      return;
    }

    if (this.dragging) {
      this.didDrag = true;
      this.dragging.x = pos.x + this.dragOffsetX;
      this.dragging.y = pos.y + this.dragOffsetY;
      return;
    }

    if (this.drawMode) {
      this.drawing.continueDraw(pos.x, pos.y, this.pond);
      return;
    }

    if (this.pendingStatusBarName && this.mouseDown) {
      const sp = this._screenPos(clientX, clientY);
      if (Math.hypot(sp.x - this._statusBarDownSX, sp.y - this._statusBarDownSY) > 10) {
        this.statusBarNameCancelled = true;
      }
    }

    // Hover cursor
    const spHover = this._screenPos(clientX, clientY);
    if (this.drawing.eraserMode) {
      this.canvas.style.cursor = 'crosshair';
    } else if (App.statusBarHitTest(spHover.x, spHover.y)) {
      this.canvas.style.cursor = 'pointer';
    } else if (this._creatureAt(pos.x, pos.y) || this.drawing.hitTest(pos.x, pos.y)) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
  },

  _onUp(clientX, clientY) {
    if (this.pendingStatusBarName && !this.statusBarNameCancelled) {
      const { creature, type } = this.pendingStatusBarName;
      if (!creature.name) {
        setTimeout(() => {
          const name = prompt(`Name this ${type}:`);
          if (name !== null && name.trim()) creature.name = name.trim();
        }, 50);
      }
    }
    this.pendingStatusBarName = null;
    this.statusBarNameCancelled = false;

    if (this.dragging) {
      if (this.draggingType === 'turtle') {
        this.turtle.dragging = false;
        this.turtle.state = 'wander';
        this.turtle.stateTimer = 1000;
        this.turtle.eyesClosed = false;
        this.turtle._pickWanderTarget(this.pond);
        if (this.pond.isInPond(this.turtle.x, this.turtle.y)) {
          this.ripples.push({
            x: this.turtle.x, y: this.turtle.y,
            born: performance.now(), maxRadius: 30, duration: 1.5
          });
        }
      } else if (this.draggingType === 'dragonfly') {
        this.dragging.dragging = false;
        this.dragging._pickTarget(this.pond);
      } else if (this.draggingType === 'fish') {
        this.dragging.dragging = false;
        this.dragging._pickTarget(this.pond);
      }
      this.dragging = null;
      this.draggingType = null;
      this.canvas.style.cursor = this.drawing.eraserMode ? 'crosshair' : 'default';
    }

    this.clickedCreature = null;

    if (this.drawMode) {
      this.drawing.endDraw();
      this.drawMode = false;
    }

    this.mouseDown = false;
  },

  _onDoubleClick(clientX, clientY) {
    const pos = this._getPos(clientX, clientY);
    if (this.drawing.eraserMode) return;
    if (this.pond.isInPond(pos.x, pos.y)) {
      this.food.spawn(pos.x, pos.y, performance.now());
      this.ripples.push({
        x: pos.x, y: pos.y,
        born: performance.now(), maxRadius: 15, duration: 1
      });
    } else if (typeof LandFlies !== 'undefined') {
      LandFlies.spawn(pos.x, pos.y, performance.now());
    }
  },

  // Update heart animations
  updateHearts(dt) {
    const now = performance.now();
    for (let i = this.hearts.length - 1; i >= 0; i--) {
      if (now - this.hearts[i].born > this.hearts[i].duration) {
        this.hearts.splice(i, 1);
      }
    }
  },

  // Render floating hearts (size grows with pet count, no counter)
  renderHearts(ctx, time) {
    const now = performance.now();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const h of this.hearts) {
      const age = (now - h.born) / h.duration;
      const y = h.y - age * 50;
      const alpha = 1 - age;
      // Start small, pop up to full size, then fade
      const pop = age < 0.15 ? age / 0.15 : 1;
      const sz = (h.baseSize || 18) * pop;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e86a6a';
      ctx.font = `${Math.floor(sz)}px monospace`;
      ctx.fillText('♥', h.x, y);
    }
    ctx.globalAlpha = 1;
  }
};
