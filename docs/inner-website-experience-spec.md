# Inner Website Experience Spec

## Objective

Create a new full-page inner website experience inside the existing Three.js island site. The island remains the outer shell and entry experience. Clicking the chest transitions away from the island view into a full-viewport overlay. The overlay has its own interaction model and includes a clear back control that returns the user to the island.

The number one objective is to create a visually creative, complex, authored system. This should behave closer to an art installation, interactive instrument, toy, or spatial artwork than a normal website. It may break ordinary website rules if doing so creates a stronger visual and experiential idea.

The next implementation pass should produce quick interactive prototypes for multiple concept directions, not a final polished portfolio page. The goal is no longer to compare page layouts or content structures. The goal is to compare living systems: what moves, what reacts, what accumulates state, what feels memorable, and what could not be mistaken for a conventional web page with a stylized skin.

## Branch Plan

Target branch:

```bash
git switch dev
git pull --ff-only
git switch -c feature/inner-website-experience
```

This branch should be created from clean `dev` and should not include the current uncommitted `feature/mobile-performance-pass` work.

Current session note: Codex could read `.git` state but could not write Git metadata, so the branch could not be created from this sandbox. Before implementation, preserve or clear the current worktree outside this session, then create the branch from `dev`.

## Repo Context

The main experience lives in `three-website`, a Vite + TypeScript + Three.js app.

Important current entry points:

- `three-website/src/index.ts` initializes the island scene and modules.
- `three-website/src/modules/utilities.ts` maps object clicks to behavior. `onClickChest` currently resets/focuses the camera.
- `three-website/src/modules/input.ts` handles pointer, keyboard, wheel, iframe, and dialog input.
- `three-website/src/modules/cameraController.ts` owns camera transitions and iframe focus mode.
- `three-website/src/modules/render.ts` creates the WebGL renderer, CSS3D renderer, postprocessing, and iframe holder.
- `frontend` contains the older iframe portfolio page, but the new experience should not simply become another resume/portfolio page.

The existing `portfolioModes.ts` experiments should be ignored for this effort, though they can be deleted or left untouched depending on branch state.

## Product Direction

This should feel more like a personal artwork than a resume view. It can include a small amount of "about me" content, but the page should primarily express personality, taste, play, curiosity, and technical imagination through behavior.

Content should be secondary to the system. The visitor should first remember what the experience did, not what section labels it used. Any written content should enter as inscriptions, signals, fragments, object labels, or revealed traces inside the system.

Possible content atoms:

- a short personal introduction
- a few personal interests or creative values
- selected experiments/projects as traces, specimens, coordinates, artifacts, or system states rather than resume bullets
- contact or outbound links
- optional hidden/interactive moments

Avoid making the page feel like a conventional portfolio grid, career timeline, dashboard, moodboard, or tabbed landing page.

## Postmortem: What Went Wrong In The First Prototype Pass

The first prototypes looked coherent in screenshots but failed the core ambition. They became stylized websites instead of visual systems. The three directions used installation language, but the implementation choices kept falling back to familiar web primitives:

- Large headings.
- Left/right layouts.
- Cards and panels.
- Tabs or mode selectors.
- Labelled nodes.
- Text blocks that update when a thing is clicked.
- Static composition with small state changes.

This created a mismatch. The concepts promised "room," "map," and "living garden," but the screen behaved like "navigation on one side, content on the other." The result was tasteful but tame.

Specific failures:

- **The design docs over-prioritized legibility.** We treated five-second comprehension as a primary constraint too early. That pushed the work toward familiar website affordances before the visual system had a chance to become strange.
- **The implementation started from layout.** The prototypes were structured around containers, panels, selectable items, and text regions. The system should have started from a simulation, drawing engine, spatial rule, or interaction behavior.
- **The artifacts became renamed nav cards.** `Instrument`, `Weather`, `System`, and `Signal` read as section labels because they occupied card-like regions and mostly swapped text.
- **The visual complexity was decorative, not procedural.** Scanlines, pixel type, grids, lines, and glow made the screens look themed, but they did not meaningfully determine behavior.
- **The "garden" was a diagram.** Nodes and connecting lines implied a living system, but the state change was basically selection. A living system should reroute, grow, decay, pulse, collide, remember, or transform.
- **The "ASCII map" was an illustration.** It used ASCII as a static graphic rather than a world that redraws, floods, erodes, reveals paths, or responds to movement.
- **The "chest room" was a page layout.** It had object names, but not enough objecthood. A cabinet should have depth, occlusion, weird scale, drawers, latches, shadows, revealed surfaces, and physical consequences.
- **Copy carried too much of the personality.** The experience should reveal taste through the way it behaves. Text should annotate discoveries, not do the imaginative work.

The takeaway: the next pass must start with motion, state, and generative behavior. The content model should be fitted into the system after the system is interesting with almost no text.

## Revised North Star

The inner experience should be a full-screen interactive visual system that happens to contain personal traces. A visitor should be able to describe it as an experience before describing it as a website.

Desired visitor reactions:

- "I entered a strange little system."
- "The screen changed because of what I did."
- "It felt authored, not templated."
- "I wanted to touch it again to see what else would happen."
- "It tells me something about Yash without giving me a portfolio grid."

Undesired visitor reactions:

- "This is a cool menu."
- "This is a terminal-themed portfolio."
- "This is a website with big pixel typography."
- "This is a set of tabs with a different skin."
- "This is an abstract background with labels."

## New Design Rules For The Next Attempt

- **System before content.** Prototype should be compelling with placeholder words or no words.
- **Behavior before layout.** Choose the core interaction model before arranging text.
- **No default web composition.** Avoid left/right content splits, grids of cards, tab bars, hero headings, and static side panels unless they are transformed beyond recognition.
- **Every visible element needs agency.** It should move, react, remember, attract, repel, reveal, occlude, grow, decay, or transform.
- **Text is a material.** Text can be particles, terrain, labels engraved into surfaces, drifting signal, coordinates, captions, or revealed inscriptions. Do not treat text as normal paragraphs unless absolutely needed.
- **The system should have rules.** Even if surreal, the interaction should feel internally consistent: touch causes known classes of consequences.
- **State should accumulate.** The experience should remember what the visitor has touched during the session through visible traces.
- **The first screen should be visually undeniable.** It should not need explanation to prove it is a creative piece.
- **One ordinary exit survives.** The Back button can stay plain and stable. Everything else is allowed to be strange.

