# Proxy interno per ViaggiaTreno (sostituire Cloudflare Worker)

## Problema
Le chiamate a `viaggiatreno.it` passano dal tuo Cloudflare Worker (`trenotracker.enricozoia.workers.dev`), che Akamai (gestore di ViaggiaTreno) sta ora bloccando. Le edge function di Lovable Cloud girano su infrastruttura diversa (Supabase/Deno) con IP differenti, e una di esse (`tracking-tick`) già contatta ViaggiaTreno con successo. Spostiamo lì tutto il traffico.

## Soluzione
Creare una edge function interna `vt-proxy` che inoltra qualsiasi percorso dell'API ViaggiaTreno, aggiungendo header da browser reale (User-Agent, Referer, Accept) per ridurre il rischio di blocco bot di Akamai. Il frontend smette di usare il Cloudflare Worker e chiama questa funzione.

## Cosa cambia

### 1. Nuova edge function `supabase/functions/vt-proxy/index.ts`
- Riceve il path target via query param (es. `?path=partenze/S01700/...`).
- Inoltra a `https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/<path>` con header realistici:
  - `User-Agent` di un browser desktop
  - `Referer: https://www.viaggiatreno.it/`
  - `Accept`, `Accept-Language: it-IT`
- Restituisce il body grezzo (testo) con CORS `*`, così il client lo gestisce come fa oggi col Worker.
- Gestione OPTIONS/CORS e timeout.
- `verify_jwt = false` (API pubblica, nessun login).

### 2. `src/lib/api.ts`
- Sostituire `corsProxy` (Cloudflare) con la URL della edge function `vt-proxy`.
- Aggiornare `buildUrl()` per costruire `?path=<encoded>` verso la edge function.
- Logica di retry/timeout esistente invariata.

### 3. (Opzionale) Allineare `tracking-tick`
- Far passare anche `getDetails` di `tracking-tick` per gli stessi header realistici (oggi fa fetch diretto senza header), per coerenza e robustezza.

## Note tecniche
- Le edge function Supabase hanno IP diversi dal Worker: probabile sblocco. Se Akamai dovesse bloccare anche questi IP, gli header browser-like aiutano; in caso estremo si valuterà un servizio proxy a pagamento, ma si parte da questa soluzione a costo zero.
- Nessuna modifica al DB o ai segreti.
- Il Cloudflare Worker può restare attivo come fallback, ma di default non verrà più usato.

```text
Frontend  ->  vt-proxy (edge function, IP Supabase + header browser)  ->  viaggiatreno.it
```
