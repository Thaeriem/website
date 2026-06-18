# ASCII Generative Methodology

## Reference Read

The current reference direction is not "terminal UI." It is generated ASCII art as a moving visual system.

Observed goals from the Dragonfly screenshot and Descent references:

- Sparse black space is part of the image.
- Dots, small o-like glyphs, and repeated marks create form through density.
- Character spacing matters as much as character choice.
- The image has large-scale structure, not just noisy texture.
- Motion should feel like a coherent system evolving, not random shimmer.
- Color is selective. Small warm signals can matter more than full-screen saturation.
- UI chrome should be minimal and integrated into the glyph world.

## Video Study: Descent

The two supplied Descent clips are both 1920x1920, 20fps, roughly one minute long. Frame sheets were sampled every five seconds, with larger stills inspected around 20 seconds.

### Descent_0 Observations

- The close frame uses a tight alphabet: mostly `1`, `2`, and `x`.
- The large image reads as architectural strata: towers, shafts, ledges, cutouts, and stacked blocks.
- Black is not background filler; it is an active void mask that carves the composition.
- Color is assigned by region, not by global rainbow noise. Red, magenta, cyan, blue, and grey sit in distinct material zones.
- The piece uses hard edges and stepped contours. It is closer to procedural tiling/city generation than to a smooth noise field.
- Motion appears to preserve the grammar of the structure while changing which regions advance, fill, or reveal.

### Descent_2 Observations

- The close frame uses another very limited alphabet: mostly `.`, `*`, and `/`.
- Diagonal hatch bands create directional surfaces and imply depth.
- White/grey fields form the bulk of the structure, while red accents behave like heat, exposed seams, or active channels.
- Rectangular chambers, holes, and corridors repeat at different scales.
- The piece is dense, but it does not draw everywhere. Large black voids give the structures weight.
- Motion should likely be layered: vertical descent, lateral parallax, flickering material channels, and changing hatch phase.

## Main Lesson

Our earlier implementation treated glyphs like a brightness ramp over a continuous noise field. The videos suggest a stronger method:

**Generate structural masks first, then assign glyph materials to those masks.**

The glyph is not just "how bright is this pixel." It is "what material or layer does this cell belong to?"

Better mental model:

```text
seed
  -> structural masks
  -> voids / chambers / shafts / bands
  -> material assignment
  -> glyph family
  -> color accent channel
  -> motion phase
```

This means the renderer should be less like a shader brightness ramp and more like a procedural mapmaker / tiling system / material compositor.

## Implementation Reset

This pass resets the implementation around a real generative ASCII system rather than a static terminal-like page or a structural sampler experiment.

Core shift:

- Seed first.
- Glyph palette second.
- Field structure third.
- Motion grammar fourth.
- Density gates and empty cells are compositional tools.
- Interaction creates field deposits, not visual stickers.
- All chrome remains ASCII grid text.

## Methodology

Current rule: keep the renderer as a field system. Each theme samples seeded noise, geometry, deposits, time, and density gates directly.

1. **Seed**

   Start with a stable hash string. The seed should produce deterministic anchors, field offsets, density thresholds, and motion rates.

2. **Glyph Palette**

   Define a glyph ramp for the theme. The ramp is not just brightness; it is the material language.

   Examples:

   - `descent0`: spaces, `1`, `2`, `x`
   - `descent2`: spaces, `.`, `*`, `/`
   - `dragonfly-like`: spaces, `.`, `o`, `O`
   - `tide`: spaces, `.`, `-`, `~`, `/`, `\\`, `|`

   Avoid long generic brightness ramps unless the theme specifically needs them. A small alphabet with strong material roles is usually more distinctive.

3. **Field Structure**

   Build large forms from structural masks and scalar fields:

   - rectangular chambers
   - vertical shafts
   - stepped ledges
   - diagonal hatch bands
   - black void masks
   - cellular/tiling regions
   - ridges
   - signed-distance-like bands
   - seeded point attractors
   - domain-warped noise
   - falloff from interaction deposits

   Noise should modulate structure; it should not be the whole structure.

4. **Motion Grammar**

   Motion should come from the field, not from moving DOM layers.

   - `descent`: vertical descent, hatch phase, chamber reveal, accent flicker
   - `tide`: current waves and pointer swirl
   - `bloom`: seeded clusters pulsing at different rates and merging into regions
   - `veil`: warped ribbons folding through time

   Motion should preserve a theme's identity. A Descent frame should still look like Descent after several seconds, not dissolve into a different noise image.

5. **Density Gate**

   Do not draw every cell. Use seeded randomness and field thresholds to create spacing. This is how the grid breathes and avoids becoming a wallpaper.

6. **Color Ramp**

   Color should be field-derived. The same glyph can shift meaning through hue, lightness, alpha, and interaction pressure.

   Use discipline:

   - Most cells should be black, grey, or white.
   - Accent color should be rare and structural.
   - Red/orange should feel like heat, seam, signal, or active channel.
   - Blue/purple/cyan should be secondary material zones, not full-screen gradients.
   - Do not color every noise contour differently.

7. **Interaction Deposits**

   Clicks and drags create deposits:

   - short-lived traces for motion pressure
   - long-lived memory for session structure

   Themes read these deposits differently, but the interaction model stays shared.

   Interaction deposits are active in the implementation. Clicks and drags do not draw separate stickers; they add pressure and memory values that theme samplers read while deciding glyph density, color, and motion.

