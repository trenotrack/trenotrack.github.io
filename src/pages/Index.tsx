import { useState } from 'react';
import { Train, MapPin, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StationSearch } from '@/components/StationSearch';
import { TrainSearch } from '@/components/TrainSearch';
import { DeparturesBoard } from '@/components/DeparturesBoard';
import { TrainDetailModal } from '@/components/TrainDetailModal';
import { Station, searchTrainByNumber } from '@/lib/api';

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
      setTrainSearchError('Treno non trovato. Verifica il numero e riprova.');
    }
    
    setIsSearchingTrain(false);
  };

  const handleCloseTrainDetail = () => {
    setSearchingTrain(null);
    setTrainSearchResult(null);
  };

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground">
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary-foreground/10 rounded-lg">
              <Train className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">TrenoTracker</h1>
          </div>
          <p className="text-primary-foreground/80">
            Segui i tuoi treni in tempo reale
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-2xl mx-auto px-4 -mt-4">
        <div className="bg-card rounded-2xl shadow-lg p-4">
          <Tabs defaultValue="station" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="station" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Cerca </span>Stazione
              </TabsTrigger>
              <TabsTrigger value="train" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Cerca </span>Treno
              </TabsTrigger>
            </TabsList>

            <TabsContent value="station" className="mt-0">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Inserisci il nome della stazione per vedere il tabellone delle partenze
                </p>
                <StationSearch 
                  onStationSelect={handleStationSelect}
                  placeholder="Es: Milano Centrale, Roma..."
                />
              </div>
            </TabsContent>

            <TabsContent value="train" className="mt-0">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Inserisci il numero del treno per vedere il suo percorso in tempo reale
                </p>
                <TrainSearch 
                  onSearch={handleTrainSearch}
                  isLoading={isSearchingTrain}
                />
                
                {isSearchingTrain && (
                  <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Ricerca in corso...</span>
                  </div>
                )}
                
                {trainSearchError && (
                  <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg text-destructive">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{trainSearchError}</span>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Info section */}
        <div className="mt-8 space-y-4">
          <h2 className="font-semibold text-lg">Come funziona</h2>
          <div className="grid gap-4">
            <div className="flex items-start gap-3 p-4 bg-card rounded-lg">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Cerca per stazione</h3>
                <p className="text-sm text-muted-foreground">
                  Visualizza tutti i treni in partenza da una stazione con orari e ritardi aggiornati
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-card rounded-lg">
              <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Train className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Cerca per numero treno</h3>
                <p className="text-sm text-muted-foreground">
                  Segui un treno specifico e vedi tutte le fermate con gli orari reali
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer spacing */}
      <div className="h-8" />

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
