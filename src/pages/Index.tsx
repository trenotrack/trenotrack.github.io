import { useState } from 'react';
import { StationSearch } from '@/components/StationSearch';
import { TrainSearch } from '@/components/TrainSearch';
import { DeparturesBoard } from '@/components/DeparturesBoard';
import { TrainDetailModal } from '@/components/TrainDetailModal';
import { Station, searchTrainByNumber } from '@/lib/api';
import { MapPin } from 'lucide-react';

// Favorite stations with preset codes
const FAVORITE_STATIONS: Station[] = [
  { name: 'Desio', code: 'S01320' },
  { name: 'Lissone-Muggiò', code: 'S01321' },
  { name: 'Monza', code: 'S01322' },
  { name: 'Milano P. Garibaldi', code: 'S01645' },
];

const Index = () => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [searchingTrain, setSearchingTrain] = useState<number | null>(null);
  const [trainSearchResult, setTrainSearchResult] = useState<{
    trainNum: string;
    originCode: string;
    timestamp: string;
  } | null>(null);
  const [isSearchingTrain, setIsSearchingTrain] = useState(false);
  const [trainSearchError, setTrainSearchError] = useState<string | null>(null);

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
  };

  const handleTrainSearch = async (trainNumber: string) => {
    setIsSearchingTrain(true);
    setTrainSearchError(null);
    
    const result = await searchTrainByNumber(trainNumber);
    
    if (result) {
      setSearchingTrain(parseInt(result.trainNum));
      setTrainSearchResult(result);
    } else {
      setTrainSearchError('Treno non trovato');
    }
    
    setIsSearchingTrain(false);
  };

  const handleCloseTrainDetail = () => {
    setSearchingTrain(null);
    setTrainSearchResult(null);
  };

  // Get current time
  const now = new Date();
  const currentTime = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const currentDate = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  // Show departures board if station is selected
  if (selectedStation) {
    return (
      <DeparturesBoard 
        station={selectedStation} 
        onBack={() => setSelectedStation(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content */}
      <main className="flex-1 container max-w-md mx-auto px-6 pt-12 pb-8 flex flex-col">
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
      </main>

      {/* Train detail modal */}
      {searchingTrain && trainSearchResult && (
        <TrainDetailModal
          trainNumber={searchingTrain}
          originCode={trainSearchResult.originCode}
          onClose={handleCloseTrainDetail}
        />
      )}
    </div>
  );
};

export default Index;
