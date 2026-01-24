import { Train, Clock, ArrowRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Train as TrainType, getDelayBadgeVariant } from '@/lib/api';

interface TrainCardProps {
  train: TrainType;
  onClick: () => void;
}

export function TrainCard({ train, onClick }: TrainCardProps) {
  const isCancelled = train.provvedimento === 1;
  const hasDelay = train.ritardo > 0;
  const binario = train.binarioEffettivoPartenzaDescrizione || train.binarioProgrammatoPartenzaDescrizione;

  const getStatusIcon = () => {
    if (isCancelled) return <XCircle className="h-4 w-4 text-destructive" />;
    if (train.arrivato) return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (train.nonPartito) return <AlertTriangle className="h-4 w-4 text-warning" />;
    return null;
  };

  const getStatusText = () => {
    if (isCancelled) return 'Cancellato';
    if (train.arrivato) return 'Arrivato';
    if (train.nonPartito) return 'Non partito';
    return null;
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-[0.98]",
        isCancelled && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left section - Train info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Train className="h-5 w-5 text-primary shrink-0" />
            <span className="font-bold text-lg">
              {train.categoria} {train.numeroTreno}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <ArrowRight className="h-4 w-4 shrink-0" />
            <span className="truncate font-medium">{train.destinazione}</span>
          </div>
        </div>

        {/* Right section - Time and status */}
        <div className="text-right shrink-0">
          <div className="flex items-center gap-2 justify-end mb-1">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className={cn(
              "font-bold text-lg tabular-nums",
              isCancelled && "line-through"
            )}>
              {train.compOrarioPartenza}
            </span>
          </div>
          
          {/* Status badges */}
          <div className="flex flex-wrap gap-1 justify-end">
            {hasDelay && !isCancelled && (
              <Badge variant={getDelayBadgeVariant(train.ritardo)}>
                +{train.ritardo}'
              </Badge>
            )}
            
            {getStatusText() && (
              <Badge variant={isCancelled ? "destructive" : train.arrivato ? "success" : "warning"}>
                <span className="flex items-center gap-1">
                  {getStatusIcon()}
                  <span className="hidden sm:inline">{getStatusText()}</span>
                </span>
              </Badge>
            )}

            {binario && (
              <Badge variant="secondary">
                Bin. {binario}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
