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

## Boundary

Stop before Phase 9. Owner UI review is required before treating the glass shell as accepted.
