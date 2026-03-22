// Input handling — mouse/touch: drag, double-click, draw, erase, right-click pet, pinch zoom/pan
const Input = {
  PINCH_ZOOM_MIN: 0.38,
  PINCH_ZOOM_MAX: 2.75,
  pinchActive: false,
  pinchStartDist: 1,
  pinchStartZoom: 1,
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
  /** Double-tap feed (mobile): previous tap time + screen coords (client pixels). */
  lastTapTime: 0,
  lastTapClientX: 0,
  lastTapClientY: 0,
  lastTouchClientX: 0,
  lastTouchClientY: 0,
  /** World-space finger travel while drawing (touch) — invalidates double-tap feed. */
  _touchDrawAccum: 0,
  _touchPrevWorldX: 0,
  _touchPrevWorldY: 0,
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

    // Touch: single finger = draw/drag/tap; two fingers = pinch zoom + pan
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        if (this.mouseDown) this._abortForPinch();
        this.lastTouchClientX = t0.clientX;
        this.lastTouchClientY = t0.clientY;
        this._pinchStart(t0, t1);
        return;
      }
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      this.lastTouchClientX = t.clientX;
      this.lastTouchClientY = t.clientY;
      this._touchDrawAccum = 0;
      this._onDown(t.clientX, t.clientY, e);
      this._touchPrevWorldX = this.mouseX;
      this._touchPrevWorldY = this.mouseY;
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        this._pinchMove(e.touches[0], e.touches[1]);
        return;
      }
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      this.lastTouchClientX = t.clientX;
      this.lastTouchClientY = t.clientY;
      this._onMove(t.clientX, t.clientY);
      if (this.mouseDown && this.drawMode && !this.dragging) {
        const p = this._getPos(t.clientX, t.clientY);
        this._touchDrawAccum += Math.hypot(p.x - this._touchPrevWorldX, p.y - this._touchPrevWorldY);
        this._touchPrevWorldX = p.x;
        this._touchPrevWorldY = p.y;
      }
    }, { passive: false });
    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) return;
      const t = e.changedTouches[0];
      this._onTouchEnd(t);
    }, { passive: false });
    canvas.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.pinchActive = false;
      this.lastTapTime = 0;
      if (e.touches.length > 0) return;
      const x = this.lastTouchClientX;
      const y = this.lastTouchClientY;
      if (this.mouseDown) this._onUp(x, y);
    }, { passive: false });
  },

  _getPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const sx = (clientX - rect.left) * scaleX;
    const sy = (clientY - rect.top) * scaleY;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const z = App.viewZoom;
    return {
      x: (sx - w / 2) / z + App.viewCenterX,
      y: (sy - h / 2) / z + App.viewCenterY,
    };
  },

  _clientToCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  },

  _abortForPinch() {
    this.pendingStatusBarName = null;
    this.statusBarNameCancelled = false;
    if (this.dragging) {
      if (this.draggingType === 'turtle') {
        this.turtle.dragging = false;
        this.turtle.state = 'wander';
        this.turtle.stateTimer = 1000;
        this.turtle.eyesClosed = false;
        this.turtle._pickWanderTarget(this.pond);
      } else if (this.draggingType === 'dragonfly' || this.draggingType === 'fish') {
        this.dragging.dragging = false;
        this.dragging._pickTarget(this.pond);
      }
      this.dragging = null;
      this.draggingType = null;
    }
    this.clickedCreature = null;
    if (this.drawMode) {
      this.drawing.endDraw();
      this.drawMode = false;
    }
    this.mouseDown = false;
    this.lastTapTime = 0;
    this.canvas.style.cursor = this.drawing.eraserMode ? 'crosshair' : 'default';
  },

  _pinchStart(t0, t1) {
    const p0 = this._clientToCanvas(t0.clientX, t0.clientY);
    const p1 = this._clientToCanvas(t1.clientX, t1.clientY);
    this.pinchStartDist = Math.max(28, Math.hypot(p1.x - p0.x, p1.y - p0.y));
    this.pinchStartZoom = App.viewZoom;
    this.pinchActive = true;
  },

  _pinchMove(t0, t1) {
    if (!this.pinchActive) return;
    const p0 = this._clientToCanvas(t0.clientX, t0.clientY);
    const p1 = this._clientToCanvas(t1.clientX, t1.clientY);
    const mx = (p0.x + p1.x) / 2;
    const my = (p0.y + p1.y) / 2;
    const dist = Math.max(24, Math.hypot(p1.x - p0.x, p1.y - p0.y));
    const w = this.canvas.width;
    const h = this.canvas.height;
    const oldZ = App.viewZoom;
    const worldX = (mx - w / 2) / oldZ + App.viewCenterX;
    const worldY = (my - h / 2) / oldZ + App.viewCenterY;
    let newZ = this.pinchStartZoom * (dist / this.pinchStartDist);
    newZ = Math.min(this.PINCH_ZOOM_MAX, Math.max(this.PINCH_ZOOM_MIN, newZ));
    App.viewCenterX = worldX - (mx - w / 2) / newZ;
    App.viewCenterY = worldY - (my - h / 2) / newZ;
    App.viewZoom = newZ;
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

  /**
   * Two quick taps in place ≈ desktop double-click (feed / land fly).
   * Ignored after drags, eraser, or status-bar naming.
   */
  _onTouchEnd(touch) {
    const endedPinch = this.pinchActive;
    if (endedPinch) {
      this.pinchActive = false;
      this.lastTapTime = 0;
    }

    const hadStatusBarPending = !!this.pendingStatusBarName;
    const hadDrag = this.didDrag;
    const drawTravel = this._touchDrawAccum;
    const cx = touch ? touch.clientX : this.lastTouchClientX;
    const cy = touch ? touch.clientY : this.lastTouchClientY;

    if (touch) {
      this.lastTouchClientX = touch.clientX;
      this.lastTouchClientY = touch.clientY;
    }

    if (touch && this.mouseDown) this._onUp(cx, cy);

    if (hadStatusBarPending || this.drawing.eraserMode) {
      this.lastTapTime = 0;
      return;
    }
    if (hadDrag) {
      this.lastTapTime = 0;
      return;
    }
    if (drawTravel > 38) {
      this.lastTapTime = 0;
      return;
    }

    const maxGapMs = 420;
    const maxDistPx = 52;
    const now = performance.now();
    if (
      this.lastTapTime > 0 &&
      now - this.lastTapTime < maxGapMs &&
      Math.hypot(cx - this.lastTapClientX, cy - this.lastTapClientY) < maxDistPx
    ) {
      this._onDoubleClick(cx, cy);
      this.lastTapTime = 0;
    } else {
      this.lastTapTime = now;
      this.lastTapClientX = cx;
      this.lastTapClientY = cy;
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