8. **Text Chrome As Grid**

   Back, themes, status, and links are drawn as text cells and hit-tested by grid region. No floating DOM controls.

9. **State Transitions As Fields**

   Theme and state changes should use the grid as the transition medium. A transition is not a DOM fade; each cell samples either the previous state or next state based on a deterministic reveal field.

   Current transition fields:

   - `dither`: seeded per-cell threshold.
   - `radial`: center-out circular fill.
   - `wipe`: left-to-right field with wave perturbation.
   - `ripple`: center-out field with oscillating rings.

   These modes should remain ASCII-native: a cell resolves to one glyph/color per frame, never stacked text layers.
   The active mode can be changed from the ASCII chrome or with `Tab`.

10. **Portal Transitions Between Worlds**

   The chest and back actions use a separate transparent ASCII portal canvas above both the island and inner experience. On entry, black ASCII cells ripple outward from the chest until the island is mostly covered, then the inner experience is opened underneath and the portal dissolves. On exit, the inner renderer first transitions itself to an all-black canvas. Only after that blackout completes does the portal mount already filled with black `@` cells; the inner experience closes underneath that fully covered portal, then the black cell field dithers to transparent to reveal the island. Cell opacity ramps around threshold edges so the portal reads smoother than a hard on/off grid.

   This layer is deliberately separate from the inner ASCII renderer. It should behave like a curtain between worlds, not like another theme page.

11. **Shared Palette System**

   Color is a global test condition, not a per-theme skin. The bottom ASCII chrome exposes three palettes that every state reads from:

   - `black/red`: stark red signal on near-black.
   - `grey/orange`: the current cool grey/orange baseline.
   - `ultraviolet`: blue/violet field with cyan and magenta signal colors.

   Themes should ask for semantic color roles like dim, bright, accent, and hot. They should not hard-code one-off hues unless a future test explicitly studies color as the main subject.

## Current Implementation

The current code is split into:

- `three-website/src/modules/innerExperience.ts`: overlay lifecycle and island input capture.
- `three-website/src/modules/ascii/renderer.ts`: canvas grid renderer, deposits, hit zones, seed state, ASCII chrome.
- `three-website/src/modules/ascii/themes.ts`: theme field samplers.
- `three-website/src/modules/ascii/random.ts`: seeded hash, value noise, fbm, domain warp.
- `three-website/src/modules/ascii/types.ts`: shared types.

## Performance Methodology

The `ertdfgcvb/play.core` renderer is useful less as a dependency and more as a constraint: animated ASCII has to be treated like a retained text buffer, not a normal website layout. The local implementation should keep those lessons while staying integrated with this site's overlay system.

Current rules:

- Keep the island render loop paused while the ASCII overlay is open.
- Render the ASCII canvas at device pixel ratio 1 unless a theme truly needs high-DPI text.
- Reuse mutable per-cell context instead of allocating new objects for every glyph.
- Cache frame-level geometry, such as Descent rope centers and chamber masks, before sampling columns.
- Quantize theme colors so the renderer can batch same-color text runs.
- Build interaction pressure and memory into typed-array fields once per frame.
- Keep debug perf data exposed through `data-ascii-perf` so visual changes can be checked against frame time.

## Current Themes

### Descent

Default direction. A falling rope/vine field with sparse dot/o/0 glyph material, dark negative space, seeded curved strands, bead-like downward pulses, diagonal tension lines, and small warm knots. This keeps the free-flowing movement from the current implementation while pointing it back toward the supplied Descent inspiration.

### Tide

Current-field direction. Wave glyphs use `.`, `-`, `~`, `/`, and `|` to form drifting waterlines. Deposits bend density and warm small local cells.

### Bloom

Seeded point clusters that grow as dot/o structures. Useful for exploring Dragonfly-like spacing and density, especially with a very small alphabet and large empty fields.

### Veil

Noise-warped ribbons and color curtains constrained by structural masks. Useful for testing expressive color without abandoning the ASCII grid.

## Critique Gates

Before adding another feature, ask:

- Does the theme have large-scale structure, or is it just texture?
- Can the visual be recognized with the UI/status text hidden?
- Are empty cells doing compositional work?
- Does motion follow a coherent rule?
- Does interaction alter the field, not just add decoration?
- Are color changes calculated from the system?
- Does the output still feel made of characters?
- Does each glyph have a material role?
- Is the accent color rare enough to feel intentional?
- Are black voids intentionally shaped?
- Does the theme still work with interaction disabled?

If three or more answers are weak, improve the field system before adding copy, links, or new controls.

## Next Implementation Targets

1. **Theme Field Identity**

   Improve each sampler directly. Descent, tide, bloom, and veil should not be skins over one sampler; each should earn a distinct field grammar.

2. **Density Gates**

   Keep empty cells meaningful. If a theme fills the screen evenly, fix thresholds before adding more glyphs.

3. **Limited Alphabet Themes**

   Maintain and compare the current theme set:

   - `descent`: `. / o / O / 0 / / / \\` falling rope/vine language.
   - `tide`: `. / - / ~ / / / |` current language.
   - `bloom`: `. / o / O / 0` sparse growth language.
   - `veil`: `. / : / + / * / #` curtain language.

4. **Motion Layers**

   Add independent motion phases:

   - vertical descent offset
   - hatch drift
   - accent flicker
   - chamber reveal/occlusion

5. **Interaction As Field Mutation**

   Pointer deposits should locally change density, warmth, thresholds, and motion. They should not merely brighten nearby cells.
