import { supabase } from '@/integrations/supabase/client';

const DEVICE_ID_KEY = 'trenotracker:device_id';

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function trainKey(trainNumber: number, dataPartenza: number): string {
  return `${trainNumber}-${dataPartenza}`;
}

// Web Push helpers
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

export async function ensurePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) {
    throw new Error('Le notifiche push non sono supportate da questo browser.');
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error(
      'Service worker non registrato. Apri l\'app dalla versione pubblicata (non dal preview) e installala sulla home Android.',
    );
  }

  // Request notification permission
  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') {
    throw new Error('Permesso notifiche negato.');
  }

  // Get / create subscription
  let sub = await registration.pushManager.getSubscription();
  if (!sub) {
    const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
    if (error || !data?.publicKey) throw new Error('Impossibile ottenere la chiave VAPID.');
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }

  const json = sub.toJSON();
  const { error: saveErr } = await supabase.functions.invoke('save-subscription', {
    body: { device_id: getDeviceId(), subscription: json },
  });
  if (saveErr) throw new Error('Impossibile salvare la subscription.');

  return true;
}

export interface TrackPayload {
  trainNumber: number;
  originCode: string;
  dataPartenza: number;
  lineLabel?: string | null;
  destination?: string | null;
}

export async function trackTrain(p: TrackPayload) {
  const { error } = await supabase.functions.invoke('track-train', {
    body: {
      device_id: getDeviceId(),
      train_number: p.trainNumber,
      origin_code: p.originCode,
      data_partenza: p.dataPartenza,
      line_label: p.lineLabel ?? null,
      destination: p.destination ?? null,
    },
  });
  if (error) throw error;
}

export async function untrackTrain(trainNumber: number, dataPartenza: number) {
  const { error } = await supabase.functions.invoke('untrack-train', {
    body: {
      device_id: getDeviceId(),
      train_number: trainNumber,
      data_partenza: dataPartenza,
    },
  });
  if (error) throw error;
}

export async function listTrackedTrains(): Promise<Set<string>> {
  const { data, error } = await supabase.functions.invoke('list-tracked-trains', {
    body: null,
    method: 'GET' as any,
  });
  // supabase-js doesn't easily do GET with query; use direct fetch instead
  if (error || !data) {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-tracked-trains?device_id=${encodeURIComponent(getDeviceId())}`;
      const r = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const j = await r.json();
      return new Set((j.trains ?? []).map((t: any) => trainKey(t.train_number, t.data_partenza)));
    } catch {
      return new Set();
    }
  }
  return new Set((data.trains ?? []).map((t: any) => trainKey(t.train_number, t.data_partenza)));
}
