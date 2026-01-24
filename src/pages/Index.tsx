import { useState } from 'react';
import { StationSearch } from '@/components/StationSearch';
import { TrainSearch } from '@/components/TrainSearch';
import { DeparturesBoard } from '@/components/DeparturesBoard';
import { TrainDetailModal } from '@/components/TrainDetailModal';
import { Station, searchTrainByNumber } from '@/lib/api';
import { cn } from '@/lib/utils';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'station' | 'train'>('station');
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
        <div className="mb-8">
          <p className="text-sm text-muted-foreground capitalize">{currentDate}</p>
          <h1 className="text-7xl font-light tracking-tighter tabular-nums mt-2">
            {currentTime}
          </h1>
        </div>

        {/* Tab Toggle - Pill style */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-muted rounded-full p-1">
            <button
              onClick={() => setActiveTab('station')}
              className={cn(
                "px-6 py-2.5 text-sm font-medium rounded-full transition-all",
                activeTab === 'station' 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Stazione
            </button>
            <button
              onClick={() => setActiveTab('train')}
              className={cn(
                "px-6 py-2.5 text-sm font-medium rounded-full transition-all",
                activeTab === 'train' 
                  ? "bg-foreground text-background" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Treno
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'station' ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold mb-1">Cerca stazione</h2>
                <p className="text-sm text-muted-foreground">
                  Visualizza le partenze in tempo reale
                </p>
              </div>
              <StationSearch 
                onStationSelect={handleStationSelect}
                placeholder="Milano, Roma, Napoli..."
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
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
          )}
        </div>

        {/* Bottom info */}
        <div className="mt-auto pt-12">
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Stazione</p>
              <p className="font-medium">Cerca per nome</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Treno</p>
              <p className="font-medium">Cerca per numero</p>
            </div>
          </div>
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