## Revised Prototype Criteria

For the next design pass, each prototype must define these before any visual layout:

1. Core visual system: particles, ASCII field, cabinet physics, creature-like network, spatial instrument, generative drawing, etc.
2. State model: what variables change over time and through user action.
3. Input model: click, drag, hover, keyboard, pointer movement, scroll, time, sound toggle, or device motion.
4. Transformation rules: how the system visibly changes.
5. Personal trace model: how about/projects/contact appear inside the system without becoming sections.
6. Failure mode: how this could collapse back into a normal website and how to prevent that.

The prototype should fail if it is mostly static, even if it looks polished.

## Direction Pivot: ASCII Wins The Next Round

After reviewing the first canvas studies, the ASCII direction is the only one with enough pull to continue as a primary path. Scrap the cabinet and organism studies as current implementation targets. Their useful lessons can survive as traits inside ASCII: object memory, signal routing, and living state.

The next implementation should preserve the earlier generative ASCII system approach: field samplers, seeded noise, density gates, motion grammar, and interaction deposits.

- **Descent Field:** falling rope/vine glyph structure, dark negative space, seeded curved strands, bead-like downward pulses, diagonal tension, and small warm knots.
- **Tide Field:** current-like waves and waterlines that can bend through interaction deposits.
- **Bloom Field:** a sparse dot/o cluster system inspired by Dragonfly-like spacing.
- **Veil Field:** a color/noise ribbon system, useful only if it keeps strong structure and avoids decorative wash.

This keeps the strongest material choice while avoiding the trap of one narrow terminal aesthetic.

Hard medium rule: the ASCII grid is the only visible medium. Characters are the pixels. Controls, status, links, and exits should be drawn as grid text and hit-tested by cell region, not layered above the field as conventional UI.

See `docs/ascii-generative-methodology.md` for the current system methodology: seeded hash, glyph palettes, field structure, motion grammar, density gates, color ramps, interaction deposits, and grid-drawn chrome.

Updated reference lesson: Descent shows that a strong ASCII piece should often be generated by structural masks before glyph rendering. The system should decide where voids, chambers, shafts, surfaces, hatches, and accent channels live, then assign glyphs and colors as materials. Noise should modulate this system, not replace it.

Interaction constraint: field clicks and drags should create deposits that alter generation values such as pressure and memory. They should not draw normal visual stickers or DOM overlays. Keep theme switching, Back, and links available as grid text.

## Replacement High-Level Ideas For Later Breadth

These replace `Chest Room` and `Signal Garden` as future non-ASCII alternatives if the ASCII direction stalls:

### Kinetic Scrapbook

A personal website as a field of torn, moving fragments: notes, tiny drawings, project traces, half-visible cards, windows, and paper-like scraps. The system is not a grid; it behaves like a desk in motion. Dragging, sorting, or hovering changes gravity, layering, and reveal order.

Why it is useful: it keeps the human/personal quality without becoming a resume. It could absorb real artifacts, images, code snippets, and links while remaining visually authored.

Failure mode: becoming a Pinterest board or collage website. Prevent this by giving the fragments physics, rules, and stateful transformations.

### Mechanical Dream Console

A surreal instrument panel made of dials, meters, shutters, and impossible readouts. The visitor tunes a machine rather than navigates sections. Each control changes the environment and reveals a compact personal signal.

Why it is useful: it creates interaction depth and strong visual identity without depending on ASCII. It can feel like an art toy, music device, or strange operating panel.

Failure mode: becoming generic game UI. Prevent this by making the machine specific, tactile, and rule-driven rather than menu-like.

## Creative Director Audit

The strongest version of this experience is not "a portfolio, but styled as a game/terminal/art toy." That framing is too easy and would make the chest feel like a decorative menu button. The chest should open something that could only reasonably live behind a chest on this island: a private room, a device, a cabinet, or a small authored system.

The current prototype directions are useful sketches, but they need stricter taste criteria:

- Terminal / ASCII World has the clearest relationship to software craft, but it risks becoming a familiar hacker aesthetic. It needs warmth, restraint, and real structure. Avoid green-terminal cosplay, fake system logs, noisy glitch, and "type commands to prove you are technical."
- Mysterious Game Menu has strong fit with the island shell, but it risks becoming pure chrome: a save screen with no soul. It needs specific objects, memories, and choices, not generic menu categories.
- Surreal Art Toy has the most artistic potential, but it risks becoming abstract interaction without meaning. It needs legible stakes: each object should reveal a real facet of taste, attention, or practice.
- Personal Cabinet / Artifact Room is the best organizing metaphor because it can absorb the other three: a cabinet can contain a terminal-like device, a game-menu-like index, and surreal manipulable objects.

Recommended direction for the next refinement: **The Chest Room**.

The Chest Room is a private, full-screen space hidden inside the island. It is not a resume and not a page of cards. It is a small room of artifacts. The visitor can inspect a few objects, each object revealing a short, crafted fragment of who Yash is: tools, systems, play, atmosphere, work, and ways out. The first pass can still include the three prototype modes, but the final direction should converge toward a single room/cabinet experience rather than preserving modes as equal products.

## Taste Principles

- **Specific beats clever.** "A drawer of strange useful things" is stronger than "Projects." "Weather in software" is stronger than "creative developer."
- **Objects over categories.** Prefer artifacts, instruments, drawers, signals, notes, and mechanisms. Avoid generic nav labels unless they are supporting structure.
- **A little mystery, then clarity.** The first impression can be strange, but every click should make the site more legible, not less.
- **Restraint over maximalism.** The island already has visual novelty. The inner site should feel deliberate and intimate, not like another layer of spectacle.
- **Texture must have purpose.** Scanlines, ASCII, bloom, grids, and ambient motion are only allowed when they improve tone or interaction.
- **Personal, not confessional.** The copy should reveal taste and attention without becoming a diary or a professional pitch.
- **Playable, not puzzle-gated.** Visitors should feel invited to touch things, but core content cannot be hidden behind obscure interactions.
- **Keep one ordinary exit.** The Back control should be visible, stable, and unromantic. A strange room still needs a door.

