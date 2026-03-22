// Turtle — state, AI, rendering
const Turtle = {
  x: 0,
  y: 0,
  angle: 0,        // facing direction in radians
  speed: 0.4,
  targetSpeed: 0.4,
  inWater: true,
  dragging: false,
  baseSize: 55,
  size: 55,
  growthLevel: 0, // increases when eating
  maxGrowth: 20,
  name: '',

  // AI state
  state: 'wander',  // wander, seekFood, idle, surfacing, toLand, toWater
  stateTimer: 0,
  wanderAngle: 0,
  targetX: 0,
  targetY: 0,
  idleDuration: 0,
  surfaceTimer: 0,
  headUp: false,
  eating: false,
  eatTimer: 0,
  wiggle: 0,
  eyesClosed: false,

  // Movement smoothing
  turnSpeed: 0.03,

  init(pondCx, pondCy) {
    this.x = pondCx + (Math.random() - 0.5) * 60;
    this.y = pondCy + (Math.random() - 0.5) * 40;
    this.angle = Math.random() * Math.PI * 2;
    this.wanderAngle = this.angle;
  },

  update(dt, time, pond, foodItems, ripples, drawing) {
    if (this.dragging) return;

    const t = time * 0.001;
    this.wiggle = Math.sin(t * 3) * 0.05;

    // Update size based on growth
    this.size = this.baseSize + this.growthLevel * 8;

    // Occasionally nibble a nearby lilypad or flower
    if (drawing && Math.random() < 0.0005) {
      for (let i = drawing.elements.length - 1; i >= 0; i--) {
        const el = drawing.elements[i];
        if (el.type !== 'lilypad' && el.type !== 'landflower') continue;
        const dx = el.x - this.x;
        const dy = el.y - this.y;
        if (dx * dx + dy * dy < 50 * 50) {
          drawing.elements.splice(i, 1);
          this._grow();
          break;
        }
      }
    }
    this.inWater = pond.isInPond(this.x, this.y);

    // State machine
    switch (this.state) {
      case 'wander':
        this._wander(dt, pond);
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          // Chance to idle, surface, or go to land
          const r = Math.random();
          if (r < 0.2 && this.inWater) {
            this.state = 'surfacing';
            this.stateTimer = 2000 + Math.random() * 2000;
            this.headUp = true;
            ripples.push({ x: this.x, y: this.y, born: time, maxRadius: 20, duration: 1.5 });
          } else if (r < 0.35 && this.inWater) {
            this.state = 'toLand';
            this._pickLandTarget(pond);
          } else if (r < 0.4 && !this.inWater) {
            this.state = 'toWater';
            this.targetX = pond.cx + (Math.random() - 0.5) * pond.rx * 0.5;
            this.targetY = pond.cy + (Math.random() - 0.5) * pond.ry * 0.5;
          } else {
            this.state = 'idle';
            this.idleDuration = 1000 + Math.random() * 3000;
            this.stateTimer = this.idleDuration;
          }
        }
        // Check for nearby food
        this._checkForFood(foodItems);
        break;

      case 'idle':
        this.targetSpeed = 0;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'wander';
          this.stateTimer = 3000 + Math.random() * 5000;
          this._pickWanderTarget(pond);
        }
        this._checkForFood(foodItems);
        break;

      case 'surfacing':
        this.targetSpeed = 0;
        this.headUp = true;
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.headUp = false;
          this.state = 'wander';
          this.stateTimer = 3000 + Math.random() * 4000;
          this._pickWanderTarget(pond);
        }
        this._checkForFood(foodItems);
        break;

      case 'seekFood':
        // Check if targeted food still exists
        const foodStillExists = foodItems.some(f => !f.eaten && Math.abs(f.x - this.targetX) < 5 && Math.abs(f.y - this.targetY) < 5);
        if (!foodStillExists) {
          this.state = 'wander';
          this.stateTimer = 2000 + Math.random() * 3000;
          this._pickWanderTarget(pond);
          break;
        }
        {
          const dx = this.targetX - this.x;
          const dy = this.targetY - this.y;
          const distCenter = Math.sqrt(dx * dx + dy * dy);
          const targetAngle = Math.atan2(dy, dx);
          this.angle = this._lerpAngle(this.angle, targetAngle, 0.06);
          this.targetSpeed = Math.min(0.9, 0.4 + distCenter * 0.002);
        }
        if (this._mouthDistanceTo(this.targetX, this.targetY) < 22) {
          for (const f of foodItems) {
            if (!f.eaten && Math.abs(f.x - this.targetX) < 8 && Math.abs(f.y - this.targetY) < 8) {
              f.eaten = true;
              f.alpha = 0;
              break;
            }
          }
          this._grow();
          this.eating = true;
          this.eatTimer = 800;
          this.state = 'idle';
          this.stateTimer = 1500;
          ripples.push({ x: this.x, y: this.y, born: time, maxRadius: 12, duration: 0.8 });
        }
        break;

      case 'toLand':
        if (this._seekTarget(dt)) {
          this.state = 'idle';
          this.idleDuration = 3000 + Math.random() * 5000;
          this.stateTimer = this.idleDuration;
        }
        break;

      case 'toWater':
        this.targetSpeed = 0.3;
        if (this._seekTarget(dt)) {
          this.state = 'wander';
          this.stateTimer = 3000 + Math.random() * 4000;
          this._pickWanderTarget(pond);
          ripples.push({ x: this.x, y: this.y, born: time, maxRadius: 25, duration: 1.5 });
        }
        break;

    }

    // Eating animation
    if (this.eating) {
      this.eatTimer -= dt;
      if (this.eatTimer <= 0) this.eating = false;
    }

    // Smooth speed
    this.speed += (this.targetSpeed - this.speed) * 0.05;

    // Move
    this.x += Math.cos(this.angle) * this.speed * (dt / 16);
    this.y += Math.sin(this.angle) * this.speed * (dt / 16);

    // Keep on screen
    const margin = 40;
    const canvas = document.getElementById('pond-canvas');
    this.x = Math.max(margin, Math.min(canvas.width - margin, this.x));
    this.y = Math.max(margin, Math.min(canvas.height - margin, this.y));
  },

  _wander(dt, pond) {
    this.targetSpeed = this.inWater ? 0.4 : 0.2;
    // Gentle wandering
    this.wanderAngle += (Math.random() - 0.5) * 0.02 * (dt / 16);

    // Steer toward wander target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const targetAngle = Math.atan2(dy, dx);
    this.angle = this._lerpAngle(this.angle, targetAngle + this.wanderAngle, this.turnSpeed);

    // If close to target, pick new one
    if (dx * dx + dy * dy < 400) {
      this._pickWanderTarget(pond);
    }
  },

  _grow() {
    this.eating = true;
    this.eatTimer = 600;
    if (this.growthLevel < this.maxGrowth) {
      this.growthLevel += 1;
    }
  },

  _seekTarget(dt) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const targetAngle = Math.atan2(dy, dx);
    this.angle = this._lerpAngle(this.angle, targetAngle, 0.06);
    this.targetSpeed = Math.min(0.9, 0.4 + dist * 0.002);
    return dist < 20;
  },

  _pickWanderTarget(pond) {
    // Pick a random point in the pond
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.7;
    this.targetX = pond.cx + Math.cos(a) * pond.rx * r;
    this.targetY = pond.cy + Math.sin(a) * pond.ry * r;
  },

  _pickLandTarget(pond) {
    // Pick a point just outside the pond
    const a = Math.random() * Math.PI * 2;
    this.targetX = pond.cx + Math.cos(a) * pond.rx * 1.15;
    this.targetY = pond.cy + Math.sin(a) * pond.ry * 1.15;
    this.targetSpeed = 0.25;
  },

  _checkForFood(foodItems) {
    let closest = null;
    let closestDist = 200; // detection radius
    for (const food of foodItems) {
      if (food.eaten) continue;
      const dx = food.x - this.x;
      const dy = food.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closest = food;
        closestDist = dist;
      }
    }
    if (closest) {
      this.state = 'seekFood';
      this.targetX = closest.x;
      this.targetY = closest.y;
      closest.targeted = true;
    }
  },

  _lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  },

  /** World position of the mouth — used for food reach tests (center is deep in the shell). */
  _mouthOffset() {
    return (this.headUp ? this.size * 0.55 : this.size * 0.45);
  },

  _mouthDistanceTo(wx, wy) {
    const m = this._mouthOffset();
    const mx = this.x + Math.cos(this.angle) * m;
    const my = this.y + Math.sin(this.angle) * m;
    const dx = wx - mx;
    const dy = wy - my;
    return Math.sqrt(dx * dx + dy * dy);
  },

  hitTest(mx, my) {
    const dx = mx - this.x;
    const dy = my - this.y;
    return dx * dx + dy * dy < this.size * this.size;
  },

  render(ctx, time) {
    const t = time * 0.001;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + (this.eating ? Math.sin(t * 20) * 0.12 : 0));

    const s = this.size;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow under turtle
    if (this.inWater) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.ellipse(3, 3, s * 0.55, s * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Legs (ASCII, drawn behind shell) ---
    ctx.globalAlpha = 0.85;
    const legWiggle = Math.sin(t * 4) * 4 * Math.min(1, this.speed / 0.4);
    const legColour = this.inWater ? '#5a8a50' : '#6a9a5a';
    ctx.fillStyle = legColour;
    ctx.font = `${Math.floor(s * 0.32)}px monospace`;
    // Front legs
    ctx.fillText('~', s * 0.25, -s * 0.32 + legWiggle);
    ctx.fillText('~', s * 0.25, s * 0.32 - legWiggle);
    // Back legs
    ctx.fillText('~', -s * 0.3, -s * 0.28 - legWiggle * 0.7);
    ctx.fillText('~', -s * 0.3, s * 0.28 + legWiggle * 0.7);

    // --- Tail ---
    ctx.fillStyle = '#4a7a3a';
    ctx.font = `${Math.floor(s * 0.22)}px monospace`;
    ctx.fillText('~', -s * 0.5, Math.sin(t * 3) * 2);

    // --- Shell background (flat color oval) ---
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = this.inWater ? '#5a8a3a' : '#6a9a4a';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.38, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // --- Shell pattern (ASCII characters over the gradient) ---
    ctx.globalAlpha = 0.6;
    const shellChars = ['@', '#', '@', '&', '#', '@', '#', '&', '@'];
    ctx.font = `${Math.floor(s * 0.28)}px monospace`;
    const positions = [
      [0, 0],
      [-s*0.14, -s*0.12], [s*0.14, -s*0.12],
      [-s*0.14, s*0.12], [s*0.14, s*0.12],
      [0, -s*0.2], [0, s*0.2],
      [-s*0.26, 0], [s*0.26, 0],
    ];
    for (let i = 0; i < positions.length; i++) {
      const [px, py] = positions[i];
      // Only render if inside shell ellipse
      const nd = (px*px)/(s*0.36*s*0.36) + (py*py)/(s*0.28*s*0.28);
      if (nd < 1) {
        const shade = 0.6 + Math.sin(i * 1.7) * 0.2;
        const r = Math.floor(60 * shade);
        const g = Math.floor(95 * shade);
        const b = Math.floor(45 * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillText(shellChars[i], px, py);
      }
    }

    // --- Head ---
    ctx.globalAlpha = 1;
    const headExt = this.headUp ? s * 0.55 : s * 0.45;
    const headBob = Math.sin(this.wiggle) * 2;
    const headX = headExt;
    const headY = headBob;

    // Head as ASCII 'o' with a subtle filled circle behind it
    ctx.fillStyle = this.inWater ? '#6a9a55' : '#7aaa65';
    ctx.beginPath();
    ctx.ellipse(headX, headY, s * 0.1, s * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head character
    ctx.fillStyle = '#4a7a3a';
    ctx.font = `${Math.floor(s * 0.3)}px monospace`;
    ctx.fillText('o', headX, headY);

    // Eyes
    const eyeSpacing = s * 0.04;
    const eyeX = headX + s * 0.04;
    if (this.eyesClosed) {
      // Closed eyes — small dashes
      ctx.strokeStyle = '#2a4a2a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(eyeX - s*0.015, headY - eyeSpacing);
      ctx.lineTo(eyeX + s*0.015, headY - eyeSpacing);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(eyeX - s*0.015, headY + eyeSpacing);
      ctx.lineTo(eyeX + s*0.015, headY + eyeSpacing);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#1a2a1a';
      ctx.beginPath();
      ctx.arc(eyeX, headY - eyeSpacing, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeX, headY + eyeSpacing, s * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Name label
    if (this.name) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#3a5a2a';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, this.y - this.size * 0.5);
    }
    ctx.globalAlpha = 1;
  }
};
