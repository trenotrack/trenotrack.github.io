import { CheckCircle2, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Train as TrainType } from '@/lib/api';

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

  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full text-left py-5 border-b border-border transition-all active:scale-[0.99]",
        isArrived && "opacity-40",
        isCancelled && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left section - Destination focused */}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "text-xl font-semibold tracking-tight truncate mb-1",
            isCancelled && "line-through"
          )}>
            {train.destinazione}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{train.categoria} {train.numeroTreno}</span>
            {binario && (
              <>
                <span>•</span>
                <span>Bin. {binario}</span>
              </>
            )}
          </div>
        </div>

        {/* Right section - Time */}
        <div className="text-right shrink-0">
          {/* Time display */}
          {hasDelay && !isCancelled ? (
            <div className="space-y-0.5">
              <p className="text-sm text-muted-foreground line-through tabular-nums">
                {train.compOrarioPartenza}
              </p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {estimatedTime}
              </p>
              <p className="text-xs font-medium text-destructive">+{train.ritardo} min</p>
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
            <div className="flex items-center gap-1.5 justify-end mt-2 text-xs text-muted-foreground">
              {isCancelled && (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Cancellato</span>
                </>
              )}
              {isArrived && !isCancelled && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Arrivato</span>
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
    </button>
  );
}
