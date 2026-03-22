# Turtle Pond Spec

## Overview

A pond and its inhabitants. Interactive canvas.

---

## Visual Style: Hybrid ASCII + Colour

- ASCII characters (`~`, `@`, `o`, `·`, etc.) form pond, land, turtle shell, fish, and most props
- **Dragonflies** and **land flies** use canvas **vector strokes** (cross wings, body line, head circle) plus colour — not glyph-based
- Rendered with **earthy, pastel colour fills** — not monochrome
- Background shading uses flat colours (no gradients) behind ASCII texture
- Palette shifts with time of day

### Colour Palette

| Element        | Colours                              |
|----------------|--------------------------------------|
| Pond water     | Soft blue-greens, teal, slate blue   |
| Land           | Sage, olive, warm brown (minimal)    |
| Turtle shell   | Flat olive/forest green              |
| Lily pads      | Soft green, mint                     |
| Flowers        | Dusty pink, lavender, pale yellow    |
| Dragonflies    | Iridescent blue, lavender, teal      |
| Land flies     | Dark brown / near-black (prey)       |
| Fish           | Rust/koi orange, violet, saturated blue — readable on teal water |
| Fireflies      | Warm amber glow (dusk/night only)    |
| Stars          | Pale white-yellow (night only)       |

---

## Layout

- **Fixed world size** (800x700) — viewport shows what fits, WASD to pan
- **Pond**: irregular wobble-edged shape, ~60-70% of world
- **Land**: minimal — sparse dots, no busy grass texture
- **No text** except creature names and the clock widget (top-right)

---

## Inhabitants

| Creature     | Count | Behaviour |
|--------------|-------|-----------|
| Turtle       | 1     | Swims, walks on land; **pond food** adds growth; may nibble **lily pads / land flowers** off the map without growth |
| Fish         | 4-7   | Swim underwater, seek and eat **water** food pellets, grow when eating, draggable |
| Dragonflies  | 3     | Flit and hover above pond; **hunt land flies**, grow when eating; draggable |
| Land flies   | 0–24  | Spawn on **double-click land**; wander on land only (slower than dragonflies); eaten by dragonflies |
| Fireflies    | 5-12  | Appear at dusk/night, drift with warm glow |

---

## Interactions

| Action | What Happens |
|--------|-------------|
| **Double-click on water** | Drops **turtle/fish food** pellet (sinks in pond). Turtle and fish seek it (mouth-based reach for turtle). |
| **Double-click on land** | Spawns a **land fly** (small flying prey). Dragonflies seek and eat it. |
| **Double-tap on touch devices** | Same as double-click on water / land (`touchend` timing + proximity); ignored after a drag, eraser use, status-bar name tap, or a draw stroke (finger moved ~38+ world px). |
| **Drag turtle** | Pick up and drop anywhere. Resumes autonomous behaviour. |
| **Drag fish** | Pick up and relocate within pond. |
| **Drag dragonflies** | Grab and relocate. Resume flying. |
| **Drag drawn elements** | Move lily pads, flowers, rocks. |
| **Click-drag on water** | Draw lily pads and flowers along the stroke (minimum spacing between placements). |
| **Click on land** | Place rocks or wildflowers. |
| **Right-click creature** | Pet it — floating ♥ appears, grows bigger with more pets. |
| **Click default name in status bar** (`turtle`, `dragonfly 1`, `fish 1`, …) | Prompt to name that creature (**one-time**; name persists). **Clicking the creature in the world does not open the prompt.** |
| **Eraser button (✕, bottom-right)** | Toggle eraser mode to remove drawn elements. |
| **WASD keys** | Pan camera around the world. |
| **Two-finger pinch (touch)** | Zoom in/out (about the pinch midpoint); spreading/pinching changes scale (~0.38×–2.75×). |
| **Two-finger drag (touch)** | Pan — move both fingers together; same pinch gesture updates pan from the midpoint. |
| **Clock slider (top-right)** | Drag to change time of day. Click clock face to reset to real time. |
| **Status bar (top-left)** | Fed progress: `●` per meal (turtle up to 20, fish & dragonflies up to 12). Row `✿ n @ m` = land flowers / lily pads drawn. Unnamed default labels are **clickable** (pointer cursor) to name; small movement cancels the click-to-name gesture. |

