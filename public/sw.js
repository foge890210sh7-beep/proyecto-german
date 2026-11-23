// Service worker mínimo: hace la app instalable.
// No cachea páginas ni datos (todo es privado y debe verse siempre al día).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
