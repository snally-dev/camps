# Agent Notes

This is a small vanilla HTML/CSS/JS app built with Vite through Vite+ (`vp`). Keep changes simple and local to the existing files unless the task clearly requires more.

## Project Shape

- Source files live at the repo root plus `css/`, `js/`, `assets/`, and `icons/`.
- The production build output is `dist/`.
- GitHub Actions deploys the built app to GitHub Pages under `/camps/`.
- Home screen metadata files are intentional source files: `manifest.webmanifest`, `favicon.ico`, and `icons/` must stay tracked.

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

## Home Screen Notes

- Keep `manifest.webmanifest`, `favicon.ico`, and icon paths consistent with the built output.
