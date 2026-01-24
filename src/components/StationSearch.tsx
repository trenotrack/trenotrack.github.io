import { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => stations.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-14 pl-12 pr-12 text-base bg-muted border-0 rounded-2xl placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-3 bg-background border border-border rounded-2xl shadow-xl overflow-hidden max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-6 flex items-center justify-center">
              <div className="h-5 w-5 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            </div>
          ) : (
            stations.map((station, index) => (
              <button
                key={station.code}
                onClick={() => handleSelect(station)}
                className={cn(
                  "w-full px-5 py-4 flex items-center justify-between hover:bg-muted transition-colors text-left",
                  index !== stations.length - 1 && "border-b border-border"
                )}
              >
                <span className="font-medium">{station.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
