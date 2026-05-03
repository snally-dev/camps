# Camps

A small, mobile-first web app for checking annual camp progress toward a 250-camp year.

Enter the number of camps completed this year and the app shows current progress, projected milestone dates, year-end pace, and a share sheet / clipboard snapshot.

## Tech

- Static HTML, CSS, and JavaScript modules
- No build step
- No dependencies
- No backend, accounts, analytics, or stored user data

## Run Locally

From the repo root:

```sh
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

For a closer deployment-path check, serve the repo from a `/camps/` mount or copy the files into a local `camps/` directory and open:

```text
http://localhost:8000/camps/
```

## Build

There is no production build command. The files in this repo are the deployable app.

Useful validation checks:

```sh
node --check js/config.js
node --check js/calculator.js
node --check js/main.js
node --check sw.js
```

## Deployment

The production app is deployed with GitHub Pages and served at:

```text
https://snally.com/camps/
```

The public link may be shared without the trailing slash as `https://snally.com/camps`; GitHub Pages should normalize that directory URL to `/camps/`.

PWA paths assume that base path:

- Manifest: `/camps/manifest.webmanifest`
- Start URL: `/camps/`
- Scope: `/camps/`
- Service worker: `/camps/sw.js`
- Icons: `/camps/icons/`

Avoid changing these to root-relative `/` paths unless the app is moved off the `/camps/` subdirectory.

The repo includes `.nojekyll` so GitHub Pages serves the static files directly without Jekyll processing. Do not add a `CNAME` file here unless this repo is intended to own the root custom domain; this app is designed to live as the `/camps/` path.

## PWA / Add to Home Screen

The app is configured as a lightweight PWA. On iPhone Safari, use Share -> Add to Home Screen. The home-screen name is `Camps`.

The service worker is intentionally simple. It precaches the app shell and static assets, uses network-first handling for page navigation, and falls back to the cached app shell when offline.

## Calculation Assumptions

- The tracking year starts on January 1 and ends on December 31 in the user's local calendar.
- The entered count is camps completed so far this year.
- If the user already went today, today's camp should be included.
- Pace is calculated from elapsed days in the year, including today.
- Pace is capped at 1 camp per day.
- Milestone projections use the current pace to estimate future dates.
- Counts above the number of elapsed days in the year are rejected.

## Repo Structure

```text
index.html
css/styles.css
js/config.js
js/calculator.js
js/main.js
manifest.webmanifest
sw.js
assets/
icons/
```

This layout is intentionally flat because the app is small. Add structure only when it removes real duplication or clarifies behavior.