## Editorial Voice

The writing should feel authored but not overwritten. The danger is sounding like a poetic product designer describing a mood board. The stronger voice is precise, dryly warm, and object-oriented.

Voice rules:

- Prefer concrete nouns: instrument, shelf, signal, note, room, latch, map, wire, drawer.
- Prefer short lines with one image or claim each.
- Avoid explaining the metaphor directly in the UI.
- Avoid generic self-description: "creative developer," "passionate builder," "playful interfaces," "full-stack engineer" unless context demands it.
- Let interaction demonstrate play. Let copy name what the visitor has found.
- Use first person sparingly. The room should imply the person behind it.
- Contact copy should be plain. This is where clarity beats atmosphere.

Good line shape:

- "Useful things can still have grain."
- "A strange room still needs an ordinary exit."
- "Rules make the room legible. Secrets make it worth staying."
- "The work should feel held before it feels impressive."

Weak line shape:

- "I am passionate about creating playful digital experiences."
- "Explore my projects and learn more about me."
- "Welcome to my interactive portfolio."
- "Unlock the secrets of my professional journey."

## Visual Grammar

The final room should have one dominant visual grammar: a dark, tactile cabinet-room with subtle digital instruments. ASCII, menu language, and surreal motion are secondary dialects, not separate themes.

Composition:

- Use a contained room/cabinet layout rather than a page of floating panels.
- Favor one strong spatial anchor: a shelf, table, console, or cabinet wall.
- Put artifacts in stable positions so the visitor can build memory of the room.
- Reserve large type for the room title or active artifact. Keep utility controls small.
- Let negative space do work. Do not fill every corner with texture.

Color:

- Keep the island relationship through deep sea/black, warm gold, and a small cyan signal accent.
- Avoid a one-note neon terminal palette.
- Avoid purple-blue gradient dominance.
- Gold should behave like object light, not a brand color poured everywhere.
- Cyan should be a signal/accent, not the main atmosphere.

Motion:

- Use slow ambient movement for room weather.
- Use fast motion only for cause-and-effect feedback after a user action.
- Avoid random jitter unless it represents a specific unstable object.
- Every animation should answer: "What changed because I touched this?"

Texture:

- Pixel/scanline/ASCII texture should be local to instruments or surfaces.
- Background texture should be quieter than the artifacts.
- Avoid decorative grids that do not correspond to layout, measurement, signal, or object behavior.

## Interaction Grammar

The room should teach itself by responding predictably.

Default state:

- At least one artifact should clearly invite inspection.
- The room should not require reading instructions before touching.
- The Back control should be visually separate from the fiction of the room.

On hover/focus:

- An artifact can brighten, tilt, hum, reveal a label, or draw a line to the active note.
- Hover should suggest inspectability, not trigger full content changes that disappear.

On click/tap:

- The active artifact becomes selected.
- A note, panel, or instrument surface opens.
- The state change should be visible in both object and content area.

On drag:

- Dragging should feel like rearranging or tuning, not like moving arbitrary stickers.
- If an object can be dragged, the motion should affect either its note, a line, a sound/visual state, or the room composition.

On keyboard:

- Tab should reach Back, artifact controls, and any in-room index.
- Escape should close the room.
- Arrow keys can navigate an index only when focus or mode makes that expectation clear.

## Anti-Patterns

- A resume timeline disguised as a game menu.
- A terminal that makes visitors guess commands.
- Glitch effects used as decoration.
- Generic cards floating over a cool background.
- Too many equal visual systems competing at once.
- Copy that says "playful interfaces" without demonstrating play.
- A prototype switcher that survives into the final product without a conceptual reason.
- Overexplaining the premise inside the UI.
- Mood-board prose that tells the visitor the site is tasteful.
- Interactions that are only draggable because draggable things feel "interactive."
- Treating mystery as an excuse for unclear navigation.

## Refined Creative Premise

Working title: **The Chest Room**.

One-line premise: The chest opens a small hidden room of personal instruments and artifacts, each revealing a compact piece of Yash's taste, practice, and curiosity.

First impression:

- The overlay should feel like entering a contained interior, not opening a modal.
- The island should still feel present as context, but visually quiet behind or outside the room.
- The visitor should immediately understand "I can inspect this" without a tutorial.

Primary interaction:

- Inspect objects.
- Each object changes the room, reveals a note, or activates a small behavior.
- The experience can include a compact index, but the objects should be the main navigation.

Content model:

- `Instrument`: software as a tool or interface.
- `Weather`: atmosphere, visual taste, motion, and environment.
- `System`: interest in rules, simulations, architecture, and clarity.
- `Signal`: contact, links, and outward paths.

The current Terminal/Menu/Toy prototypes map roughly onto these, but the next pass should make them feel like facets of one room instead of separate concepts.

## Concept Scorecard

Use this to critique each iteration:

| Criterion | Question | Pass Signal |
| --- | --- | --- |
| Fit | Does this belong behind the island chest? | It would feel odd as a normal standalone portfolio page. |
| Authorship | Does it reveal a person with taste? | The content feels specific, not template-like. |
| Legibility | Can a visitor understand what to do in five seconds? | There is at least one obvious inspectable object or action. |
| Restraint | Is there one dominant visual idea? | Effects support the premise instead of competing. |
| Revisit Value | Is there a small delight worth touching twice? | Motion or state changes feel responsive, not random. |
| Mobile Integrity | Does it remain composed on a phone? | The content stacks, scrolls, and controls remain reachable. |

An iteration should score well on Fit, Authorship, and Legibility before it gets more visual polish.

## Creative Review Questions

Ask these before adding any feature, effect, or copy:

1. Does this make the room feel more specific to Yash, or could it belong to any creative developer?
2. Is this an object, a behavior, or just decoration?
3. If the effect disappeared, would the concept get weaker or only less flashy?
4. Does this help the visitor understand what to do next?
5. Is the line of copy naming something concrete, or performing cleverness?
6. Does this interaction reveal content, change state, or create memory?
7. Does the island/chest relationship become stronger because of this choice?
8. Would this still feel good if the animation were reduced by half?
9. Is the mobile version a designed room or a collapsed desktop layout?
10. Is there one ordinary way out?

