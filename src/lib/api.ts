// API utilities for ViaggiaTreno

// Internal proxy: Supabase Edge Function that forwards to ViaggiaTreno
// with browser-like headers (different IPs than the old Cloudflare Worker,
// which Akamai started blocking).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const VT_PROXY = `${SUPABASE_URL}/functions/v1/vt-proxy`;

function buildUrl(path: string): string {
  return `${VT_PROXY}?path=${encodeURIComponent(path)}`;
}

async function readProxyText(response: Response): Promise<string> {
  return await response.text();
}

async function readProxyJson<T>(response: Response): Promise<T | null> {
  const text = await readProxyText(response);
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

// Retry wrapper with timeout + fast retries (no aggressive backoff)
async function fetchWithRetry(
  url: string,
  { maxRetries = 2, timeoutMs = 6000, retryDelayMs = 400 }: { maxRetries?: number; timeoutMs?: number; retryDelayMs?: number } = {}
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      // Treat 5xx and 429 as retryable; return everything else (incl. 4xx) immediately
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;
      console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}):`, (error as Error).message);
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw lastError || new Error('Failed after retries');
}

export interface Station {
  name: string;
  code: string;
}

export interface Train {
  numeroTreno: number;
  categoria: string;
  categoriaDescrizione: string;
  destinazione: string;
  codOrigine: string;
  ritardo: number;
  nonPartito: boolean;
  arrivato: boolean;
  inStazione: boolean;
  compOrarioPartenza: string;
  orarioPartenza: number;
  dataPartenzaTreno: number;
  binarioProgrammatoPartenzaDescrizione: string | null;
  binarioEffettivoPartenzaDescrizione: string | null;
  provvedimento: number; // 1 = cancellato
  circolante: boolean;
}

export interface TrainStop {
  stazione: string;
  id: string;
  arrivo_teorico: number | null;
  partenza_teorica: number | null;
  partenzaReale: number | null;
  arrivoReale: number | null;
  ritardoPartenza: number;
  ritardoArrivo: number;
  binarioProgrammatoPartenzaDescrizione: string | null;
  binarioProgrammatoArrivoDescrizione: string | null;
  binarioEffettivoPartenzaDescrizione: string | null;
  binarioEffettivoArrivoDescrizione: string | null;
  tipoFermata: string; // P = partenza, F = fermata, A = arrivo
  actualFermataType: number; // 0 = non ancora passato, 1 = passato
}

export interface TrainDetails {
  numeroTreno: number;
  categoria: string;
  origine: string;
  destinazione: string;
  ritardo: number;
  stazioneUltimoRilevamento: string | null;
  compOraUltimoRilevamento: string | null;
  oraUltimoRilevamento: number | null;
  fermate: TrainStop[];
  nonPartito: boolean;
  arrivato: boolean;
  tipoTreno?: string; // ST = soppresso, DV = deviato, PP/SI/SF = parzialmente soppresso
  subTitle?: string;
}

export async function searchStations(query: string): Promise<Station[]> {
  if (query.length < 2) return [];

  try {
    const response = await fetchWithRetry(buildUrl(`autocompletaStazione/${encodeURIComponent(query)}`));

    if (!response.ok) return [];

    const text = await readProxyText(response);
    if (!text.trim()) return [];

    return text
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [name, code] = line.split('|');
        return { name: name?.trim() || '', code: code?.trim() || '' };
      })
      .filter(s => s.name && s.code);
  } catch (error) {
    console.error('Error searching stations:', error);
    return [];
  }
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export async function getStationDepartures(stationCode: string): Promise<Train[]> {
  const now = new Date();
  const dateStr = now.toUTCString();

  const response = await fetchWithRetry(buildUrl(`partenze/${stationCode}/${dateStr}`));

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status);
  }

  const data = await readProxyJson<Train[]>(response);
  return data || [];
}

export interface TrainCandidate {
  originCode: string;
  trainNum: string;
  timestamp: string;
  label: string; // e.g. "COMO LAGO - 11/05/26"
}

export async function searchTrainCandidates(trainNumber: string): Promise<TrainCandidate[]> {
  try {
    const response = await fetchWithRetry(buildUrl(`cercaNumeroTrenoTrenoAutocomplete/${trainNumber}`));

    if (!response.ok) return [];

    const text = await readProxyText(response);
    if (!text.trim()) return [];

    // Format per line: "2156 - COMO LAGO - 11/05/26|2156-S01765-1778450400000"
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('|');
        if (parts.length < 2) return null;
        const [trainNum, originCode, timestamp] = parts[1].split('-');
        if (!trainNum || !originCode || !timestamp) return null;
        // Human label: strip leading train number from the descriptive part
        const desc = parts[0].split(' - ').slice(1).join(' - ').trim() || parts[0].trim();
        return { trainNum, originCode, timestamp, label: desc } as TrainCandidate;
      })
      .filter((c): c is TrainCandidate => c !== null);
  } catch (error) {
    console.error('Error searching train candidates:', error);
    return [];
  }
}

export async function searchTrainByNumber(trainNumber: string): Promise<{ originCode: string; trainNum: string; timestamp: string } | null> {
  const candidates = await searchTrainCandidates(trainNumber);
  if (candidates.length === 0) return null;
  const { originCode, trainNum, timestamp } = candidates[0];
  return { originCode, trainNum, timestamp };
}


export async function getTrainDetails(originCode: string, trainNumber: string, timestamp: string): Promise<TrainDetails | null> {
  try {
    const response = await fetchWithRetry(buildUrl(`andamentoTreno/${originCode}/${trainNumber}/${timestamp}`));

    if (!response.ok) return null;

    const data = await readProxyJson<TrainDetails>(response);
    return data;
  } catch (error) {
    console.error('Error fetching train details:', error);
    return null;
  }
}

export function formatTimestamp(timestamp: number | null): string {
  if (!timestamp) return '--:--';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function getDelayColor(delay: number): string {
  if (delay <= 0) return 'text-success';
  if (delay <= 5) return 'text-delay-low';
  return 'text-delay-high';
}

export function getDelayBadgeVariant(delay: number): 'success' | 'warning' | 'destructive' {
  if (delay <= 0) return 'success';
  if (delay <= 5) return 'warning';
  return 'destructive';
}
