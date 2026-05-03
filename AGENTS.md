# Agent Notes

This is a small vanilla HTML/CSS/JS app built with Vite through Vite+ (`vp`). Keep changes simple and local to the existing files unless the task clearly requires more.

## Project Shape

- Source files live at the repo root plus `css/`, `js/`, `assets/`, and `icons/`.
- The production build output is `dist/`.
- GitHub Actions deploys the built app to GitHub Pages under `/camps/`.
- PWA files are intentional source files: `manifest.webmanifest`, `sw.js`, and `icons/` must stay tracked.

## Guardrails

- Do not add React, Vue, Svelte, TypeScript, routing frameworks, CSS frameworks, or state libraries unless explicitly requested.
- Avoid broad refactors, file moves, new build tools, or dependency churn.
- Preserve the existing static app structure and fix only the real issue in front of you.
- Keep copy, styling, and JavaScript changes focused and easy to review.

## Workflow

- Install dependencies with `vp install` when dependencies or lockfiles may be stale.
- Run the dev server with `npm run dev`.
- Build with `npm run build`; deployable files are emitted to `dist/`.
- Before finishing code changes, run `npm run check` when practical.

## PWA Notes

- `sw.js` caches URLs under `/camps/`; keep paths aligned with `vite.config.js` and GitHub Pages.
- When changing cached assets or cache behavior, bump `CACHE_NAME` in `sw.js` so users receive fresh files.
- Keep `manifest.webmanifest`, `favicon.ico`, and icon paths consistent with the built output.
