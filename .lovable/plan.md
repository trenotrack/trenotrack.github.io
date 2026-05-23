## Tracking treni in tempo reale con notifiche push (Android PWA)

### Cosa costruiamo

Una campanella su ogni TrainCard e nell'header del dettaglio treno. Click → permesso notifiche → il server invia push ogni 30s aggiornando lo stato. Notifica con azione "Stop tracking" che ferma il tracking senza aprire l'app.

### Architettura

```text
┌──────────┐  subscribe   ┌────────────────────┐
│  PWA     │─────────────▶│ edge: subscribe    │──▶ DB: push_subscriptions
│          │              │ edge: track-train  │──▶ DB: tracked_trains
│          │              │ edge: untrack      │
│  SW      │◀─push─via────│ edge: notify-cron  │◀── pg_cron ogni 30s
│ (notif)  │  VAPID       │  (polla API +      │     polla ViaggiaTreno
└──────────┘              │   invia web-push)  │     per ogni treno attivo
                          └────────────────────┘
```

### Database (Lovable Cloud)

- `push_subscriptions`: device_id (text), endpoint, p256dh, auth, created_at. UNIQUE(device_id).
- `tracked_trains`: id, device_id, train_number, origin_code, data_partenza, line_label, destination, last_notification_hash (per evitare re-invio se nulla è cambiato), last_sent_at, created_at. UNIQUE(device_id, train_number, data_partenza).

Niente login: `device_id` = UUID generato e salvato in `localStorage`. RLS aperto (le tabelle non sono leggibili dal client se non tramite edge function con service role; in pratica niente accesso anon).

### Edge Functions

1. **`get-vapid-public-key`** (GET): ritorna la public key per la `subscribe()` lato client.
2. **`save-subscription`** (POST `{device_id, subscription}`): upsert in `push_subscriptions`.
3. **`track-train`** (POST `{device_id, train_number, origin_code, data_partenza, line_label, destination}`): insert in `tracked_trains` + invia subito una prima push di conferma.
4. **`untrack-train`** (POST `{device_id, train_number, data_partenza}` — chiamato dall'action `Stop tracking` del SW): elimina la riga.
5. **`tracking-tick`** (cron ogni 30s): per ogni `tracked_trains`, chiama ViaggiaTreno `andamentoTreno`, calcola hash di `{ritardo, prossima_stazione, orario_previsto}`, se diverso da `last_notification_hash` chiude la vecchia notifica (via `tag`) e ne invia una nuova; aggiorna hash.

VAPID keys: le genero al volo via `npm:web-push@3` e le aggiungo come secrets `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto: placeholder).

### Service Worker (push handler)

Esteso `vite-plugin-pwa` con `srcDir`/`strategies: 'injectManifest'` o aggiungendo handler custom via `injectManifest` per gestire eventi `push` e `notificationclick`:
- `push`: mostra notifica con `tag` univoco per treno → sostituisce la precedente automaticamente. `actions: [{action: 'stop', title: 'Stop tracking'}]`.
- `notificationclick`: se `action === 'stop'` → `fetch` a `untrack-train` con i parametri nel `data` della notifica.

### UI

- **`useTracking` hook**: gestisce device_id (localStorage), permesso notifiche, subscription, e mantiene un Set locale dei treni tracciati (caricato all'avvio da `tracked_trains` filtrato per device_id).
- **`TrackingBell` componente**: icona campanella (vuota/piena). Click → se non sottoscritto, prompt permesso + subscribe; poi toggle track/untrack.
- Aggiunta in `TrainCard` (in alto a destra, accanto al tempo) e nell'header di `TrainDetailModal`.

### Formato notifica

- Titolo: `{lineLabel ?? categoria} - {numeroTreno} - {destinazione}`
- Corpo: `Next: {prossimaStazione} {orarioPrevisto} (previsto {orarioProgrammato})` — se il treno è arrivato a destinazione: `Arrivato`.

### Vincoli da ricordare

- Funziona su **Android Chrome/Edge con PWA installata** (o anche da browser, ma le push sono più affidabili se installata).
- Periodo minimo cron Supabase è 1 minuto. Per avere ~30s userò **una sola cron a 1 min** che fa due iterazioni a distanza di 30s (`await new Promise(r => setTimeout(r, 30000))` a metà). Più semplice e robusto.
- Le push **non funzionano nel preview Lovable** (iframe + SW disabilitato in preview). Test reale solo su build pubblicata e installata su Android.

### Step di implementazione

1. Generare VAPID keys + salvarle come secrets (3 secrets via add_secret — userò valori che genero io con web-push).
2. Migration: tabelle + RLS + abilitare `pg_cron`/`pg_net`.
3. Edge functions (5).
4. Cron job (via insert tool, contiene URL+anon).
5. Custom service worker (`public/sw-push.js` iniettato via injectManifest).
6. `useTracking` hook + `TrackingBell` componente.
7. Integrazione in `TrainCard` e `TrainDetailModal`.

### Comunicazione finale all'utente

Dopo l'implementazione spiegherò:
- Come installare la PWA su Android (Chrome → menu → Installa app).
- Che il primo click sulla campana chiede il permesso notifiche.
- Che il preview dell'editor non riceve push: testare sulla URL pubblicata dopo "Publish".
