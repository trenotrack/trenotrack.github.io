import { useCallback, useEffect, useState } from 'react';
import { BellRing, ChevronRight } from 'lucide-react';
import { getTrainDetails, TrainDetails } from '@/lib/api';
import { getDeviceId, trainKey } from '@/lib/tracking';
import { useTracking } from '@/contexts/TrackingContext';
import { getLineBadge, getDelayColorClass } from '@/lib/trainLines';
import { LineBadge } from '@/components/LineBadge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface TrackedTrainRow {
  train_number: number;
  data_partenza: number;
  origin_code: string;
  line_label: string | null;
  destination: string | null;
}

interface SummarizedTrain extends TrackedTrainRow {
  details: TrainDetails | null;
  nextStop: { name: string; scheduled: string; estimated: string | null } | null;
  arrived: boolean;
  soppresso: boolean;
}

function fmtTime(ts: number | null): string {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarize(row: TrackedTrainRow, d: TrainDetails | null): SummarizedTrain {
  if (!d) {
    return { ...row, details: null, nextStop: null, arrived: false, soppresso: false };
  }
  const soppresso = d.tipoTreno === 'ST';
  const nextIdx = d.fermate.findIndex((s) => s.actualFermataType !== 1);
  const arrived = d.arrivato || nextIdx === -1;
  let nextStop = null;
  if (!arrived && nextIdx !== -1) {
    const next = d.fermate[nextIdx];
    const sched = next.arrivo_teorico ?? next.partenza_teorica;
    nextStop = {
      name: next.stazione,
      scheduled: fmtTime(sched),
      estimated: d.ritardo > 0 && sched ? fmtTime(sched + d.ritardo * 60_000) : null,
    };
  }
  return { ...row, details: d, nextStop, arrived, soppresso };
}

interface TrackedTrainsListProps {
  onSelect: (t: { trainNumber: number; originCode: string; dataPartenza: number }) => void;
}

export function TrackedTrainsList({ onSelect }: TrackedTrainsListProps) {
  const { trackedKeys } = useTracking();
  const [rows, setRows] = useState<SummarizedTrain[]>([]);

  const load = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-tracked-trains?device_id=${encodeURIComponent(getDeviceId())}`;
      const r = await fetch(url, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const j = await r.json();
      const tracked: TrackedTrainRow[] = j.trains ?? [];
      const detailed = await Promise.all(
        tracked.map(async (t) => {
          const d = await getTrainDetails(
            t.origin_code,
            String(t.train_number),
            String(t.data_partenza),
          ).catch(() => null);
          return summarize(t, d);
        }),
      );
      setRows(detailed);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load, trackedKeys.size]);

  if (rows.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center gap-2">
        <BellRing className="h-4 w-4 text-primary" />
        <h2 className="text-2xl font-semibold">Tracciati</h2>
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const badge = row.details
            ? getLineBadge(row.train_number, row.details.categoria, undefined)
            : null;
          const dest = row.destination || row.details?.destinazione || '—';
          const delay = row.details?.ritardo ?? 0;
          const delayColor = getDelayColorClass(delay);
          return (
            <button
              key={trainKey(row.train_number, row.data_partenza)}
              type="button"
              onClick={() =>
                onSelect({
                  trainNumber: row.train_number,
                  originCode: row.origin_code,
                  dataPartenza: row.data_partenza,
                })
              }
              className="w-full text-left rounded-2xl border border-border bg-card px-4 py-3 hover:bg-muted/50 active:scale-[0.99] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {badge && <LineBadge badge={badge} />}
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {row.train_number}
                    </span>
                    <span className="text-sm text-muted-foreground">→</span>
                    <span className="font-semibold truncate">{dest}</span>
                  </div>
                  <div className="mt-1.5 text-sm text-muted-foreground truncate">
                    {row.soppresso ? (
                      <span className="text-destructive">Soppresso</span>
                    ) : row.arrived ? (
                      <span>Arrivato</span>
                    ) : row.nextStop ? (
                      <>
                        <span>Prossima: </span>
                        <span className="text-foreground">{row.nextStop.name}</span>
                      </>
                    ) : row.details ? (
                      <span>In viaggio</span>
                    ) : (
                      <span>Caricamento…</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-start gap-1">
                  <div>
                    {row.nextStop && !row.arrived && !row.soppresso ? (
                      <>
                        {row.nextStop.estimated ? (
                          <>
                            <p className="text-xs text-muted-foreground line-through tabular-nums">
                              {row.nextStop.scheduled}
                            </p>
                            <p className={cn('font-semibold tabular-nums', delayColor)}>
                              {row.nextStop.estimated}
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold tabular-nums">
                            {row.nextStop.scheduled}
                          </p>
                        )}
                        {delay > 0 && (
                          <p className={cn('text-xs', delayColor)}>+{delay}'</p>
                        )}
                      </>
                    ) : (
                      delay > 0 && (
                        <p className={cn('text-sm font-semibold', delayColor)}>
                          +{delay}'
                        </p>
                      )
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
