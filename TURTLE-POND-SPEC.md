# Turtle Pond Spec

## Overview

An interactive ASCII pond and its inhabitants. **Live site:** [GitHub Pages](https://kelzheng.github.io/turtle-pond/) — deploys from `main` via `.github/workflows/pages.yml` (static bundle: `index.html`, `css/`, `js/`).

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
| Fish           | Muted green, brown, blue-grey, rusty |
| Rock           | Flat grey-brown with ASCII texture   |
| Fireflies      | Warm amber glow (dusk/night only)    |
| Stars          | Pale white-yellow (night only)       |

---

## Layout

- **Fixed world size** (800x700) — viewport shows what fits, WASD to pan
- **Pond**: irregular wobble-edged shape, ~60-70% of world
- **Land**: minimal — sparse dots, no busy grass texture
- **Rock**: large irregular ASCII rock (`O`, `@`, `o`, `·`) in centre of pond
- **No text** except creature names and the clock widget (top-right)

---

## Inhabitants

| Creature     | Count | Behaviour |
|--------------|-------|-----------|
| Turtle       | 1     | Swims, walks on land, sits on rock (eyes closed), eats **water** food + lily pads, grows when eating |
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
| **Drag turtle** | Pick up and drop anywhere. Resumes autonomous behaviour. |
| **Drag fish** | Pick up and relocate within pond. |
| **Drag dragonflies** | Grab and relocate. Resume flying. |
| **Drag drawn elements** | Move lily pads, flowers, rocks. |
| **Click-drag on water** | Draw lily pads and flowers (max count enforced). |
| **Click on land** | Place rocks or wildflowers. |
| **Right-click creature** | Pet it — floating ♥ appears, grows bigger with more pets. |
| **Click default name in status bar** (`turtle`, `dragonfly 1`, `fish 1`, …) | Prompt to name that creature (**one-time**; name persists). **Clicking the creature in the world does not open the prompt.** |
| **Eraser button (✕, bottom-right)** | Toggle eraser mode to remove drawn elements. |
| **WASD keys** | Pan camera around the world. |
| **Clock slider (top-right)** | Drag to change time of day. Click clock face to reset to real time. |
| **Status bar (top-left)** | Fed progress: `●` per meal (turtle, fish, dragonflies). Unnamed labels are **clickable** to name. |

---

## Creature Behaviours

### Turtle
- **Wander**: gentle arcs through the pond
- **Surface**: occasionally pops head up with ripple
- **Land**: sometimes crawls onto shore, eventually returns
- **Rock rest**: climbs onto centre rock, closes eyes, rests 5-13s
- **Seek food**: detects food within 200px, swims toward it; **catch** uses **mouth** distance (not shell centre) so eating registers reliably
- **Eat**: pond food pellets and nearby lily pads; **+1 growth** per meal; size `baseSize + growthLevel × 8`
- **Growth**: max **20** levels; status bar shows up to 20 `●`

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

- Click-drag on water → lily pads and flowers along stroke
- Click on land → rocks or wildflowers
- Max element count enforced
- All drawn elements are draggable
- Eraser mode (✕ button) to click/drag-remove elements
- Turtle can eat drawn lily pads

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
    rock.js          — centre pond rock
  TURTLE-POND-SPEC.md  (this file)
```

### Key Implementation Details
- **Fixed world (800x700), scrollable viewport**: camera pans with WASD
- **Camera transform**: `ctx.translate(-camX, -camY)` for world; clock + **status bar** rendered in **screen space** after `ctx.restore()`
- **Input → world coords**: pond/drag/draw use `+ camX/camY`; **status bar naming** uses **canvas pixel** coords (`_screenPos`, no camera)
- **Turtle AI**: state machine — wander, idle, seekFood (mouth reach + marks food eaten), surfacing, toLand, toWater, toRock, onRock
- **Fish AI**: seek water food within radius, smooth turning, underwater transparency
- **Dragonfly AI**: if any land fly exists, target closest; eat in range; `Dragonflies.update(..., LandFlies)`
- **Update order**: `LandFlies.update` then `Dragonflies.update` so positions stay consistent
- **Growth**: turtle +8px/level (max 20), fish +3px/level (max 12), dragonfly +2.5px/level (max 12)
- **Naming**: one-time `prompt` when clicking **default label** in status bar; name above creature when set
- **Petting**: right-click → floating ♥, size grows with pet count (capped 36px)
- **Pond fill**: uses same wobble boundary as ASCII waves, scaled 1.08x, quadratic curves for smoothness

---

## Future Ideas

- Multiple turtles (click to spawn)
- Frogs with tongue-eating animation
- Sound effects (muted by default)
- Save/load state via localStorage
- Seasonal palette changes
- Mobile touch gestures for panning
- Weather (rain, snow, ice)
- New turtle ponds to discover on WASD pan
