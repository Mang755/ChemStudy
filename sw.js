const CACHE_NAME = "chemstudy-pwa-v39";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=20260415-5",
  "./pwa.css?v=20260415-4",
  "./teacher-portal.css?v=20260414-5",
  "./chatbot.css?v=20260408-2",
  "./lesson-data.js?v=20260414-2",
  "./lesson-data-extra.js?v=20260414-2",
  "./lesson-data-overrides.js?v=20260414-9",
  "./script.js?v=20260415-6",
  "./ai-config.js?v=20260415-1",
  "./supabase-config.js?v=20260406-1",
  "./supabase-cloud.js?v=20260414-2",
  "./teacher-portal.js?v=20260415-4",
  "./chatbot.js?v=20260415-1",
  "./pwa.js?v=20260415-2",
  "./manifest.json?v=20260406-1",
  "./materials/booklet/kyzyrbek-mangaz-kitapsha.pdf",
  "./materials/grade10/saturated-hydrocarbons/alkandar-khimiyalyk-kasietteri.pdf",
  "./materials/grade10/saturated-hydrocarbons/tsikloalkandar.pdf",
  "./icon.svg?v=20260322-2",
  "./icon-192.png?v=20260322-2",
  "./icon-512.png?v=20260322-2",
  "./apple-touch-icon.png?v=20260322-2"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();

        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) {
            return cached;
          }

          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }

          return new Response("", { status: 404, statusText: "Not Found" });
        })
      )
  );
});
