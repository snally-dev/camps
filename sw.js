const CACHE_NAME = "camp-milestones-v4";
const APP_ASSETS = [
  "/camps/",
  "/camps/index.html",
  "/camps/css/styles.css",
  "/camps/js/main.js",
  "/camps/assets/camp-milestones-logo.png",
  "/camps/favicon.ico",
  "/camps/manifest.webmanifest",
  "/camps/icons/icon-180.png",
  "/camps/icons/icon-192.png",
  "/camps/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith("/camps/")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/camps/")));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
