// API utilities for ViaggiaTreno

const BASE_URL = 'https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno';

// Using whateverorigin.org as CORS proxy (returns JSON envelope { contents })
const corsProxy = 'https://whateverorigin.org/get?url=';

function buildUrl(path: string): string {
  return `${corsProxy}${encodeURIComponent(`${BASE_URL}/${path}`)}`;
}

// whateverorigin returns { contents: "<actual body>" }, so unwrap it
async function readProxyText(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.contents === 'string') return parsed.contents;
  } catch {
    // Not the envelope - return as-is
  }
  return raw;
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
  fermate: TrainStop[];
  nonPartito: boolean;
  arrivato: boolean;
}

export async function searchStations(query: string): Promise<Station[]> {
  if (query.length < 2) return [];

  try {
    const response = await fetchWithRetry(buildUrl(`autocompletaStazione/${encodeURIComponent(query)}`));

    if (!response.ok) return [];

    const text = await response.text();
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

export async function getStationDepartures(stationCode: string): Promise<Train[]> {
  try {
    const now = new Date();
    const dateStr = now.toUTCString();

    const response = await fetchWithRetry(buildUrl(`partenze/${stationCode}/${dateStr}`));

    if (!response.ok) return [];

    const data = await response.json();
    return data || [];
  } catch (error) {
    console.error('Error fetching departures:', error);
    return [];
  }
}

export async function searchTrainByNumber(trainNumber: string): Promise<{ originCode: string; trainNum: string; timestamp: string } | null> {
  try {
    const response = await fetchWithRetry(buildUrl(`cercaNumeroTrenoTrenoAutocomplete/${trainNumber}`));

    if (!response.ok) return null;

    const text = await response.text();
    if (!text.trim()) return null;

    // Format: "25031 - COMO S.GIOVANNI - 24/01/26|25031-S01307-1769209200000"
    const firstLine = text.split('\n')[0];
    if (!firstLine) return null;

    const parts = firstLine.split('|');
    if (parts.length < 2) return null;

    const [trainNum, originCode, timestamp] = parts[1].split('-');
    return { trainNum, originCode, timestamp };
  } catch (error) {
    console.error('Error searching train:', error);
    return null;
  }
}

export async function getTrainDetails(originCode: string, trainNumber: string, timestamp: string): Promise<TrainDetails | null> {
  try {
    const response = await fetchWithRetry(buildUrl(`andamentoTreno/${originCode}/${trainNumber}/${timestamp}`));

    if (!response.ok) return null;

    const data = await response.json();
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
