/* Service worker F.K.C.S. : ouverture hors connexion + mises à jour automatiques */
const VERSION = 'fkcs-billetterie-v2';
const COEUR = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const HOTES_CDN = /(^|\.)gstatic\.com$|^cdn\.tailwindcss\.com$|^fonts\.googleapis\.com$/;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(COEUR.map((u) => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Nos fichiers : toujours la version la plus récente en ligne (sans cache navigateur), sinon celle gardée en mémoire
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res && res.ok) { const copie = res.clone(); caches.open(VERSION).then((c) => c.put(req, copie)); }
          return res;
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  if (HOTES_CDN.test(url.hostname)) {
    e.respondWith(
      caches.open(VERSION).then((c) =>
        c.match(req).then((m) => {
          const reseau = fetch(req)
            .then((res) => { if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()); return res; })
            .catch(() => m);
          return m || reseau;
        })
      )
    );
  }
});
