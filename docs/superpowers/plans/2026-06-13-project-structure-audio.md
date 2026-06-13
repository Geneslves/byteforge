# Project Structure and Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a background music switch and reorganize ByteForge files into a maintainable frontend structure.

**Architecture:** Move static media into `public/audio`, move content data into `src/data`, split behavior into `src/modules`, and move styles into `src/styles`. Keep `src/main.js` as a composition-only entrypoint.

**Tech Stack:** Vite 6, native ES modules, vanilla JavaScript, CSS, Node validation scripts.

---

### Task 1: Structure Check

**Files:**
- Create: `scripts/check-project.js`
- Modify: `package.json`

- [ ] Add a Node validation script that checks required directories, module files, style files, and audio asset placement.
- [ ] Run `node scripts/check-project.js` before moving files and confirm it fails because the new structure is not present.
- [ ] Add `check:project` to `package.json`.

### Task 2: Directory Reorganization

**Files:**
- Move: `Ink_Wash_Terminal.mp3` to `public/audio/ink-wash-terminal.mp3`
- Move: `src/content.js` to `src/data/content.js`
- Move: `src/style.css` to `src/styles/style.css`
- Move: `src/themes.css` to `src/styles/themes.css`
- Move: `src/effects.css` to `src/styles/effects.css`

- [ ] Move the binary audio asset with `Move-Item`.
- [ ] Move text files with patch-based renames.
- [ ] Update imports in scripts and entrypoints after moves.

### Task 3: JavaScript Module Split

**Files:**
- Create: `src/modules/dom.js`
- Create: `src/modules/theme.js`
- Create: `src/modules/routing.js`
- Create: `src/modules/planets.js`
- Create: `src/modules/effects.js`
- Create: `src/modules/audio.js`
- Modify: `src/main.js`

- [ ] Extract shared helpers into `dom.js`.
- [ ] Extract theme behavior into `theme.js`.
- [ ] Extract route rendering and SPA navigation into `routing.js`.
- [ ] Extract planet state binding into `planets.js`.
- [ ] Extract parallax, meteor, and keyboard behavior into `effects.js`.
- [ ] Add audio toggle behavior in `audio.js`.
- [ ] Keep `main.js` as the initializer.

### Task 4: UI and Docs

**Files:**
- Modify: `index.html`
- Modify: `src/styles/style.css`
- Modify: `src/styles/effects.css`
- Modify: `README.md`
- Modify: `docs/implementation-plan.md`
- Modify: `docs/byteforge-design-baseline.md`

- [ ] Replace stylesheet links with a single module import from `src/main.js`.
- [ ] Add the music toggle button to `.cli-nav`.
- [ ] Add audio toggle CSS consistent with the existing CLI control language.
- [ ] Document the new structure and music asset behavior.

### Task 5: Verification and Save

**Files:**
- Verify: `scripts/check-project.js`
- Verify: `scripts/check-routes.js`
- Verify: `scripts/build.js`

- [ ] Run `pnpm run check:project`.
- [ ] Run `pnpm run check:routes`.
- [ ] Run `pnpm build`.
- [ ] Use Browser to confirm the toggle exists and changes state.
- [ ] Commit the final state with a focused message.
