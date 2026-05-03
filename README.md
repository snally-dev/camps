# Camps

A simple, mobile-first app for tracking annual camp progress toward a 250-camp goal.

Enter your current count to see progress, projected milestones, year-end pace, and a clean, shareable snapshot.

## Features

- 250-camp progress tracking
- Milestone projections
- Year-end pace calculation
- Shareable snapshot (copy or share sheet)
- Fast, offline-friendly experience

## Use

https://snally.com/camps/

Works well when added to your home screen on iPhone.

## Local Development

Install dependencies:

```sh
npm install
```

Run the dev server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview the production build:

```sh
npm run preview
```

## Deployment

The production app is served at:

```text
https://snally.com/camps/
```

Vite should be configured with:

```js
base: "/camps/";
```

## Notes

- The tracking year runs January 1 through December 31
- Pace is based on elapsed days in the year, including today
- Pace is capped at 1 camp per day
- Milestones are projected from current pace

---

_Not affiliated with or endorsed by any fitness brand or program._
