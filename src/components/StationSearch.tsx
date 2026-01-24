import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchStations, Station } from '@/lib/api';
import { cn } from '@/lib/utils';

interface StationSearchProps {
  onStationSelect: (station: Station) => void;
  placeholder?: string;
}

export function StationSearch({ onStationSelect, placeholder = "Cerca stazione..." }: StationSearchProps) {
  const [query, setQuery] = useState('');
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.length >= 2) {
        setIsLoading(true);
        const results = await searchStations(query);
        setStations(results);
        setIsOpen(results.length > 0);
        setIsLoading(false);
      } else {
        setStations([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleSelect = (station: Station) => {
    onStationSelect(station);
    setQuery('');
    setStations([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setStations([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => stations.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10 h-12 text-base bg-card"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-pulse">Ricerca in corso...</div>
            </div>
          ) : (
            stations.map((station) => (
              <button
                key={station.code}
                onClick={() => handleSelect(station)}
                className={cn(
                  "w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors",
                  "border-b border-border last:border-b-0 text-left"
                )}
              >
                <MapPin className="h-5 w-5 text-primary shrink-0" />
                <span className="font-medium truncate">{station.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