If the answer to three or more of these is weak, simplify before adding more craft.

## Directional Decision

Current decision: continue prototyping, but steer toward a single synthesized Chest Room.

Do not preserve the three-mode structure as the final architecture unless testing proves the modes themselves are the concept. Right now they read as exploration scaffolding. The likely final hierarchy should be:

- Shell: island scene.
- Entry: chest click with a brief reveal transition.
- Inner site: Chest Room.
- Navigation: inspectable artifacts plus one compact in-room index.
- Surfaces: terminal/instrument, room note, signal panel.

This preserves the best of each explored direction without making the user choose between unrelated skins.

## Decision Log

Current decisions:

- The final direction should be **one room**, not three equal modes.
- The room should be organized around **artifacts**, not resume sections.
- The first four artifacts are `Instrument`, `Weather`, `System`, and `Signal`.
- The terminal idea should survive as an **instrument surface**, not a whole-site aesthetic.
- The game menu idea should survive as an **index/ledger behavior**, not a full UI skin.
- The surreal art-toy idea should survive as **tactile room behavior**, not arbitrary draggable decoration.
- The default artifact should be `Instrument`.
- `Signal` should be the plainest, least theatrical artifact.
- The room should be compact enough to understand quickly and exhaust in one to two minutes.

Why these decisions are currently strong:

- They make the chest interaction feel conceptually necessary.
- They protect the site from becoming a decorated resume.
- They give the design a clear synthesis path instead of a mode comparison.
- They preserve clarity: four objects, one room, one exit.
- They give each explored concept a job.

## What Would Change Our Mind

Revise the direction if testing or visual review shows one of these:

- Visitors consistently describe the first screen as a modal, dashboard, or portfolio page.
- The artifact metaphor makes the experience less legible, not more.
- The room feels too precious to touch.
- The `Instrument` default makes the whole room feel too technical or terminal-led.
- The four artifacts feel like renamed nav tabs rather than distinct objects.
- Mobile cannot preserve the room feeling without excessive compromise.
- The island shell and room do not feel connected.

If that happens, do not add polish. Revisit the room anchor, artifact silhouettes, and transition first.

Fallback direction if The Chest Room fails:

- Keep the island shell.
- Make the chest open a **single mysterious index** rather than a full room.
- Preserve object language in the copy, but simplify the visual system.
- Keep only `Instrument`, `System`, and `Signal`; drop `Weather` if atmosphere becomes decorative.

## Red-Team Critique

Assume the project fails. These are the most likely failure modes:

1. **It becomes a tasteful loading screen.** Beautiful atmosphere, thin interaction, no reason to stay.
2. **It becomes a themed portfolio.** The same resume content appears under better labels.
3. **It becomes a toy with no memory.** The user can drag or click things, but nothing accumulates meaning.
4. **It becomes over-art-directed.** Every element is precious; the room loses the easy clarity that makes it usable.
5. **It becomes three demos in a trench coat.** Terminal, menu, and toy remain separate instead of becoming a unified room.
6. **It becomes private to the point of opacity.** The metaphors are meaningful to the maker but illegible to visitors.
7. **It becomes visually louder than the island.** The shell and inner room compete instead of forming a sequence.
8. **It becomes generic "indie game UI."** Good mood, weak authorship.

Countermeasures:

- Make every artifact answer: what does this reveal that a normal portfolio would flatten?
- Give every interaction a visible state change and a content consequence.
- Remove one decorative layer before adding a new one.
- Keep at least one plain-language note visible at all times.
- Test the mobile layout as a first-class room, not a concession.
- Do not write copy that describes the concept. Write copy that belongs to the object.

## Subtraction List

Before the next visual pass, remove or hide:

- The visible prototype switcher as the primary top-level framing.
- Any labels that sound like default game UI (`Character`, `Inventory`, `Map`) unless intentionally transformed.
- Any glitch, scanline, grid, bloom, or ASCII layer that does not belong to a specific artifact.
- Any paragraph that could appear on a normal About page.
- Any draggable behavior that does not change the room or reveal something.
- Any transition that feels like a web modal instead of entering a contained space.
- Any repeated gold/cyan treatment that makes all artifacts feel equivalent.

Subtraction is part of craft here. The room should feel discovered, not decorated.

## Artifact Inventory

The room needs a small number of memorable artifacts. Four is enough for the next pass.

| Artifact | Role | Interaction | Content Revealed | Taste Risk |
| --- | --- | --- | --- | --- |
| Instrument | Software as a held tool | Opens a small terminal/instrument surface with selectable prompts | How Yash thinks about tools, interfaces, and making software feel usable | Becoming fake-terminal cosplay |
| Weather | Atmosphere and visual taste | Changes room ambience, motion, or light; reveals a short note | Why motion, texture, and environment matter to the work | Becoming pure decoration |
| System | Rules, structure, and clarity | Opens a compact ledger/index with stateful choices | Interest in architecture, simulations, constraints, and legible systems | Becoming generic game menu |
| Signal | Ways out | Opens clean links/contact with minimal ceremony | GitHub, LinkedIn, email, possibly resume later if needed | Becoming too theatrical for simple links |

Possible later artifacts:

- `Sketchbook`: small experiments, drafts, fragments.
- `Compass`: selected interests or paths through the work.
- `Key`: a hidden/optional detail that rewards curiosity but gates nothing essential.

Do not add these until the first four feel distinct.

## Visitor Sequence

The experience should have a simple emotional arc:

1. **Discovery:** The chest opens. The room appears as a contained place, not a page.
2. **Orientation:** Four artifacts are visible. One is quietly active by default.
3. **Inspection:** The visitor touches an artifact and gets an immediate, specific response.
4. **Recognition:** The note/instrument reveals something personal but compact.
5. **Choice:** The visitor understands there are a few more objects to inspect.
6. **Exit:** The Signal artifact or Back control provides a plain way out.

