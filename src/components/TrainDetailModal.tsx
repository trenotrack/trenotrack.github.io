import { useEffect, useState } from 'react';
import { X, Train, MapPin, Clock, ArrowDown, CheckCircle2, Circle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrainDetails, 
  TrainStop, 
  formatTimestamp, 
  getDelayBadgeVariant,
  searchTrainByNumber,
  getTrainDetails 
} from '@/lib/api';
import { cn } from '@/lib/utils';

interface TrainDetailModalProps {
  trainNumber: number;
  originCode: string;
  dataPartenza?: number;
  onClose: () => void;
}

export function TrainDetailModal({ trainNumber, originCode, dataPartenza, onClose }: TrainDetailModalProps) {
  const [details, setDetails] = useState<TrainDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First search for train to get proper parameters
      const searchResult = await searchTrainByNumber(trainNumber.toString());
      
      if (!searchResult) {
        setError('Treno non trovato');
        setIsLoading(false);
        return;
      }

      const trainDetails = await getTrainDetails(
        searchResult.originCode,
        searchResult.trainNum,
        searchResult.timestamp
      );

      if (trainDetails) {
        setDetails(trainDetails);
      } else {
        setError('Impossibile caricare i dettagli');
      }
    } catch (e) {
      setError('Errore di connessione');
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDetails();
  }, [trainNumber]);

  const getStopStatus = (stop: TrainStop) => {
    if (stop.actualFermataType === 1) return 'passed';
    if (stop.tipoFermata === 'A') return 'destination';
    return 'pending';
  };

  const renderStopIcon = (stop: TrainStop, index: number, total: number) => {
    const status = getStopStatus(stop);
    const isFirst = index === 0;
    const isLast = index === total - 1;

    return (
      <div className="flex flex-col items-center">
        {!isFirst && (
          <div className={cn(
            "w-0.5 h-4 -mb-1",
            status === 'passed' ? "bg-success" : "bg-border"
          )} />
        )}
        <div className={cn(
          "rounded-full p-1 z-10",
          status === 'passed' ? "bg-success text-success-foreground" : 
          status === 'destination' ? "bg-primary text-primary-foreground" : 
          "bg-muted text-muted-foreground"
        )}>
          {status === 'passed' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </div>
        {!isLast && (
          <div className={cn(
            "w-0.5 h-4 -mt-1",
            status === 'passed' ? "bg-success" : "bg-border"
          )} />
        )}
      </div>
    );
  };

  const getBinario = (stop: TrainStop) => {
    return stop.binarioEffettivoPartenzaDescrizione || 
           stop.binarioProgrammatoPartenzaDescrizione ||
           stop.binarioEffettivoArrivoDescrizione ||
           stop.binarioProgrammatoArrivoDescrizione;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-x-0 bottom-0 top-0 md:inset-4 md:top-auto md:bottom-auto md:max-w-lg md:mx-auto">
        <div className="h-full md:h-auto md:max-h-[85vh] bg-card rounded-t-2xl md:rounded-2xl shadow-xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Train className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">
                  {details?.categoria || 'REG'} {trainNumber}
                </h2>
                {details && (
                  <p className="text-sm text-muted-foreground">
                    {details.origine} → {details.destinazione}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Caricamento...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium mb-4">{error}</p>
                <Button onClick={fetchDetails}>Riprova</Button>
              </div>
            ) : details ? (
              <>
                {/* Status summary */}
                <div className="bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Ritardo attuale</span>
                    <Badge variant={getDelayBadgeVariant(details.ritardo)}>
                      {details.ritardo > 0 ? `+${details.ritardo} min` : 'In orario'}
                    </Badge>
                  </div>
                  {details.stazioneUltimoRilevamento && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>
                        Ultimo rilevamento: <strong>{details.stazioneUltimoRilevamento}</strong>
                        {details.compOraUltimoRilevamento && (
                          <span className="text-muted-foreground"> alle {details.compOraUltimoRilevamento}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stops timeline */}
                <div className="space-y-0">
                  {details.fermate.map((stop, index) => (
                    <div key={stop.id} className="flex gap-3">
                      {renderStopIcon(stop, index, details.fermate.length)}
                      
                      <div className={cn(
                        "flex-1 pb-4",
                        index !== details.fermate.length - 1 && "border-b border-border"
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className={cn(
                              "font-medium truncate",
                              getStopStatus(stop) === 'passed' && "text-muted-foreground"
                            )}>
                              {stop.stazione}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {getBinario(stop) && (
                                <Badge variant="outline" className="text-xs">
                                  Bin. {getBinario(stop)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0">
                            {/* Theoretical time */}
                            <div className="text-sm text-muted-foreground">
                              {formatTimestamp(stop.arrivo_teorico || stop.partenza_teorica)}
                            </div>
                            
                            {/* Real/estimated time */}
                            {stop.partenzaReale || stop.arrivoReale ? (
                              <div className={cn(
                                "font-bold",
                                stop.ritardoPartenza > 0 || stop.ritardoArrivo > 0 
                                  ? "text-delay-high" 
                                  : "text-success"
                              )}>
                                {formatTimestamp(stop.partenzaReale || stop.arrivoReale)}
                              </div>
                            ) : details.ritardo > 0 ? (
                              <div className="text-sm text-delay-low">
                                ~{formatTimestamp(
                                  (stop.arrivo_teorico || stop.partenza_teorica || 0) + details.ritardo * 60000
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
