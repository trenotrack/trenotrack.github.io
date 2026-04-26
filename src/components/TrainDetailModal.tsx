import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { 
  TrainDetails, 
  TrainStop, 
  formatTimestamp, 
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
  const nextStopRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let originCodeToUse = originCode;
      let trainNumToUse = trainNumber.toString();
      let timestampToUse: string | null = dataPartenza ? dataPartenza.toString() : null;

      // Skip the extra search call when we already have all params (clicked from board)
      if (!timestampToUse || !originCodeToUse) {
        const searchResult = await searchTrainByNumber(trainNumber.toString());
        if (!searchResult) {
          setError('Treno non trovato');
          setIsLoading(false);
          return;
        }
        originCodeToUse = searchResult.originCode;
        trainNumToUse = searchResult.trainNum;
        timestampToUse = searchResult.timestamp;
      }

      const trainDetails = await getTrainDetails(originCodeToUse, trainNumToUse, timestampToUse!);

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

  // Auto-scroll to next stop when details load
  useEffect(() => {
    if (details && nextStopRef.current && scrollContainerRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        nextStopRef.current?.scrollIntoView({
          behavior: 'instant',
          block: 'start'
        });
        // Offset to show the previous stop
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop -= 80;
        }
      }, 100);
    }
  }, [details]);

  const getStopStatus = (stop: TrainStop) => {
    if (stop.actualFermataType === 1) return 'passed';
    if (stop.tipoFermata === 'A') return 'destination';
    return 'pending';
  };

  const getBinario = (stop: TrainStop) => {
    return stop.binarioEffettivoPartenzaDescrizione || 
           stop.binarioProgrammatoPartenzaDescrizione ||
           stop.binarioEffettivoArrivoDescrizione ||
           stop.binarioProgrammatoArrivoDescrizione;
  };

  // Find the index of next stop (first non-passed stop)
  const getNextStopIndex = () => {
    if (!details) return -1;
    return details.fermate.findIndex(stop => stop.actualFermataType !== 1);
  };

  // Calculate estimated time by adding delay to theoretical time
  const calculateEstimatedTime = (theoreticalTimestamp: number | null, delay: number): string => {
    if (!theoreticalTimestamp || delay === 0) return '';
    const estimatedMs = theoreticalTimestamp + delay * 60000;
    return formatTimestamp(estimatedMs);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border">
        <div className="container max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Treno</p>
              <h1 className="text-2xl font-semibold tracking-tight">
                {details?.categoria || ''} {trainNumber}
              </h1>
            </div>
            <button 
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-6 w-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground mb-4">{error}</p>
            <button 
              onClick={fetchDetails}
              className="px-6 py-2.5 bg-foreground text-background rounded-full font-medium"
            >
              Riprova
            </button>
          </div>
        ) : details ? (
          <>
            {/* Fixed info section */}
            <div className="shrink-0 container max-w-md mx-auto px-6 pt-6">
              {/* Route */}
              <div className="mb-6">
                <p className="text-muted-foreground text-sm mb-1">Percorso</p>
                <p className="text-lg font-medium">
                  {details.origine} → {details.destinazione}
                </p>
              </div>

              {/* Delay status */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Ritardo</p>
                  <p className={cn(
                    "text-3xl font-semibold tabular-nums",
                    details.ritardo > 0 ? "text-destructive" : "text-foreground"
                  )}>
                    {details.ritardo > 0 ? `+${details.ritardo}'` : 'In orario'}
                  </p>
                </div>
                {details.stazioneUltimoRilevamento && (
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Ultimo rilevamento</p>
                    <p className="font-medium truncate">{details.stazioneUltimoRilevamento}</p>
                    {details.compOraUltimoRilevamento && (
                      <p className="text-sm text-muted-foreground">{details.compOraUltimoRilevamento}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-border" />
            </div>

            {/* Scrollable stops timeline */}
            <div 
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto container max-w-md mx-auto px-6 pt-6 pb-8"
            >
              <div className="space-y-0">
              {details.fermate.map((stop, index) => {
                const status = getStopStatus(stop);
                const isPassed = status === 'passed';
                const isLast = index === details.fermate.length - 1;
                const binario = getBinario(stop);
                const theoreticalTimestamp = stop.arrivo_teorico || stop.partenza_teorica;
                const theoreticalTime = formatTimestamp(theoreticalTimestamp);
                const realTime = formatTimestamp(stop.partenzaReale || stop.arrivoReale);
                const nextStopIndex = getNextStopIndex();
                const isNextStop = index === nextStopIndex;
                
                // Calculate estimated time for all non-passed stops with delay
                const estimatedTime = !isPassed && details.ritardo > 0
                  ? calculateEstimatedTime(theoreticalTimestamp, details.ritardo)
                  : null;

                return (
                  <div 
                    key={stop.id} 
                    className="flex gap-4"
                    ref={isNextStop ? nextStopRef : undefined}
                  >
                    {/* Timeline */}
                    <div className="flex flex-col items-center w-6">
                      <div className={cn(
                        "w-3 h-3 rounded-full shrink-0 z-10",
                        isPassed ? "bg-foreground" : "border-2 border-muted-foreground bg-background"
                      )} />
                      {!isLast && (
                        <div className={cn(
                          "w-px flex-1 -mt-0.5",
                          isPassed ? "bg-foreground" : "bg-border"
                        )} />
                      )}
                    </div>

                    {/* Stop info */}
                    <div className={cn(
                      "flex-1 pb-6 min-w-0",
                      isPassed && "opacity-50"
                    )}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{stop.stazione}</p>
                          {binario && (
                            <p className="text-sm text-muted-foreground">Bin. {binario}</p>
                          )}
                        </div>
                        
                        <div className="text-right shrink-0">
                          {realTime && realTime !== '--:--' ? (
                            // Train has passed - show real time
                            <>
                              {details.ritardo > 0 && (
                                <p className="text-sm text-muted-foreground line-through">{theoreticalTime}</p>
                              )}
                              <p className="font-semibold tabular-nums">{realTime}</p>
                            </>
                          ) : estimatedTime ? (
                            // Train hasn't arrived but has delay - show estimated
                            <>
                              <p className="text-sm text-muted-foreground line-through">{theoreticalTime}</p>
                              <p className="font-semibold tabular-nums">~{estimatedTime}</p>
                            </>
                          ) : (
                            // No delay or no data - show theoretical only
                            <p className="font-semibold tabular-nums">{theoreticalTime}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
