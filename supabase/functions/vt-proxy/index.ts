import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const VIAGGIATRENO_BASE =
  'https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.viaggiatreno.it/infomobilita/index.jsp',
  Origin: 'https://www.viaggiatreno.it',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  'X-Requested-With': 'XMLHttpRequest',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path');

  if (!path) {
    return new Response(JSON.stringify({ error: 'Missing "path" query param' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Strip any leading slash to avoid double slashes
  const cleanPath = path.replace(/^\/+/, '');
  const target = `${VIAGGIATRENO_BASE}/${cleanPath}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);

  try {
    const upstream = await fetch(target, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        'Content-Type':
          upstream.headers.get('Content-Type') ?? 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('vt-proxy fetch failed:', target, e);
    return new Response(
      JSON.stringify({ error: 'Upstream fetch failed', detail: String(e) }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