The sequence should take ten seconds to understand and one to two minutes to exhaust. This is a personal chamber, not an app with deep navigation.

## Object Scripts

Each artifact needs a role in the room. These are scripts, not final copy.

### Instrument

Visual idea: a small terminal, oscilloscope, brass-labeled console, or handheld tool embedded in the cabinet.

Behavior:

- Default: low cyan signal pulse.
- Hover/focus: cursor line or measurement mark appears.
- Click: opens a compact prompt surface.
- Prompt options: `tools`, `interfaces`, `experiments`, `notes`.

Reveals:

- How Yash thinks about software as something held and used.
- A few selected project traces can appear here, but not as case studies.

Microcopy candidates:

- "A tool should explain itself while you use it."
- "Useful things can still have grain."
- "I like software that feels handled, not sprayed onto a screen."

### Weather

Visual idea: a small cloud glass, tide dial, light well, or atmospheric object that changes the room.

Behavior:

- Default: slow ambient motion.
- Hover/focus: room light shifts slightly.
- Click: toggles one room weather state, such as clear, signal, dusk.
- The change should be subtle enough to preserve readability.

Reveals:

- Interest in atmosphere, motion, and the emotional texture of interfaces.
- This is the place to express visual taste without writing a manifesto.

Microcopy candidates:

- "Interfaces have weather, whether we design it or not."
- "Motion should make the room easier to read, not harder to ignore."
- "A little atmosphere can turn a utility into a place."

### System

Visual idea: a ledger, small map plate, mechanical index, or rule board.

Behavior:

- Default: one visible rule or route.
- Hover/focus: lines connect artifacts.
- Click: opens a compact index with stateful choices.
- Choices should change the active note or artifact relationship, not just swap text.

Reveals:

- Taste for systems, constraints, architecture, simulations, and clear rules.
- Shows that play is structured, not random.

Microcopy candidates:

- "Rules make the room legible."
- "The playful part works because the boring part is precise."
- "A small system is a promise: touch this, and something knowable happens."

### Signal

Visual idea: a plain signal plate, radio tab, keyhole label, or clean outbound terminal.

Behavior:

- Default: quiet and visually stable.
- Hover/focus: simple highlight, no theatrical animation.
- Click: opens links/contact.

Reveals:

- Contact and external paths.
- This artifact should be the least mysterious part of the room.

Microcopy candidates:

- "The exits are plain on purpose."
- "A strange room still needs an ordinary door."
- "Email, GitHub, LinkedIn. No maze here."

## Content Cuts

To preserve taste, delay or exclude these unless a later version earns them:

- Full resume timeline.
- Long project descriptions.
- Big introductory "about me" paragraph.
- Blog-like writing archive.
- Testimonials, metrics, or user counts.
- More than four primary artifacts.
- A lore explanation for the island.

These may be useful elsewhere, but they would make this room heavier and more conventional.

## First-Pass Copy Payload

Use this as the starting copy for the synthesis prototype. Keep each surface short.

Room title:

- `The Chest Room`

Room note:

- `A small room of instruments, weather, systems, and signals. Touch one thing at a time.`

Instrument:

- Label: `Instrument`
- Note: `Useful things can still have grain.`
- Prompt `tools`: `A tool should explain itself while you use it.`
- Prompt `interfaces`: `The surface matters because it is where the system becomes human.`
- Prompt `experiments`: `Small experiments are how an idea earns weight.`
- Prompt `notes`: `The work should feel held before it feels impressive.`

Weather:

- Label: `Weather`
- Note: `Interfaces have weather, whether we design it or not.`
- State `still`: `Still light. The room is readable.`
- State `signal`: `Signal light. The instruments wake slightly.`
- State `dusk`: `Dusk light. The room gets quieter.`

System:

- Label: `System`
- Note: `Rules make the room legible.`
- Rule `one`: `Touch creates state.`
- Rule `two`: `State should reveal content.`
- Rule `three`: `Content should make the room more specific.`

Signal:

- Label: `Signal`
- Note: `The exits are plain on purpose.`
- Links: `Email`, `GitHub`, `LinkedIn`

Copy rule: if a line sounds like it belongs on LinkedIn, cut it.

## Content Hierarchy

The site should communicate in this order:

1. **Premise through place.** The visitor understands this is a hidden room because of spatial composition, not explanation.
2. **Person through objects.** The artifacts imply taste, practice, and attention.
3. **Work through fragments.** Projects can appear as traces or examples, not a full portfolio index.
4. **Contact through clarity.** Links are easy to find and plain.

If a section cannot be assigned to one of these layers, it probably does not belong in the Chest Room.

## Reference Qualities

Do not copy a visual reference wholesale. Use references as qualities to test against.

Useful qualities:

- **Museum vitrine:** objects feel selected and protected; spacing creates importance.
- **Workbench:** tools feel usable, not precious; function is visible.
- **Old game save room:** calm, bounded, a little ceremonial; the user understands they are between worlds.
- **Instrument panel:** controls have purpose; labels are sparse; feedback is immediate.
- **Cabinet of curiosities:** objects imply a person through collection, but the arrangement is edited.

Qualities to avoid:

- **Cyber terminal:** too familiar, too performative.
- **Startup dashboard:** efficient but emotionally wrong.
- **Portfolio gallery:** makes the chest a gimmick.
- **Mystery box:** seductive but empty if the contents are vague.
- **Art-school installation:** beautiful but hostile to ordinary comprehension.

The intended blend is: workbench clarity, save-room atmosphere, cabinet specificity, instrument feedback.

## Final Taste Rubric

Use this as the harsher review before calling a version polished:

| Score | Meaning |
| --- | --- |
| 1 | Generic portfolio with decorative theming. |
| 2 | Interesting mood, unclear concept, weak content. |
| 3 | Coherent prototype with some authored details. |
| 4 | Memorable room, clear interactions, restrained visual language. |
| 5 | Could only belong to this site and this person; feels inevitable. |

Target for first synthesis pass: **3**.

Target before shipping: **4**.

Do not chase 5 by adding more. A 5 usually comes from subtraction, specificity, and one or two unforgettable interactions.

## Core Flow

