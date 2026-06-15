import { useEffect, useState } from 'react';
import { StationSearch } from '@/components/StationSearch';
import { TrainSearch } from '@/components/TrainSearch';
import { DeparturesBoard } from '@/components/DeparturesBoard';
import { TrainDetailModal } from '@/components/TrainDetailModal';
import { TrackedTrainsList } from '@/components/TrackedTrainsList';
import { Station, Train, searchTrainCandidates, TrainCandidate } from '@/lib/api';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Favorite stations with preset codes
const FAVORITE_STATIONS: Station[] = [
  { name: 'Desio', code: 'S01320' },
  { name: 'Lissone-Muggiò', code: 'S01321' },
  { name: 'Monza', code: 'S01322' },
  { name: 'Milano P. Garibaldi', code: 'S01645' },
];

interface SelectedTrain {
  trainNumber: number;
  originCode: string;
  dataPartenza?: number;
  key: string;
}

const Index = () => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [selectedTrain, setSelectedTrain] = useState<SelectedTrain | null>(null);
  const [isSearchingTrain, setIsSearchingTrain] = useState(false);
  const [trainSearchError, setTrainSearchError] = useState<string | null>(null);
  const [trainSearchKey, setTrainSearchKey] = useState(0);

  const [candidates, setCandidates] = useState<TrainCandidate[] | null>(null);

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    // Clear any train opened from a previous station context
    setSelectedTrain(null);
  };

  const handleCloseStation = () => {
    setSelectedStation(null);
    // Closing the station also closes any train opened from it
    setSelectedTrain(null);
  };

  const handleTrainFromBoard = (train: Train) => {
    setSelectedTrain({
      trainNumber: train.numeroTreno,
      originCode: train.codOrigine,
      dataPartenza: train.dataPartenzaTreno,
      key: `${train.numeroTreno}-${train.dataPartenzaTreno}`,
    });
  };

  const openCandidate = (c: TrainCandidate, keyPrefix: string) => {
    // Searching a train from the home replaces the intermediate station view
    setSelectedStation(null);
    setCandidates(null);
    setSelectedTrain({
      trainNumber: parseInt(c.trainNum),
      originCode: c.originCode,
      dataPartenza: parseInt(c.timestamp),
      key: `${keyPrefix}-${c.trainNum}-${c.timestamp}`,
    });
  };

  const handleTrainSearch = async (trainNumber: string) => {
    setIsSearchingTrain(true);
    setTrainSearchError(null);
    setCandidates(null);

    const results = await searchTrainCandidates(trainNumber);

    if (results.length === 0) {
      setTrainSearchError('Treno non trovato');
    } else if (results.length === 1) {
      openCandidate(results[0], 'search');
    } else {
      // Multiple trains share this number: ask the user which one
      setCandidates(results);
    }

    setIsSearchingTrain(false);
  };

  const handleCloseTrainDetail = () => {
    setSelectedTrain(null);
    setTrainSearchError(null);
    setTrainSearchKey((k) => k + 1);
  };


  // Handle ?train=N&data=TS&origin=X (from notification click) and SW messages
  useEffect(() => {
    const openFromParams = (search: string) => {
      const params = new URLSearchParams(search);
      const train = params.get('train');
      const data = params.get('data');
      const origin = params.get('origin');
      if (train && data && origin) {
        setSelectedTrain({
          trainNumber: parseInt(train),
          originCode: origin,
          dataPartenza: parseInt(data),
          key: `notif-${train}-${data}-${Date.now()}`,
        });
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    };
    openFromParams(window.location.search);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'open-train' && typeof e.data.path === 'string') {
        const qIdx = e.data.path.indexOf('?');
        if (qIdx !== -1) openFromParams(e.data.path.slice(qIdx));
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
  }, []);

  const handleTrackedSelect = (t: { trainNumber: number; originCode: string; dataPartenza: number }) => {
    setSelectedTrain({
      trainNumber: t.trainNumber,
      originCode: t.originCode,
      dataPartenza: t.dataPartenza,
      key: `tracked-${t.trainNumber}-${t.dataPartenza}`,
    });
  };

  // Get current time
  const now = new Date();
  const currentTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const currentDate = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  const homeColumn = (
    <div className="min-h-screen bg-background flex flex-col lg:min-h-0 lg:h-full">
      <main className="flex-1 container max-w-md mx-auto px-6 pt-12 pb-8 flex flex-col w-full">
        {/* Header with time */}
        <div className="mb-10">
          <p className="text-sm text-muted-foreground capitalize">{currentDate}</p>
          <h1 className="text-7xl font-light tracking-tighter tabular-nums mt-2">
            {currentTime}
          </h1>
        </div>

        {/* Station Search Section */}
        <div className="mb-10">
          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-1">Cerca stazione</h2>
            <p className="text-sm text-muted-foreground">
              Visualizza le partenze in tempo reale
            </p>
          </div>

          {/* Favorite stations */}
          <div className="flex flex-wrap gap-2 mb-4">
            {FAVORITE_STATIONS.map((station) => (
              <button
                key={station.code}
                onClick={() => handleStationSelect(station)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm font-medium transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                {station.name}
              </button>
            ))}
          </div>

          <StationSearch
            onStationSelect={handleStationSelect}
            placeholder="Oppure cerca..."
          />
        </div>

        {/* Train Search Section */}
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-1">Cerca treno</h2>
            <p className="text-sm text-muted-foreground">
              Inserisci il numero del treno
            </p>
          </div>

          <TrainSearch
            key={trainSearchKey}
            onSearch={handleTrainSearch}
            isLoading={isSearchingTrain}
          />

          {isSearchingTrain && (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
          )}

          {trainSearchError && (
            <p className="text-center text-muted-foreground py-4">
              {trainSearchError}
            </p>
          )}
        </div>

        {/* Tracked trains */}
        <div className="mt-10">
          <TrackedTrainsList onSelect={handleTrackedSelect} />
        </div>
      </main>
    </div>
  );

  return (
    <div className="lg:h-screen lg:flex lg:flex-row lg:overflow-hidden">
      {/* Home column */}
      <div
        className={cn(
          'lg:flex-1 lg:min-w-0 lg:h-full lg:overflow-y-auto',
          selectedStation && 'hidden lg:block'
        )}
      >
        {homeColumn}
      </div>

      {/* Station column */}
      {selectedStation && (
        <div className="lg:flex-1 lg:min-w-0 lg:h-full lg:overflow-y-auto lg:border-l lg:border-border">
          <DeparturesBoard
            station={selectedStation}
            onBack={handleCloseStation}
            onTrainSelect={handleTrainFromBoard}
            selectedTrainKey={selectedTrain?.key ?? null}
          />
        </div>
      )}

      {/* Train column / modal */}
      {selectedTrain && (
        <div className="lg:flex-1 lg:min-w-0 lg:h-full lg:overflow-y-auto lg:border-l lg:border-border">
          <TrainDetailModal
            key={selectedTrain.key}
            trainNumber={selectedTrain.trainNumber}
            originCode={selectedTrain.originCode}
            dataPartenza={selectedTrain.dataPartenza}
            onClose={handleCloseTrainDetail}
          />
        </div>
      )}

      {/* Multiple trains share this number: let the user choose */}
      <Dialog open={!!candidates} onOpenChange={(open) => !open && setCandidates(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Quale treno?</DialogTitle>
            <DialogDescription>
              Più treni hanno questo numero. Scegli quello da visualizzare.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {candidates?.map((c) => (
              <button
                key={`${c.originCode}-${c.timestamp}`}
                onClick={() => openCandidate(c, 'pick')}
                className="w-full text-left px-4 py-3 bg-muted hover:bg-muted/80 rounded-xl transition-colors"
              >
                <p className="font-medium">Treno {c.trainNum}</p>
                <p className="text-sm text-muted-foreground">{c.label}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default Index;
