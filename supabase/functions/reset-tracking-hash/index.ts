import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Resets last_notification_hash for a tracked train so the next tick re-sends
// a fresh notification (used when the user dismisses one by clicking it).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { device_id, train_number, data_partenza } = body ?? {};
    if (!device_id || !train_number || !data_partenza) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await supabase
      .from('tracked_trains')
      .update({ last_notification_hash: null })
      .eq('device_id', device_id)
      .eq('train_number', train_number)
      .eq('data_partenza', data_partenza);

    // Fire-and-forget immediate tick
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/tracking-tick`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({ device_id_filter: device_id }),
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('reset-tracking-hash error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
