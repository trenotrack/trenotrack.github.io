import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { TrainCard } from '@/components/TrainCard';
import { TrainDetailModal } from '@/components/TrainDetailModal';
import { Station, Train, getStationDepartures } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DeparturesBoardProps {
  station: Station;
  onBack: () => void;
}

export function DeparturesBoard({ station, onBack }: DeparturesBoardProps) {
  const [trains, setTrains] = useState<Train[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrain, setSelectedTrain] = useState<Train | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showAllArrived, setShowAllArrived] = useState(false);

  const fetchDepartures = async () => {
    setIsLoading(true);
    const data = await getStationDepartures(station.code);
    // Sort by departure time
    data.sort((a, b) => {
      const timeA = a.orarioPartenza || 0;
      const timeB = b.orarioPartenza || 0;
      return timeA - timeB;
    });
    setTrains(data);
    setLastUpdate(new Date());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDepartures();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDepartures, 30000);
    return () => clearInterval(interval);
  }, [station.code]);

  // Separate arrived and pending trains
  const { arrivedTrains, pendingTrains } = useMemo(() => {
    const arrived: Train[] = [];
    const pending: Train[] = [];
    
    trains.forEach(train => {
      if (train.arrivato || train.inStazione) {
        arrived.push(train);
      } else {
        pending.push(train);
      }
    });
    
    return { arrivedTrains: arrived, pendingTrains: pending };
  }, [trains]);

  const visibleArrivedTrains = showAllArrived ? arrivedTrains : arrivedTrains.slice(0, 1);
  const hasMoreArrived = arrivedTrains.length > 1;

  const currentTime = lastUpdate?.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-md mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            
            <button
              onClick={fetchDepartures}
              disabled={isLoading}
              className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
            >
              <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      {/* Station info */}
      <div className="container max-w-md mx-auto px-6 pt-6 pb-4">
        <p className="text-sm text-muted-foreground">Partenze da</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1 mb-2">
          {station.name}
        </h1>
        {lastUpdate && (
          <p className="text-sm text-muted-foreground">
            Aggiornato alle {currentTime}
          </p>
        )}
      </div>

      {/* Content */}
      <main className="flex-1 container max-w-md mx-auto px-6">
        {isLoading && trains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-6 w-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        ) : trains.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Nessun treno in partenza</p>
          </div>
        ) : (
          <div>
            {/* Arrived trains section - collapsed by default */}
            {arrivedTrains.length > 0 && (
              <div className="mb-4">
                {visibleArrivedTrains.map((train) => (
                  <TrainCard
                    key={`${train.numeroTreno}-${train.dataPartenzaTreno}`}
                    train={train}
                    onClick={() => setSelectedTrain(train)}
                  />
                ))}
                
                {/* Show more/less toggle */}
                {hasMoreArrived && (
                  <button
                    onClick={() => setShowAllArrived(!showAllArrived)}
                    className="w-full py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-b border-border"
                  >
                    {showAllArrived ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>Nascondi treni già partiti ({arrivedTrains.length - 1})</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>Mostra altri {arrivedTrains.length - 1} treni partiti</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Pending trains */}
            {pendingTrains.map((train) => (
              <TrainCard
                key={`${train.numeroTreno}-${train.dataPartenzaTreno}`}
                train={train}
                onClick={() => setSelectedTrain(train)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bottom spacing */}
      <div className="h-8" />

      {/* Train detail modal */}
      {selectedTrain && (
        <TrainDetailModal
          trainNumber={selectedTrain.numeroTreno}
          originCode={selectedTrain.codOrigine}
          dataPartenza={selectedTrain.dataPartenzaTreno}
          onClose={() => setSelectedTrain(null)}
        />
      )}
    </div>
  );
}
