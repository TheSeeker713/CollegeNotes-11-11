# Devlog — WebGL botanical/brutalist shell polish

**Date:** 2026-09-18  
**Authority:** `CHANGE-GUI-WEBGL-SHELL`  
**Scope:** Visual shell fidelity only. Does not claim owner UI acceptance. Does not authorize Phase 9.

## Summary

Owner texture assets and pointer-driven shell effects were integrated into the live Botanical/Brutalist WebGL glass shell, then iterated from live feedback.

## Delivered

### Assets
- Converted four owner photos to WebP under `apps/web/public/assets/shell/` (~324KB total vs ~1.2MB JPEG).
- Wired into WebGL `TextureLoader` and CSS 2D fallback.

### Botanical
- Removed decorative 3D glass spheres.
- Light mode: muted parchment canvas, denser frost, darker text; backdrop shader + vignette further reduced brightness after owner feedback that light mode was still too bright.
- Dark mode: lifted foliage exposure and stronger green cursor spotlight so leaves read.
- Wind: idle looping light breeze; mouse-speed wind energy scales from barely-visible shiver to full-screen leaf shake (directional sway + desynced flutter, not radial liquid warp).
- Over glass cards: water-bottle refraction (barrel/caustic/sheen) on the backdrop; wind continues underneath.

### Brutalist
- Concrete grind/crumble follows mouse velocity; muted while pointer is over `.glass`.

### Glass cards
- Specular is edge/corner-only (masked rim), biased to nearest corner — no face bloom.

## Verification

Non-UI: `check:types`, `check:lint`, targeted unit tests, web build. Owner visual acceptance remains pending.

## Files of note

- `packages/visuals/src/{GlassAtmosphere,backdrop-effects,liquid-glass-shader,shell-textures}.ts(x)`
- `packages/ui/src/{appearance.css,tokens.ts}`
- `apps/web/public/assets/shell/*`
- `docs/phases/change-gui-webgl-shell-receipt.md`
