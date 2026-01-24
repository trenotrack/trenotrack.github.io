import { Clock, CircleDot, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Train as TrainType, getDelayBadgeVariant } from '@/lib/api';

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

  const getStatusIcon = () => {
    if (isCancelled) return <XCircle className="h-4 w-4" />;
    if (isArrived) return <CheckCircle2 className="h-4 w-4" />;
    if (train.nonPartito) return <CircleDot className="h-4 w-4" />;
    return null;
  };

  const getStatusText = () => {
    if (isCancelled) return 'Cancellato';
    if (isArrived) return 'Arrivato';
    if (train.nonPartito) return 'Non partito';
    return null;
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group py-4 px-1 cursor-pointer transition-all border-b border-border/50 hover:bg-muted/30 active:scale-[0.99]",
        isArrived && "opacity-40",
        isCancelled && "opacity-50"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left section - Destination focused */}
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className={cn(
            "font-semibold text-lg tracking-tight truncate",
            isCancelled && "line-through text-muted-foreground"
          )}>
            {train.destinazione}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="font-medium">{train.categoria} {train.numeroTreno}</span>
            {binario && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Bin. {binario}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right section - Time and status */}
        <div className="text-right shrink-0 space-y-1">
          {/* Time display */}
          <div className="flex items-center gap-2 justify-end">
            {hasDelay && !isCancelled ? (
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground line-through tabular-nums">
                  {train.compOrarioPartenza}
                </span>
                <span className="font-bold text-xl tabular-nums text-foreground">
                  {estimatedTime}
                </span>
              </div>
            ) : (
              <span className={cn(
                "font-bold text-xl tabular-nums",
                isCancelled && "line-through text-muted-foreground"
              )}>
                {train.compOrarioPartenza}
              </span>
            )}
          </div>
          
          {/* Status badges */}
          <div className="flex flex-wrap gap-1.5 justify-end">
            {hasDelay && !isCancelled && (
              <Badge variant={getDelayBadgeVariant(train.ritardo)} className="font-semibold">
                +{train.ritardo}'
              </Badge>
            )}
            
            {getStatusText() && (
              <Badge 
                variant={isCancelled ? "destructive" : isArrived ? "secondary" : "outline"}
                className="gap-1"
              >
                {getStatusIcon()}
                {getStatusText()}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}