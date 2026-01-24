import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onBack}
              className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 shrink-0" />
                <h1 className="font-bold text-lg truncate">{station.name}</h1>
              </div>
              <p className="text-sm text-primary-foreground/80">Partenze</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchDepartures}
              disabled={isLoading}
              className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0"
            >
              <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-2xl mx-auto px-4 py-4">
        {/* Last update */}
        {lastUpdate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Clock className="h-4 w-4" />
            <span>
              Aggiornato alle {lastUpdate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Train list */}
        {isLoading && trains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground">Caricamento partenze...</p>
          </div>
        ) : trains.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nessun treno in partenza</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trains.map((train) => (
              <TrainCard
                key={`${train.numeroTreno}-${train.dataPartenzaTreno}`}
                train={train}
                onClick={() => setSelectedTrain(train)}
              />
            ))}
          </div>
        )}
      </main>

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
