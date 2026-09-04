// Watchtower service worker — handles push + notification taps, and makes the app installable.
const CACHE = "watchtower-v2";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Only cache static same-origin assets. Never touch navigations or /.auth/* —
// intercepting those breaks the Entra sign-in cookie flow and causes login loops.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (e.request.mode === "navigate") return;        // let the browser handle page loads + auth redirects
  if (url.pathname.startsWith("/.auth")) return;     // never intercept auth endpoints
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// A push arrived — show the notification.
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch (_) {
    data = { title: "Watchtower", body: e.data ? e.data.text() : "" };
  }
  e.waitUntil(
    self.registration.showNotification(data.title || "Watchtower", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.alertId || "watchtower",
      data: { alertId: data.alertId || null },
    })
  );
});

// Tapped a notification — focus the app (or open it).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if ("focus" in c) return c.focus();
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