---

## Creature Behaviours

### Turtle
- **Wander**: gentle arcs through the pond
- **Surface**: occasionally pops head up with ripple
- **Land**: sometimes crawls onto shore, eventually returns
- **Seek food**: detects food within 200px, swims toward it; **catch** uses **mouth** distance (not shell centre) so eating registers reliably
- **Eat**: **pond food pellets** → **+1 growth** (size `baseSize + growthLevel × 8`). **Lily pads / land flowers** can be nibbled away but **do not** add growth, eating animation, or status `●`
- **Nibble pads/flowers**: each frame, probability `0.006 × (dt / 16)` to attempt a bite; removes one `lilypad` or `landflower` within **72px** of the turtle
- **Growth**: max **20** levels; status bar shows up to 20 `●`
- **Look**: shell/head use **scaled circular arcs** (not `ctx.ellipse`); **eyes** use `TimeSystem.eyeColours(palette)` so they track time-of-day palettes with the rest of the scene

### Fish
- **Swim**: smooth underwater movement with tail wag, semi-transparent
- **Seek food**: detect food within 120px, actively swim toward it
- **Eat**: consume food pellets, grow 3px per meal
- **Growth**: max 12 levels

### Dragonflies
- **Fly**: erratic darting movement near pond; **chase nearest land fly** (any range), slight speed boost while hunting
- **Eat fly**: within ~18px of prey, fly is consumed; **+1 growthLevel** (max **12**); **size** = `baseSize + growthLevel × 2.5`
- **Hover**: pause mid-air with gentle bob for 1-3 seconds (skipped while chasing)
- **Stay near pond**: random targets stay over/near water when not hunting

### Land flies
- **Spawn**: double-click **land** (`!pond.isInPond`); cap **24** (oldest dropped)
- **Move**: slow wander; new targets sampled on **land** only
- **Render/draw order**: drawn after pond food, before ripples/turtle/dragonflies

### Fireflies
- **Night/dusk only**: 12 at night, 5 at dusk, 0 during day
- **Drift**: random gentle movement near pond
- **Glow**: pulsing amber `*` with soft outer glow

---

## Time of Day

| Time       | Mood |
|------------|------|
| 6am-10am   | Morning — warm light, pale sky |
| 10am-4pm   | Daytime — bright pastels, full colour |
| 4pm-7pm    | Golden hour — amber/orange tones |
| 7pm-9pm    | Dusk — purple/pink sky, fireflies appear |
| 9pm-6am    | Night — deep blues, stars, full fireflies |