1. User lands in the island scene.
2. User clicks the chest.
3. Island input is temporarily captured or paused.
4. A full-page Chest Room transitions in.
5. User inspects one of the room artifacts.
6. Artifact behavior changes the active note, instrument surface, or room state.
7. User explores other artifacts or opens the Signal exits.
8. User clicks a back button or presses `Escape`.
9. Overlay transitions out.
10. Island view and controls are restored.

The overlay should take the whole page and sit above the Three.js canvas. It should not be constrained to the current iframe visual dimensions.

## Prototype Switcher

Because the goal is concept exploration, the first implementation should include a small prototype switcher inside the overlay. It can be hidden behind a compact control, but it should let us quickly compare:

- Terminal / ASCII World
- Mysterious Game Menu
- Surreal Art Toy

Optional fourth variation:

- Personal Cabinet / Artifact Room

The switcher is for development and review. It does not need to survive into the final direction.

Creative note: the prototype switcher is a workshop tool, not a product feature. If it remains visible too long, it will train the work toward "three skins" instead of one authored experience. The next refinement should either hide it behind a development affordance or reframe it as an in-world index.

## Iteration Protocol

Use this ritual after each design or implementation pass:

1. **Five-second read:** without interacting, name what the room appears to be. If the answer is "portfolio overlay," the pass failed.
2. **First touch:** click the most inviting artifact. It should respond immediately and reveal something specific.
3. **Subtraction pass:** remove one effect, one line of copy, and one visual boundary. If the work gets better, keep the subtraction.
4. **Mobile first-repeat:** inspect the same artifact on mobile. It should feel redesigned, not squeezed.
5. **Plain-language audit:** summarize what was learned about Yash in one sentence. If the sentence is generic, rewrite the artifact.
6. **Exit test:** find the way out without thinking. If the exit competes with the fiction, simplify it.

Record the result as:

- Keep
- Cut
- Sharpen
- Defer

Do not add new artifacts during this ritual. The purpose is to improve the room's taste, not expand its inventory.

## Concept Variation A: Terminal / ASCII World

Feeling: intimate, technical, playful, slightly strange.

Creative judgment: promising as a component, weak as the whole experience. It should become an object inside the Chest Room, perhaps a small terminal/instrument that lets visitors inspect fragments. Its job is to communicate software fluency and wit, not to define the entire visual identity.

User experience:

- The overlay opens into a terminal-like world, but not a normal command line.
- Content appears as navigable ASCII rooms, nodes, or constellations.
- The user can click/type simple commands or select visible prompts.
- Text can glitch, resolve, or redraw as the user moves between sections.

Possible sections:

- `whoami`: short personal intro
- `artifacts`: experiments and projects
- `notes`: interests, tools, ideas
- `links`: contact and socials

Interactive prototype goals:

- animated ASCII background or map
- selectable commands or regions
- at least two content states
- back button and Escape support

Risks:

- Can become visually noisy fast.
- Needs careful text sizing on mobile.
- Should not require users to know terminal commands.
- Can feel dated or performative if the copy leans into faux-hacker language.

## Concept Variation B: Mysterious Game Menu

Feeling: quiet, cinematic, game-like, intentional.

Creative judgment: strongest for transition and information architecture, weakest for warmth. Use its discipline: sparse choices, strong focus, keyboard navigation, clear state. Do not let it become the final surface unless the panels become more object-like and personal.

User experience:

- The overlay feels like a pause menu, save-select screen, or mysterious RPG system menu.
- The user chooses from options like `About`, `Artifacts`, `Signals`, `Contact`.
- Each selection opens a focused panel or scene state with sparse copy.
- Visuals can use scanlines, pixel typography, soft ambient motion, and dramatic transitions.

Possible sections:

- `Character`: small personal intro
- `Inventory`: selected artifacts/projects
- `Map`: areas of interest
- `Signal`: contact links

Interactive prototype goals:

- keyboard and pointer navigation
- animated active selection
- one deeper panel with content
- back stack within overlay plus global return to island

Risks:

- Could feel too much like a menu and not enough like a website.
- Needs enough content texture to avoid becoming empty chrome.
- Can become generic "RPG UI" unless the labels and artifacts are very specific.

## Concept Variation C: Surreal Art Toy

Feeling: expressive, tactile, exploratory, weird in a good way.

Creative judgment: strongest for authorship and memorability. It should drive the final tone, but it needs the cabinet/room structure to keep it legible. The art-toy interactions should expose content through touch, not replace content with motion.

User experience:

- The overlay becomes an interactive visual field rather than a document.
- The user manipulates shapes, cards, symbols, or small scenes.
- Content reveals itself through motion, dragging, hovering, or clicking.
- The page can feel like a digital object more than a web page.

Possible interactions:

- draggable artifacts that reveal notes
- a reactive canvas background
- floating labels that settle into readable content
- click-to-transform scenes

Interactive prototype goals:

- one full-screen animated/reactive scene
- at least three interactive objects
- readable content reveal states
- back button and Escape support

Risks:

- Highest design ambiguity.
- Can become inaccessible if content depends too much on hidden gestures.
- Performance may need later tuning.
- Needs editorial restraint so it does not feel like random draggable labels.

## Optional Concept Variation D: Personal Cabinet / Artifact Room

Feeling: curious, personal, collected, tactile.

Creative judgment: strongest final container. This should be promoted from optional variation to the likely synthesis direction after the prototype comparison.

User experience:

- A full-screen cabinet, shelf, desk, or archive of personal artifacts.
- Each object represents a thought, project, link, or interest.
- The user opens drawers/cards/objects to reveal small pieces of content.

Interactive prototype goals:

- grid or spatial arrangement of artifacts
- hover/focus states
- object detail view
- lightweight ambient animation

Why it may be useful:

- It sits between portfolio clarity and playful exploration.
- It gives a concrete structure if the other concepts feel too abstract.
- It allows the site to feel personal without becoming a resume or an art demo.

## Next Refinement Brief

The next implementation pass should not add a fourth equal mode. Instead, it should synthesize the modes into a more tasteful Chest Room prototype.

Next decisions to make in order:

