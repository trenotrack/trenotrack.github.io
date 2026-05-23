import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const VIAGGIATRENO_BASE = 'https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno';

interface TrainStop {
  stazione: string;
  arrivo_teorico: number | null;
  partenza_teorica: number | null;
  partenzaReale: number | null;
  arrivoReale: number | null;
  actualFermataType: number;
  tipoFermata: string;
}

interface TrainDetails {
  numeroTreno: number;
  categoria: string;
  destinazione: string;
  ritardo: number;
  fermate: TrainStop[];
  arrivato: boolean;
  tipoTreno?: string;
}

function fmtTime(ts: number | null): string {
  if (!ts) return '--:--';
  const d = new Date(ts);
  return d.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  });
}

async function getDetails(originCode: string, num: number, ts: number): Promise<TrainDetails | null> {
  try {
    const r = await fetch(`${VIAGGIATRENO_BASE}/andamentoTreno/${originCode}/${num}/${ts}`);
    if (!r.ok) return null;
    const txt = await r.text();
    if (!txt.trim()) return null;
    return JSON.parse(txt);
  } catch (e) {
    console.warn(`Fetch failed for train ${num}:`, e);
    return null;
  }
}

interface NotifContent {
  title: string;
  body: string;
  hash: string;
}

function buildNotif(d: TrainDetails, lineLabel: string | null, destination: string | null): NotifContent {
  const label = lineLabel || d.categoria || 'TRENO';
  const dest = destination || d.destinazione;
  const title = `${label} - ${d.numeroTreno} - ${dest}`;

  // Find next stop (first not passed and not destination already)
  const nextStopIdx = d.fermate.findIndex((s) => s.actualFermataType !== 1);
  const isArrived = d.arrivato || nextStopIdx === -1;

  let body: string;
  if (d.tipoTreno === 'ST') {
    body = 'Treno soppresso';
  } else if (isArrived) {
    body = d.ritardo > 0 ? `Arrivato con ${d.ritardo}' di ritardo` : 'Arrivato in orario';
  } else {
    const next = d.fermate[nextStopIdx];
    const scheduled = next.arrivo_teorico ?? next.partenza_teorica;
    const scheduledStr = fmtTime(scheduled);
    const estimatedMs = scheduled ? scheduled + d.ritardo * 60_000 : null;
    const estimatedStr = fmtTime(estimatedMs);
    if (d.ritardo > 0) {
      body = `Next: ${next.stazione} ${estimatedStr} (previsto ${scheduledStr})`;
    } else {
      body = `Next: ${next.stazione} ${scheduledStr}`;
    }
  }

  const hash = `${d.ritardo}|${nextStopIdx}|${isArrived ? 1 : 0}|${d.tipoTreno || ''}`;
  return { title, body, hash };
}

async function runTick(body: { device_id_filter?: string }) {
  const startedAt = Date.now();
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let query = supabase.from('tracked_trains').select('*');
  if (body.device_id_filter) query = query.eq('device_id', body.device_id_filter);
  const { data: tracked, error } = await query;

  if (error) {
    console.error('tracked_trains query error:', error);
    return { ok: false, error: String(error) };
  }

  if (!tracked || tracked.length === 0) {
    return { ok: true, processed: 0 };
  }

  // Preload all subscriptions for active devices
  const deviceIds = [...new Set(tracked.map((t) => t.device_id))];
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('device_id', deviceIds);
  const subsByDevice = new Map((subs ?? []).map((s) => [s.device_id, s]));

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const t of tracked) {
    const sub = subsByDevice.get(t.device_id);
    if (!sub) {
      skipped++;
      continue;
    }

    const d = await getDetails(t.origin_code, t.train_number, t.data_partenza);
    if (!d) {
      errors++;
      continue;
    }

    const notif = buildNotif(d, t.line_label, t.destination);
    if (notif.hash === t.last_notification_hash) {
      skipped++;
      continue;
    }

    const payload = JSON.stringify({
      title: notif.title,
      body: notif.body,
      tag: `train-${t.train_number}-${t.data_partenza}`,
      data: {
        device_id: t.device_id,
        train_number: t.train_number,
        data_partenza: t.data_partenza,
      },
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      await supabase
        .from('tracked_trains')
        .update({
          last_notification_hash: notif.hash,
          last_sent_at: new Date().toISOString(),
        })
        .eq('id', t.id);
      sent++;
    } catch (e: any) {
      console.error(`push send failed for ${t.train_number}:`, e?.statusCode, e?.body);
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('device_id', t.device_id);
      }
      errors++;
    }
  }

  console.log(`tick done in ${Date.now() - startedAt}ms: sent=${sent} skipped=${skipped} errors=${errors}`);
  return { ok: true, sent, skipped, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let body: { device_id_filter?: string; twice?: boolean } = {};
  try {
    if (req.method === 'POST') {
      const txt = await req.text();
      if (txt.trim()) body = JSON.parse(txt);
    }
  } catch {
    // ignore
  }

  // Cron calls with twice:true to get ~30s frequency (cron min is 1 min)
  const r1 = await runTick(body);
  let r2: any = null;
  if (body.twice) {
    await new Promise((resolve) => setTimeout(resolve, 30_000));
    r2 = await runTick(body);
  }

  return new Response(JSON.stringify({ ok: true, r1, r2 }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

