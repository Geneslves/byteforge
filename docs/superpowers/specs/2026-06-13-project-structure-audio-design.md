# ByteForge Project Structure and Audio Design

## Goal

Reorganize ByteForge into a cleaner long-term frontend structure and add an explicit background music control for the existing ink-wash terminal audio asset.

## Architecture

Static assets live under `public/`, application data lives under `src/data/`, behavior modules live under `src/modules/`, and styles live under `src/styles/`. The root `src/main.js` remains the app composition entrypoint and should not own feature logic.

## Audio Behavior

- Move `Ink_Wash_Terminal.mp3` to `public/audio/ink-wash-terminal.mp3`.
- Add a compact audio toggle to the existing CLI navigation.
- Audio is off by default to respect browser autoplay restrictions.
- Clicking the toggle plays or pauses the looped background music.
- The toggle stores state in `localStorage` using `byteforge:audio-enabled`.
- If playback is blocked or fails, the button returns to the off state without breaking the page.
- The control must expose `aria-pressed` and an explicit Chinese label.

## File Structure

- `src/data/content.js`: route data, search entries, and planet route configuration.
- `src/modules/audio.js`: background music control.
- `src/modules/theme.js`: theme initialization and toggle behavior.
- `src/modules/routing.js`: route rendering, search filtering, SPA navigation, and back handling.
- `src/modules/planets.js`: planet state binding and planet click behavior.
- `src/modules/effects.js`: parallax, meteor shower, loading bar helpers, and keyboard support.
- `src/modules/dom.js`: shared DOM helpers.
- `src/styles/style.css`: main visual system.
- `src/styles/themes.css`: theme variables.
- `src/styles/effects.css`: motion and effect styles.
- `src/main.js`: imports styles and wires modules together.

## Validation

- `scripts/check-routes.js` must import from `src/data/content.js`.
- A new project structure check must fail when the root MP3 exists, expected module files are missing, or the public audio asset is missing.
- `pnpm run check:project`, `pnpm run check:routes`, and `pnpm build` must pass.
- Browser verification must confirm the audio toggle exists, changes `aria-pressed`, and does not block navigation controls.