1. Choose the room anchor: shelf, table, console, or cabinet wall.
2. Choose the default active artifact.
3. Decide whether the prototype switcher is hidden, removed, or made into an in-room debug drawer.
4. Define the one room-level weather change.
5. Pick the one chest-to-room transition.
6. Decide the mobile artifact rail pattern.

Recommended decisions for the next pass:

1. **Room anchor:** cabinet wall plus worktable. The cabinet gives artifact memory; the table gives tactility and avoids pure gallery behavior.
2. **Default active artifact:** Instrument. It is the clearest bridge from Yash's software practice into the room, and it gives the visitor a legible first action.
3. **Prototype switcher fate:** remove from the primary UI. If needed, hide it behind a tiny debug drawer labeled `room tests`.
4. **Room-level weather change:** Weather toggles between `still`, `signal`, and `dusk`. The change affects light, accent color, and ambient motion only.
5. **Chest-to-room transition:** a short lid-like reveal: dark wipe upward, brief gold edge light, then the room settles. Keep it under 700ms.
6. **Mobile artifact rail:** horizontal artifact rail under the Back control, active surface below. No draggable freeform layout on mobile until it earns its keep.

These choices are not final taste decisions; they are the next prototype's constraints. A constrained prototype will teach us more than another open-ended mode comparison.

Target changes:

1. Replace the visible prototype switcher with an in-world index or a smaller development-only control.
2. Reframe the current toy objects as cabinet artifacts: `Instrument`, `Weather`, `System`, `Signal`.
3. Make one artifact open a terminal-like inspection surface.
4. Make one artifact open a game-menu-like index.
5. Keep the surreal tactile object field as the ambient room behavior.
6. Reduce generic labels like `CHARACTER`, `INVENTORY`, and `MAP` unless they are intentionally part of the artifact language.
7. Add one memorable transition from chest click to room: a short dark wipe, glow bloom, or lid-like reveal.
8. Write less copy, but make each line more specific.
9. Implement the `Object Scripts` as the source of truth for artifact behavior.
10. Make one artifact produce a room-level visual change so the room feels alive, not merely navigable.

Success condition for this refinement: a visitor should describe the experience as "a strange little room of personal artifacts" rather than "a portfolio with terminal/game/art modes."

## Synthesis Prototype Acceptance Criteria

The next build should be considered successful only if these are true:

- The first screen reads as one coherent room/cabinet, not a mode selector.
- At least four artifacts are visible: `Instrument`, `Weather`, `System`, `Signal`.
- Each artifact has a different interaction flavor, but all share one visual system.
- The terminal language appears as a contained instrument, not as the entire page.
- The menu/index language appears as a room index or ledger, not as a game UI skin.
- The surreal art-toy behavior makes the room feel tactile, but does not obscure reading.
- The Back button remains outside the fiction and always works.
- On mobile, the room becomes a composed vertical inspection flow rather than a cramped desktop canvas.
- The copy contains no resume bullets and no generic portfolio greetings.
- The prototype switcher is removed, hidden, or reframed as an in-world development/debug affordance.
- The four artifacts cannot be mistaken for four identical cards with different labels.
- At least one artifact creates a room-level change, not only a text change.
- At least one artifact has an intentionally ordinary, low-drama interaction to keep the room grounded.

## Implementation-Ready Synthesis Brief

Build one coherent Chest Room prototype with these constraints:

State model:

- `activeArtifact`: `instrument | weather | system | signal`
- `roomWeather`: `still | signal | dusk`
- `instrumentPrompt`: `tools | interfaces | experiments | notes`
- `systemChoice`: one selected rule/index item

Primary layout:

- `Back` remains outside the room fiction.
- `ChestRoomShell` owns the background, transition, weather state, and mobile/desktop layout.
- `ArtifactRail` renders four distinct artifacts.
- `ArtifactSurface` renders the active artifact's content.
- `RoomIndex` is optional and should feel like a ledger/drawer label, not a game menu.

Desktop composition:

- Cabinet wall/table hybrid.
- Artifacts occupy stable positions around the left/center.
- Active surface sits right or lower-right.
- Weather state subtly changes the shell, not the artifact labels alone.

Mobile composition:

- Back control.
- Horizontal artifact rail.
- Active surface.
- Optional room note.
- No free dragging as the primary mobile behavior.

Interaction minimum:

- Selecting Instrument opens a prompt surface.
- Selecting Weather toggles room state.
- Selecting System opens the index/ledger surface.
- Selecting Signal exposes links plainly.
- Escape and Back close the room.

What not to build in this pass:

- No new artifacts beyond the four.
- No project grid.
- No resume content.
- No full-screen terminal mode.
- No separate game-menu mode.
- No decorative draggable labels without artifact consequence.

## Next-Pass Handoff Checklist

Before coding:

- Pick the artifact silhouettes: what does `Instrument`, `Weather`, `System`, and `Signal` look like at rest?
- Sketch the desktop room arrangement in one pass: cabinet wall plus worktable.
- Sketch the mobile arrangement separately: Back, artifact rail, active surface.
- Decide what `Weather` changes visually in `still`, `signal`, and `dusk`.
- Decide where the `Signal` links live and make them boring on purpose.

During coding:

- Replace top-level mode switching with `activeArtifact`.
- Render one `ChestRoomShell`.
- Keep Back outside the fiction.
- Keep copy from the First-Pass Copy Payload unless a line is clearly improved.
- Make artifact selection visibly affect both artifact state and active surface.
- Make Weather produce a room-level state change.
- Keep Instrument's terminal language contained.
- Keep System's index language compact.

Before polish:

- Run the Iteration Protocol.
- Remove one effect.
- Remove one line of copy.
- Check that each artifact still feels distinct in silhouette and behavior.
- Check that the mobile version does not feel like an afterthought.
- Ask whether a normal portfolio page could express the same thing. If yes, sharpen the artifact.

Do not start visual polish until the first screen reads as a room and the first touch teaches the interaction.

## Suggested Synthesis Layout

Desktop:

- Top layer: ordinary Back control, small and fixed.
- Main scene: a dark cabinet-room or table surface.
- Left/center: four artifacts arranged spatially, each with a distinct silhouette.
- Right/bottom: active note/instrument surface.
- Optional small index: a drawer label, ledger tab, or brass plate that lists artifacts.

