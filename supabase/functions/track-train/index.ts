import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { device_id, train_number, origin_code, data_partenza, line_label, destination } = body;
    if (!device_id || !train_number || !origin_code || !data_partenza) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase
      .from('tracked_trains')
      .upsert(
        {
          device_id,
          train_number,
          origin_code,
          data_partenza,
          line_label: line_label ?? null,
          destination: destination ?? null,
          last_notification_hash: null,
          last_sent_at: null,
        },
        { onConflict: 'device_id,train_number,data_partenza' },
      );

    if (error) throw error;

    // Trigger an immediate tick for this device (fire and forget)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/tracking-tick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ device_id_filter: device_id }),
    }).catch((e) => console.warn('immediate tick failed:', e));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('track-train error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