- Analog clock in top-right (screen-space, doesn't pan with camera)
- Range slider for manual time override
- Click clock face to snap back to real time

---

## Drawing System

- Click-drag on water → lily pads and flowers along stroke (`minDrawDist` spacing; **no** global max element count)
- Click on land → rocks or wildflowers
- All drawn elements are draggable
- Eraser mode (✕ button) to click/drag-remove elements
- Turtle can remove drawn lily pads (and land flowers) by nibbling — no growth from those

---

## Technical Architecture

### Stack
- Vanilla HTML/CSS/JS — no dependencies, no build tools
- HTML5 Canvas via `requestAnimationFrame`

### File Structure

```
turtle-pond/
  index.html
  css/style.css
  .github/workflows/pages.yml  — GitHub Actions → GitHub Pages
  js/
    main.js          — game loop, camera (WASD), rendering, status bar + name hit regions
    pond.js          — pond shape, water/land ASCII, ripples
    turtle.js        — turtle AI, mouth helpers for food, rendering
    fish.js          — Fish class + Fishes manager
    dragonfly.js     — Dragonfly class + hunt land flies, growth
    landFlies.js     — land fly spawn/update/render (dragonfly prey)
    food.js          — water food pellets (turtle/fish)
    drawing.js       — user drawing (lily pads, flowers, rocks)
    time.js          — time-of-day palettes, day/night cycle
    input.js         — drag, draw, pet; double-click water vs land; status-bar naming
  TURTLE-POND-SPEC.md  (this file)
```

### Key Implementation Details
- **Centre pond rock** (`PondRock` / `rock.js`) has been **removed**; turtle no longer has `toRock` / `onRock` states
- **Fixed world (800x700), scrollable viewport**: camera pans with WASD
- **Camera transform**: `translate(screen/2)`, `scale(viewZoom)`, `translate(-viewCenterX, -viewCenterY)` for world; clock + **status bar** in **screen space** after `ctx.restore()`
- **Input → world coords**: `(screen - size/2) / viewZoom + viewCenter`; **status bar naming** uses **canvas pixel** coords (`_screenPos`, no camera / zoom)
- **Touch**: second finger down aborts single-finger draw/drag and starts **pinch** (zoom + pan from two-finger midpoint); see `Input._pinchMove`
- **Turtle AI**: state machine — wander, idle, seekFood (mouth reach + marks food eaten), surfacing, toLand, toWater
- **Fish AI**: seek water food within radius, smooth turning, underwater transparency
- **Dragonfly AI**: if any land fly exists, target closest; eat in range; `Dragonflies.update(..., LandFlies)`
- **Update order**: `LandFlies.update` then `Dragonflies.update` so positions stay consistent
- **Growth**: turtle +8px/level (max 20), fish +3px/level (max 12), dragonfly +2.5px/level (max 12)
- **Naming**: one-time `prompt` when clicking **default label** in status bar; name above creature when set
- **Petting**: right-click → floating ♥, size grows with pet count (capped 36px)
- **Pond fill**: uses same wobble boundary as ASCII waves, scaled 1.08x, quadratic curves for smoothness
- **Pond ASCII grid**: iterates **`worldW` × `worldH`** (800×700), not `canvas` size — narrow viewports must still shade the whole pond in world space; looping only to `canvas.width` left the right side as solid fill-only on phones

### Canvas and game-loop robustness
If world drawing throws before `ctx.restore()`, the canvas can keep a **stuck world transform**; the next frame stacks another translate so **screen-space UI** (clock, status bar) and **turtle** can appear to vanish while other layers still draw. Mitigations in `main.js` / `turtle.js` / `dragonfly.js`:
- **`_render`**: `ctx.setTransform(1,0,0,1,0,0)` and `globalAlpha = 1` at the **start** of each frame (and again before clock + status bar); world draws inside `save` / `try` / `finally` / `restore` so **restore always runs once** per frame
- **`_loop`**: `try`/`catch` around update + render, **`console.error`** on failure, **`requestAnimationFrame` always scheduled** so one error does not stop the loop
- **`Turtle.render`**: skip if `x`/`y`/`size` are non-finite; outer **`try`/`finally`** around the turtle’s own `save`/`restore` so a throw cannot leave an extra stack level; shell/head ovals use **scale + `arc`** instead of `ctx.ellipse`
- **On-screen clamp** (turtle, dragonfly): only read `canvas.width`/`height` if **`#pond-canvas`** exists (avoids `TypeError` aborting the whole frame)

---

## Future Ideas

- Multiple turtles (click to spawn)
- Frogs with tongue-eating animation
- Sound effects (muted by default)
- Save/load state via localStorage
- Seasonal palette changes
- Mobile touch gestures for panning
- Weather (rain, snow)
- New areas to discover on WASD pan (e.g. duck pond)
- Play as turtle / fish / dragonfly with arrow-key movement