Mobile:

- Back control at top.
- Room title or active artifact name.
- Horizontal or vertical artifact rail.
- Active artifact surface below.
- Ambient texture reduced; content prioritized.

Artifact behaviors:

- `Instrument`: opens a compact terminal-like surface with clickable prompts.
- `Weather`: changes ambient motion/color subtly and reveals a note about interface atmosphere.
- `System`: opens a small rule/index panel with stateful choices.
- `Signal`: shows clean outbound links with minimal theatricality.

Implementation sketch:

- Replace `mode` with `activeArtifact`.
- Keep `InnerMode` only as an internal/dev debug state if needed.
- Render one `ChestRoom` shell with four artifact buttons.
- Render the active artifact surface inside the same room, rather than swapping whole-page modes.
- Keep the terminal renderer, menu renderer, and toy behavior as sub-surfaces.
- Add a tiny `debug` affordance only if concept comparison still matters.

## Current Implementation Snapshot

The current implementation has moved away from panel/card prototypes and into a single full-screen canvas installation in `three-website/src/modules/innerExperience.ts`.

Current behavior:

- The chest opens a viewport-filling overlay.
- Island controls are disabled while the overlay is open.
- `BACK` and `Escape` return to the island.
- The canvas owns the primary experience.
- Four ASCII studies are available through grid-drawn controls: `descent`, `tide`, `bloom`, and `veil`.
- Theme switching is available for exploration.
- Field clicks and drags add pressure/memory deposits that themes read while generating glyphs.
- Links and Back remain drawn as ASCII grid text and hit-tested by cell region.

This is closer to the revised north star because the prototype starts from structure, drawing, and motion rather than layout. It is still a prototype harness, not the final direction.

## Design Debt In Current Prototype

These are not bugs, but they should be addressed before visual polish:

- Descent is the default and should be evaluated for rope/vine continuity, falling motion, dark negative space, and alignment with the supplied Descent inspiration.
- Motion should be judged in-browser, not by still screenshots alone.
- The theme switcher is useful for exploration, but it may eventually need to become a debug-only affordance.
- Deposits are active, but they should be tuned so they mutate fields materially rather than simply brighten cells.
- The next pass should tune density, void scale, accent rarity, and motion speed by watching each theme for at least 30 seconds.
- There is no chest-to-system transition yet, so the opening can still feel like an overlay appearing.
- The current copy is compact, but the system should reveal more personal specificity without adding paragraphs.

## Technical Plan

Implement the overlay inside `three-website`, not `frontend`.

Suggested module shape:

- `src/modules/innerExperience.ts`
  - creates overlay root
  - opens/closes overlay
  - owns installation study switching during exploration
  - handles Escape/back behavior
  - temporarily pauses or captures island controls
  - owns canvas state, memory marks, signal outlet, and pointer interaction

- `src/modules/innerExperienceStyles.ts` or injected style block, optional later
  - styles can remain injected while the concept is still in heavy flux
  - move to CSS only after the final visual language stabilizes

- `src/modules/innerExperiences/`
  - optional folder if prototypes become large enough to separate
  - split by renderer/system, not by normal page section

Integration points:

- Update `onClickChest` in `utilities.ts` to open the overlay instead of only resetting/focusing the camera.
- Keep island scene rendered behind the overlay for continuity unless performance becomes a problem.
- Disable island camera/input while overlay is open.
- Restore island input when overlay closes.
- Support `Escape` as a close affordance.
- Add visible back button in the overlay.

Avoid using the existing iframe holder for this overlay. The overlay should be normal DOM above the canvas so it can take the whole viewport.

## UX Requirements

- Overlay fills the viewport.
- Back button is always discoverable.
- Escape closes the overlay.
- Pointer interactions inside the overlay do not leak into island controls.
- Mobile layout is usable, even if performance optimization comes later.
- Prototype/study switcher is available during concept exploration.
- Each study has meaningful interaction beyond static text.
- State persists visibly during a session.
- Contact links can be reached without making the whole experience a contact page.
- Copy should be personal and atmospheric, not resume-like.

## Visual Requirements

- Use the existing `homevideo` and `input` fonts where they fit.
- Do not make the overlay look like a standard portfolio template.
- Keep the island as a meaningful outer shell.
- Prefer strong first-screen identity over explanatory onboarding text.
- Keep buttons and controls compact and clearly interactive.
- Avoid dense cards unless a concept specifically calls for object/detail views.
- Prefer canvas/WebGL/SVG systems, generated marks, text-as-material, and spatial consequences over normal DOM layout.

## Verification Plan

Run through WSL from the Windows host:

```powershell
wsl.exe --cd "/mnt/c/Users/Yash Kaul/Documents/GitHub/website/three-website" bash -lc "npm run build"
```

Manual smoke test:

1. Start the Vite dev server.
2. Open the island page.
3. Click the chest.
4. Confirm overlay opens and fills the viewport.
5. Switch between installation studies.
6. Interact with each study.
7. Press `Escape`.
8. Reopen the overlay.
9. Click the back button.
10. Confirm island controls work after closing.
11. Confirm traces and memory marks appear while interacting.
12. Confirm the signal outlet wakes and links are clickable.

Browser checks:

- desktop viewport
- mobile viewport
- keyboard-only close path
- no obvious console errors
- no text overlap in primary controls

## Initial Implementation Milestones

1. Create clean branch from `dev`.
2. Add overlay module with open/close lifecycle.
3. Wire chest click to open overlay.
4. Add back button and Escape close.
5. Add study switcher.
6. Implement canvas organism study.
7. Implement canvas ASCII field study.
8. Implement canvas cabinet study.
9. Add persistent memory marks and signal outlet.
10. Build and smoke test.
11. Review studies and choose one system to refine.

## Open Questions

- Should the chest opening transition visually connect to the chest, such as a zoom, flash, wipe, or lid-opening effect?
- Should the overlay preserve audio from the island or mute/duck it while open?
- Should prototype switching be visible in production builds or only during development?
- Should the final selected direction replace all prototypes, or should the site keep multiple modes as an intentional feature?
- What personal content should be included in the first prototype pass?
