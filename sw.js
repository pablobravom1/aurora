// STC App — instalación, caché y notificaciones push.
// No cachea datos de Supabase, solo el cascarón de la aplicación.
const CACHE_NAME = 'stc-v1';
const APP_SHELL = [
  './', './index.html', './styles.css', './app.js', './config.js', './kilo.js', './manifest.json', './avatar-sprite-v2.png',
  './avatar-original-01.webp', './avatar-original-02.webp', './avatar-original-03.webp', './avatar-original-04.webp', './avatar-original-05.webp',
  './avatar-original-06.webp', './avatar-original-07.webp', './avatar-original-08.webp', './avatar-original-09.webp', './avatar-original-10.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Siempre intenta obtener la versión más nueva y usa la copia guardada
// solamente cuando el teléfono no tiene conexión.
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});

// Mensajes, rutinas y entrenamientos terminados usan el mismo receptor.
self.addEventListener('push', (event) => {
  let datos = {};
  try { datos = event.data ? event.data.json() : {}; }
  catch(e){ datos = { body: event.data ? event.data.text() : '' }; }
  const titulo = datos.title || 'STC App';
  event.waitUntil((async () => {
    await self.registration.showNotification(titulo, {
      body: datos.body || 'Tienes una novedad',
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: datos.tag || 'stc-app',
      renotify: true,
      vibrate: [200, 100, 200, 100, 300],
      data: { url: datos.url || './' }
    });
    try {
      const abiertas = await self.registration.getNotifications();
      if(self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge(abiertas.length || 1);
    } catch(e){}
  })());
});

// La navegación completa hace compatibles tanto los enlaces nuevos de chat y
// rutina como el resumen de entrenamiento que ya existía.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const abierta = ventanas.find((v) => v.url.startsWith(self.registration.scope));
    if(abierta){
      try {
        await abierta.navigate(destino);
        return abierta.focus();
      } catch(e){}
    }
    return self.clients.openWindow(destino);
  })());
});
