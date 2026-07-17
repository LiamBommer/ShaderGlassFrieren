
# Glasshaus

> https://shaders.com/sections/glass-agency-hero 

# Build the "Glass Agency Hero" section

You are implementing a production-quality hero section called **Glass Agency Hero**, built with the Shaders WebGPU component library. Adapt the reference implementation's idioms to the framework and conventions already used in this project (React, Vue, Svelte, Solid, or plain JS) — component syntax, class handling, and head/link management should follow the project's patterns. A live reference runs at https://previews.shaders.com/sections/glass-agency-hero — match it as closely as possible.

## What you're building

A gallery-white, creative-studio hero viewed through fluted glass. The full-bleed background is a WebGPU shader stack: a subtle white-on-white swirl base, an indigo bloom that follows the cursor with momentum (ChromaFlow — the cursor reactivity is built into the shader, no event wiring needed), diagonal glass ribs that refract the bloom with chromatic aberration at rib edges, and a whisper of film grain. Foreground content sits over the glass: a slim top nav (wordmark, three links, a pill CTA) and a bottom-left headline in a large grotesk face with a serif-italic accent phrase in indigo, plus a "Selected clients" list pinned bottom-right on large screens. Everything fades and rises in on load with staggered reveal animations.

The brand name ("Glasshaus"), nav labels, headline copy, and client names ("Arper", "Nomad Goods", "Fieldnotes", "Kavat") are placeholders — swap them for the user's real content when provided. All links in the reference are intentionally inert; wire them to real routes in this project (or leave `#` placeholders if none exist yet).

## Step 1 — Install the Shaders library

```bash
npm install shaders
```

Import components from the subpath matching the project's framework: `shaders/react`, `shaders/vue`, `shaders/svelte`, or `shaders/solid`. Setup and SSR guidance (important for Next/Nuxt/SvelteKit — the shader canvas is client-only) lives at https://shaders.com/docs/guide.

If you have MCP tooling available, call `get-shader-docs` for full component prop documentation (installable via `npx shaders@latest install-mcp`).

## Step 2 — Download the assets

This section has no downloadable image/SVG assets. It uses two Google Fonts loaded via stylesheet link tags — add these to the document head using the project's head-management approach:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap">
```

- **Space Grotesk** (400, 500) — the primary UI/headline face.
- **Instrument Serif** (regular + italic) — the italic accent phrase in the headline.

If the project prefers self-hosted fonts, download these families and serve them locally with equivalent `@font-face` rules; never rely on shaders.com domains at runtime.

## Step 3 — The shader background(s)

There is a single `<Shader>` canvas. All layers below are children of one `<Shader>` root, which must completely fill its absolutely-positioned parent (`width: 100%; height: 100%; display: block`). The parent is an `absolute inset-0` div behind all content, marked `aria-hidden="true"`.

```json
{
  "components": [
    {
      "type": "Shader",
      "props": {},
      "children": [
        {
          "type": "Swirl",
          "props": {
            "colorA": "#ffffff",
            "colorB": "#f0f0f0",
            "detail": 1.7
          }
        },
        {
          "type": "ChromaFlow",
          "props": {
            "baseColor": "#ffffff",
            "downColor": "#4642ff",
            "leftColor": "#56c2fc",
            "momentum": 13,
            "radius": 3.5,
            "rightColor": "#5b4fff",
            "upColor": "#7f66ff"
          }
        },
        {
          "type": "FlutedGlass",
          "props": {
            "aberration": 0.61,
            "angle": 31,
            "frequency": 8,
            "highlight": 0.12,
            "highlightSoftness": 0,
            "lightAngle": -90,
            "refraction": 4,
            "shape": "rounded",
            "softness": 1,
            "speed": 0.15
          }
        },
        {
          "type": "FilmGrain",
          "props": {
            "strength": 0.05
          }
        }
      ]
    }
  ]
}
```

There are no reactive bindings — every prop is a static literal. ChromaFlow's cursor-following bloom is built into the component itself (its momentum-based pointer tracking is internal library behavior); do not wire any mouse events.

## Step 4 — Structure

```text
<main>  — isolation: isolate; position: relative; display: flex; flex-direction: column;
          min-height: 100dvh; overflow: hidden; background: #ffffff;
          font-family: 'Space Grotesk', sans-serif; color: #16161d;
          -webkit-font-smoothing: antialiased

  ├─ <div aria-hidden="true">  — position: absolute; inset: 0   (shader layer)
  │    └─ <Shader>  — position: absolute; inset: 0; width: 100%; height: 100%
  │         (full stack from Step 3)

  ├─ <header class="reveal" style="--reveal-delay: 0s">
  │    — position: relative; z-index: 10; display: flex; align-items: center;
  │      justify-content: space-between; padding: 1.75rem 1.5rem;
  │      at ≥640px: padding-left/right 3rem
  │    ├─ <a> wordmark — font-size: 1.125rem; font-weight: 500; letter-spacing: -0.025em
  │    │     text "Glasshaus" + trailing <span> "*" colored #4642ff
  │    ├─ <nav>  — display: flex; align-items: center; gap: 2rem; font-size: 0.875rem;
  │    │          color: #5c5c6b; hidden below 640px (display: none)
  │    │    └─ 3 links: "Work", "Studio", "Journal"
  │    │        hover: color #16161d; transition: color
  │    └─ <a> CTA "Start a project" — border-radius: 9999px; background: #16161d;
  │          padding: 0.5rem 1.25rem; font-size: 0.875rem; color: #ffffff;
  │          hover: background #4642ff; transition: background-color

  └─ <section>  — position: relative; z-index: 10; margin-top: auto (pins to bottom);
        display: flex; align-items: flex-end; justify-content: space-between;
        gap: 2.5rem; padding: 0 1.5rem 2.5rem;
        at ≥640px: padding 0 3rem 3.5rem
     ├─ <div>  — max-width: 48rem
     │    └─ <h1 class="reveal" style="--reveal-delay: 0.25s">
     │         — font-size: clamp(3rem, 7.5vw, 6rem); line-height: 0.95;
     │           font-weight: 500; letter-spacing: -0.03em; text-wrap: balance
     │         text: "Brands seen through " + <em>
     │         <em> accent — font-family: 'Instrument Serif', serif;
     │              font-weight: 400; font-style: italic; color: #4642ff;
     │              text: "a different light."
     └─ <div class="reveal" style="--reveal-delay: 0.55s">   (client strip)
          — flex-shrink: 0; text-align: right; hidden below 1024px (display: none)
          ├─ <p> "SELECTED CLIENTS" — font-size: 0.75rem; letter-spacing: 0.3em;
          │      text-transform: uppercase; color: rgba(92,92,107,0.7)
          └─ <ul> — margin-top: 0.75rem; vertical spacing 0.25rem between items;
                 font-size: 0.875rem; color: #5c5c6b
               items: Arper / Nomad Goods / Fieldnotes / Kavat
