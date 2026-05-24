// Push notification handlers — imported by the Workbox-generated service worker
// via vite-plugin-pwa's `importScripts` option.

const SUPABASE_URL = 'https://fuutqnwgtcdsddnhrbkm.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1dXRxbndndGNkc2RkbmhyYmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNDAwMjQsImV4cCI6MjA4NDgxNjAyNH0.W4bBQ--d6jDeJ3a3spNWH73YMG_xzNnuVo8EbV3pcVI';

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
    tag: payload.tag,
    renotify: true,
    requireInteraction: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: payload.data || {},
    actions: [{ action: 'stop', title: 'Stop tracking' }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

function callEdge(fn, body) {
  return fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(body),
  }).catch((e) => console.warn(`${fn} failed:`, e));
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {};
  event.notification.close();

  if (event.action === 'stop') {
    event.waitUntil(
      callEdge('untrack-train', {
        device_id: data.device_id,
        train_number: data.train_number,
        data_partenza: data.data_partenza,
      }),
    );
    return;
  }

  // Default: open the train detail page + reset hash so a fresh notification
  // will be sent at the next tick (~30s).
  const params = new URLSearchParams();
  if (data.train_number) params.set('train', String(data.train_number));
  if (data.data_partenza) params.set('data', String(data.data_partenza));
  if (data.origin_code) params.set('origin', String(data.origin_code));
  const targetPath = `/?${params.toString()}`;

  event.waitUntil(
    (async () => {
      // Reset hash in background so the user keeps getting updates.
      if (data.device_id && data.train_number && data.data_partenza) {
        callEdge('reset-tracking-hash', {
          device_id: data.device_id,
          train_number: data.train_number,
          data_partenza: data.data_partenza,
        });
      }

      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const c of clients) {
        if ('focus' in c) {
          try {
            await c.focus();
          } catch {}
          if ('navigate' in c) {
            try {
              await c.navigate(targetPath);
            } catch {}
          } else {
            c.postMessage({ type: 'open-train', path: targetPath });
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetPath);
      }
    })(),
  );
});
