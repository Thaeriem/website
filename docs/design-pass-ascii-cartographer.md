# Design Pass: ASCII Systems

## Premise

The inner site becomes a living ASCII visualization. The user is not using a terminal; they are disturbing a small world made of characters.

This is the strongest current direction. Scrap the cabinet and signal-organism directions as primary candidates. Keep the breadth inside ASCII by comparing four field systems, not by returning to page layouts.

## First Prototype Review

The first implementation treated ASCII as a static illustration plus region selector. It looked like an ASCII-themed web page, not a text-world. The map did not redraw, respond, flood, erode, route, or remember enough.

For the next pass, ASCII must be the rendering medium and the world material. Characters should behave like terrain, weather, signal, architecture, and traces.

## Hard Medium Rule

The text grid is the only visible medium. Do not place DOM panels, floating buttons, SVG marks, normal canvas shapes, or non-grid overlays above the ASCII field. The characters are the pixels.

All interaction should be calculated on the ASCII layer itself:

- Pointer position maps to a grid coordinate.
- Clicks and drags add pressure into scalar/vector fields.
- Noise functions determine field structure, density, shape, and color.
- Navigation affordances are drawn as ASCII text in the grid and hit-tested by cell region.
- Links and Back may exist, but they must visually appear as ASCII cells.

Interaction rule: field clicks and drags create deposits that feed pressure and memory into the ASCII samplers. They should alter generation, not draw stickers above the grid.

## Video-Led Direction Change

After inspecting the supplied Descent videos, the best next direction is not a broad set of unrelated smooth field themes. The stronger route is to build a **structural ASCII generator**.

Important video lessons:

- Use a small alphabet per piece.
- Generate black voids intentionally.
- Build forms from chambers, shafts, ledges, diagonal hatch bands, and material zones.
- Use color as rare structural accent, not full-field decoration.
- Let motion preserve the identity of the system while layers advance, flicker, reveal, or descend.

## Restored Generative Harness

Restore the earlier generative system described in the implementation summary:

- `descent`
- `tide`
- `bloom`
- `veil`

This keeps breadth visible while preserving the important methodology: seed, glyph palette, field structure, motion grammar, density gates, interaction deposits, and ASCII chrome.

## Current Variations

### 1. Descent Field

Theme: falling rope/vine descent, dark negative space, curved vertical strands, bead pulses, diagonal tension, rare warm knots.

Interaction: clicks and drags add deposits that increase pressure/memory and locally change density and warmth.

Risk: becoming just ambient noise. Prevent this with seeded strand anchors, visible falling direction, sparse rope continuity, and empty black space.

### 2. Tide Field

Theme: ocean current, signal weather, drifting glyphs.

Interaction: deposits bend and warm the current field.

Risk: becoming ambient texture. Prevent this by making touch visibly deform the field and leave persistent current memory.

### 3. Bloom Field

Theme: sparse dot/o clusters, Dragonfly-like spacing, seeded growth.

Interaction: deposits grow, merge, or thin clusters through density gates.

Risk: becoming decorative particles. Prevent this by giving clusters spatial hierarchy and strong negative space.

### 4. Veil Field

Theme: color/noise curtains made of characters.

Interaction: deposits fold curtains and shift density thresholds.

Risk: becoming a screensaver. Prevent this by making the veil obey a clear structure and a limited palette.

## Feeling

Precise, intimate, strange, technical, literary. More map than command line.

## Shared Content Atoms

- origin signal
- tools as held systems
- weather / motion taste
- contact links as a plain signal outlet
- optional revealed sentence after enough marks accumulate

## Interaction

The user moves through or disturbs the text field. Coordinates, pointer position, clicks, and typed keys can redraw terrain, expose routes, reveal inscriptions, or shift signal density. The map should not need a normal selector rail.

Interactions should feel like inspecting a hand-drawn map, not typing into a fake shell.

## Taste Rules

- Avoid green hacker terminal tropes.
- Avoid fake logs and fake system errors.
- Do not require typed commands.
- ASCII should form space and rhythm, not noise.
- Every glyph cluster should support navigation, atmosphere, or content.
- Avoid static ASCII diagrams surrounded by normal UI.
- Paragraphs should appear as found inscriptions, not as a content panel.

## Next-Pass System Sketch

Start from these:

- A descent field with sparse dot/o/0 rope/vine architecture.
- A current field where letters are pulled like water.
- A sparse cluster field where dots and o-like glyphs grow from seeded anchors.
- A color/noise field where characters behave like light but still obey compositional masks.

## Success Test

The visitor should say: "I navigated a small text-world."

They should not say: "I used a fake terminal portfolio."
