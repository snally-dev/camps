# Camps

Mobile Camp progress toward 250.

Enter one count. See pace, need, plans, and share text.

## Features

- 250-Camp progress
- Mean-rate and projected EOY math
- Needed weekly pace
- 4/wk, 5/wk, and 6/wk plans
- Milestones: 50, 100, 150, 200, 250
- Share sheet plus clipboard fallback
- Mobile-first UI

## Use

https://snally.com/camps/

Works well on iPhone home screen.

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

- Year: Jan 1-Dec 31.
- Reset: Jan 1.
- Count includes today.
- Future math starts tomorrow.
- Limit: 1 Camp/day.
- Mean rate is `Camps / elapsed days`, shown as Camps/week.
- Projected EOY is `floor(count + mean rate * days left)`.
- Required pace is `Camps left / days left`, shown as Camps/week.
- Think tidyverse: distinct dates, summarise the YTD mean, mutate the EOY projection.
- 4/wk, 5/wk, and 6/wk dates are estimates.
- Share text includes progress, need, 6/wk, and link.
- Shared links may include `?count=145`; they do not overwrite local saved counts.

---

_Not affiliated with or endorsed by any fitness brand or program._
