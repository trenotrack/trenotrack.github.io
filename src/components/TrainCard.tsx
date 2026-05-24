import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Train as TrainType } from '@/lib/api';
import { getLineBadge, getDelayColorClass } from '@/lib/trainLines';
import { LineBadge } from '@/components/LineBadge';

interface TrainCardProps {
  train: TrainType;
  onClick: () => void;
}

// Helper to add minutes to time string "HH:MM"
function addMinutesToTime(timeStr: string, minutes: number): string {
  if (!timeStr || minutes === 0) return timeStr;
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

export function TrainCard({ train, onClick }: TrainCardProps) {
  const isCancelled = train.provvedimento === 1;
  const hasDelay = train.ritardo > 0;
  const isArrived = train.arrivato;
  const binario = train.binarioEffettivoPartenzaDescrizione || train.binarioProgrammatoPartenzaDescrizione;
  const estimatedTime = hasDelay ? addMinutesToTime(train.compOrarioPartenza, train.ritardo) : null;
  const lineBadge = getLineBadge(train.numeroTreno, train.categoria, train.categoriaDescrizione);
  const delayColor = getDelayColorClass(train.ritardo);
  // Show categoria sigla; fall back to first word of categoriaDescrizione (e.g. "FR" for "Frecciarossa")
  const categoriaSigla = train.categoria?.trim()
    || train.categoriaDescrizione?.trim().split(/\s+/)[0]
    || '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "relative w-full text-left py-5 border-b border-border transition-all active:scale-[0.99] cursor-pointer",
        isArrived && "opacity-40",
        isCancelled && "opacity-40"
      )}
    >
      {/* Tracking bell — top right */}
      {!isArrived && !isCancelled && (
        <div className="absolute top-3 right-0">
          <TrackingBell
            payload={{
              trainNumber: train.numeroTreno,
              originCode: train.codOrigine,
              dataPartenza: train.dataPartenzaTreno,
              lineLabel: lineBadge?.label ?? null,
              destination: train.destinazione,
            }}
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        {/* Left section - Destination focused */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 min-w-0">
            {lineBadge && <LineBadge badge={lineBadge} />}
            <h3 className={cn(
              "text-xl font-semibold tracking-tight truncate",
              isCancelled && "line-through"
            )}>
              {train.destinazione}
            </h3>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{categoriaSigla} {train.numeroTreno}</span>
            {binario && (
              <>
                <span>•</span>
                <span>Bin. {binario}</span>
              </>
            )}
          </div>
        </div>

        {/* Right section - Time */}
        <div className={cn("text-right shrink-0", !isArrived && !isCancelled && "mt-8")}>
          {/* Time display */}
          {hasDelay && !isCancelled ? (
            <div className="space-y-0.5">
              <p className="text-sm text-muted-foreground line-through tabular-nums">
                {train.compOrarioPartenza}
              </p>
              <p className={cn("text-2xl font-semibold tabular-nums tracking-tight", delayColor)}>
                {estimatedTime}
              </p>
              <p className={cn("text-xs font-medium", delayColor)}>+{train.ritardo} min</p>
            </div>
          ) : (
            <p className={cn(
              "text-2xl font-semibold tabular-nums tracking-tight",
              isCancelled && "line-through text-muted-foreground"
            )}>
              {train.compOrarioPartenza}
            </p>
          )}
          
          {/* Status */}
          {(isCancelled || isArrived || train.nonPartito) && (
            <div className={cn(
              "flex items-center gap-1.5 justify-end mt-2 text-xs",
              isArrived && !isCancelled ? delayColor : "text-muted-foreground"
            )}>
              {isCancelled && (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Cancellato</span>
                </>
              )}
              {isArrived && !isCancelled && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Arrivato{train.ritardo > 0 ? ` +${train.ritardo}'` : ''}</span>
                </>
              )}
              {train.nonPartito && !isCancelled && !isArrived && (
                <>
                  <Circle className="h-3.5 w-3.5" />
                  <span>Non partito</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
