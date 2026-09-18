# CHANGE-GUI-WEBGL-SHELL receipt

September 18, 2026. Owner authorization `CHANGE-GUI-WEBGL-SHELL`. This records the planning amendment and engineering visual pass. It does not claim manual UI/UX acceptance and does not authorize Phase 9.

## Planning

`PROJECT-PLAN.md` and `AGENTS.md` now require the live Botanical/Brutalist shell to match the owner-approved glass concepts using WebGL2, React Three Fiber and Three.js, with semantic HTML for interactive controls and an accessible 2D fallback when WebGL2 is unavailable or reduce-transparency / reduce-motion applies.

## Implementation

- `packages/visuals`: `shellGraphicsMode` decision helper, `GlassAtmosphere` R3F scene (theme-aware botanical/brutalist depth with glass slabs), CSS fallback surface, separate `./atmosphere` export so unit imports do not load Three.js.
- `packages/ui`: glass tokens, atmosphere layers, translucent panels, rim/inset lighting in `appearance.css` and restyled `shell.css`.
- `apps/web`: shell wrapped with `GlassAtmosphere`; Connections form uses stacked labels/controls (`form-stack`, `connection-defaults`) so fields no longer collide.
- Unit coverage for graphics-mode fallbacks; no browser/accessibility/UI tests were run (owner-only).

## Verification

Required non-UI checks executed for this pass: types, lint, web build, unit (30), integration (with OS network-denial cases under unrestricted local execution), evals (1), planning (6/6), workflow (44/44). Manual visual acceptance remains pending with the owner. No live provider login, paid request or model download was part of this pass.

## Solidarity + scroll-warp fix

Owner feedback on live samples vs concepts:

- Removed panel-center lens pinch (misread as misaligned cursor light); cursor now drives a soft spotlight only
- Raised frosted card opacity (~58–62%) and rim/shadow so panels match concept “solidarity”
- Wheel / two-finger trackpad scroll warps and parallax-shifts the WebGL backdrop
- Brutalist light/dark rebuilt as monochrome concrete + overhead pool (no botanical green bleed)

Owner visual acceptance remains pending.

## Owner texture assets

Four owner-supplied backdrop photos converted to WebP and stored under `apps/web/public/assets/shell/`:

- botanical-light / botanical-dark
- brutalist-light / brutalist-dark

`GlassAtmosphere` loads them via Three.js `TextureLoader`; CSS 2D fallback uses the same URLs. Procedural canvas foliage/concrete remain available only as offline helpers, not the live backdrop.

## Pointer interaction effects

- Botanical: idle looping light breeze always on; mouse-speed wind energy scales from barely-visible shiver to full-screen leaf shake. Leaves stay animated under glass.
- Botanical dark: lifted foliage exposure + stronger cursor spotlight so leaves read; pointer light is green-tinted.
- Over botanical glass: water-bottle refraction (barrel/caustic + chromatic sheen) on the backdrop behind the card.
- Brutalist: concrete grind still mutes while over `.glass`.
- Glass cards: subtle corner/rim specular only (masked edge highlight).
- Botanical light: denser frost and deeper text for contrast; backdrop further muted after owner “too bright” feedback (canvas `#B5AF9A`, stronger vignette/shader darken).

## Remote checkpoint

Verified origin/main SHA: `53d34021cb25b3f218a84753cf901a963a5364ac`.
