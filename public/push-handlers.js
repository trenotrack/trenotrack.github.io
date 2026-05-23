// Push notification handlers — imported by the Workbox-generated service worker
// via vite-plugin-pwa's `importScripts` option.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'TrenoTracker', body: event.data.text() };
  }

  const title = payload.title || 'TrenoTracker';
  const options = {
    body: payload.body || '',
    tag: payload.tag, // replaces any previous notification with same tag
    renotify: true,
    requireInteraction: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
    actions: [
      { action: 'stop', title: 'Stop tracking' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  if (event.action === 'stop') {
    // Call untrack-train without opening the app
    const url = 'https://fuutqnwgtcdsddnhrbkm.supabase.co/functions/v1/untrack-train';
    const apikey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dXRxbndndGNkc2RkbmhyYmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDAwMjQsImV4cCI6MjA4NDgxNjAyNH0.W4bBQ--d6jDeJ3a3spNWH73YMG_xzNnuVo8EbV3pcVI';
    event.waitUntil(
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey,
          Authorization: `Bearer ${apikey}`,
        },
        body: JSON.stringify({
          device_id: data.device_id,
          train_number: data.train_number,
          data_partenza: data.data_partenza,
        }),
      }).catch((e) => console.warn('untrack failed:', e)),
    );
    return;
  }

  // Default: open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    }),
  );
});