```

Semantic notes: use `main` as the root, `header` for the nav bar, `section` for the headline row, and a real `ul` for the client list. The `isolation: isolate` on the root and `z-index: 10` on both content blocks keep them above the absolutely-positioned shader layer. The headline `em` renders inline within the h1 so the accent phrase flows naturally after "Brands seen through".

## Step 5 — Responsive & interactive behavior

**Breakpoints**
- Below 640px: the center nav links are hidden (wordmark and CTA remain); horizontal padding drops from 3rem to 1.5rem; bottom padding of the headline section drops from 3.5rem to 2.5rem.
- Below 1024px: the "Selected clients" strip is hidden entirely.
- The headline scales fluidly via `clamp(3rem, 7.5vw, 6rem)`.

**Reveal animation** — three elements (header, h1, client strip) share a `.reveal` class with staggered delays via a `--reveal-delay` custom property (0s, 0.25s, 0.55s):

```css
.reveal {
  opacity: 0;
  transform: translateY(14px);
  animation: reveal-in 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--reveal-delay, 0s);
}
@keyframes reveal-in {
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .reveal { animation: none; opacity: 1; transform: none; }
}
```

**Hover states**
- Nav links: color transitions from `#5c5c6b` to `#16161d`.
- CTA pill: background transitions from `#16161d` to `#4642ff`.

**Shader interaction** — moving the cursor over the page drags a soft indigo bloom (indigo/violet/sky tints depending on movement direction) with momentum behind the diagonal glass ribs. This is entirely internal to ChromaFlow; no code needed. The fluted glass also drifts slowly on its own (`speed: 0.15`).

## Acceptance

- Full-viewport (min-height 100dvh) white hero with visible diagonal fluted-glass ribs at 31°, subtle chromatic fringing at rib edges, and faint film grain.
- Moving the cursor produces a soft indigo bloom that follows with visible momentum/lag and refracts through the glass ribs — with zero custom event-handling code.
- Nav (wordmark with indigo asterisk, three links, dark pill CTA) sits at the top; headline is pinned bottom-left; client list pinned bottom-right on ≥1024px viewports only.
- Headline uses Space Grotesk 500 at `clamp(3rem, 7.5vw, 6rem)`, line-height 0.95, tracking -0.03em; the phrase "a different light." renders in Instrument Serif italic, colored #4642ff.
- Header, headline, and client strip fade/rise in with delays of 0s / 0.25s / 0.55s over 1.1s each; animations are disabled under `prefers-reduced-motion: reduce` (content fully visible).
- Center nav links hide below 640px; client strip hides below 1024px; padding adjusts per breakpoint.
- CTA hover turns indigo; nav link hover darkens to #16161d.
- In browsers without WebGPU, the section degrades gracefully to the plain white background with all content still readable (the Shaders library handles the canvas fallback; verify no errors break layout).
- All links are wired to the user's real routes, or left as `#` placeholders if routes don't exist yet; placeholder copy and client names are replaced with the user's real content when provided.
- No runtime requests to shaders.com / previews.shaders.com / data.shaders.com domains.
