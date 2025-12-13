import { useState, useEffect, useRef, useCallback } from 'react';

interface Location {
  name: string;
  lat: number;
  lng: number;
  type?: string;
}

// 경기도 주요 지역 데이터
const GYEONGGI_LOCATIONS: Location[] = [
  { name: '수원시', lat: 37.2636, lng: 127.0286, type: '시' },
  { name: '성남시', lat: 37.4201, lng: 127.1266, type: '시' },
  { name: '고양시', lat: 37.6584, lng: 126.8320, type: '시' },
  { name: '용인시', lat: 37.2411, lng: 127.1776, type: '시' },
  { name: '부천시', lat: 37.5034, lng: 126.7660, type: '시' },
  { name: '안산시', lat: 37.3219, lng: 126.8309, type: '시' },
  { name: '안양시', lat: 37.3925, lng: 126.9269, type: '시' },
  { name: '평택시', lat: 36.9908, lng: 127.0856, type: '시' },
  { name: '시흥시', lat: 37.3800, lng: 126.8029, type: '시' },
  { name: '김포시', lat: 37.6153, lng: 126.7158, type: '시' },
  { name: '광명시', lat: 37.4772, lng: 126.8664, type: '시' },
  { name: '이천시', lat: 37.2720, lng: 127.4420, type: '시' },
  { name: '양주시', lat: 37.7840, lng: 127.0457, type: '시' },
  { name: '오산시', lat: 37.1498, lng: 127.0775, type: '시' },
  { name: '구리시', lat: 37.5944, lng: 127.1296, type: '시' },
  { name: '안성시', lat: 37.0080, lng: 127.2797, type: '시' },
  { name: '포천시', lat: 37.8947, lng: 127.2007, type: '시' },
  { name: '의정부시', lat: 37.7381, lng: 127.0477, type: '시' },
  { name: '하남시', lat: 37.5394, lng: 127.2149, type: '시' },
  { name: '여주시', lat: 37.2983, lng: 127.6370, type: '시' },
  { name: '파주시', lat: 37.7599, lng: 126.7800, type: '시' },
  { name: '화성시', lat: 37.1995, lng: 126.8314, type: '시' },
  { name: '광주시', lat: 37.4296, lng: 127.2551, type: '시' },
  { name: '동두천시', lat: 37.9034, lng: 127.0606, type: '시' },
  { name: '과천시', lat: 37.4292, lng: 126.9876, type: '시' },
  { name: '남양주시', lat: 37.6360, lng: 127.2165, type: '시' },
  { name: '의왕시', lat: 37.3448, lng: 126.9688, type: '시' },
  { name: '군포시', lat: 37.3616, lng: 126.9351, type: '시' },
];

interface SearchBarProps {
  onLocationSelect: (location: Location) => void;
  onSearch?: (query: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

// Nominatim API 검색 결과 인터페이스
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

export default function SearchBar({ onLocationSelect, onSearch, inputRef }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRefToUse = inputRef || internalInputRef;
  const searchTimeoutRef = useRef<number | null>(null);

  // Nominatim API로 주소 검색
  const searchWithNominatim = useCallback(async (searchQuery: string): Promise<Location[]> => {
    try {
      // 한국 지역으로 제한하고, 경기도 우선 검색
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(searchQuery + ' 경기도')}&` +
        `format=json&` +
        `countrycodes=kr&` +
        `limit=5&` +
        `addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'ko',
          },
        }
      );

      if (!response.ok) {
        throw new Error('검색 실패');
      }

      const data: NominatimResult[] = await response.json();

      return data.map((item) => {
        // display_name에서 간략한 이름 추출
        const nameParts = item.display_name.split(', ');
        const shortName = nameParts.slice(0, 2).join(', ');

        return {
          name: shortName,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          type: item.type === 'city' ? '시' :
                item.type === 'town' ? '읍' :
                item.type === 'village' ? '리' :
                item.class === 'place' ? '장소' : '주소',
        };
      });
    } catch (error) {
      console.warn('Nominatim 검색 실패:', error);
      return [];
    }
  }, []);

  // 통합 검색 (로컬 + API)
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);

    // 1. 로컬 데이터에서 먼저 검색
    const localResults = GYEONGGI_LOCATIONS.filter(loc =>
      loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);

    // 로컬 결과가 있으면 먼저 표시
    if (localResults.length > 0) {
      setResults(localResults);
      setIsOpen(true);
    }

    // 2. API 검색 (2글자 이상일 때만)
    if (searchQuery.trim().length >= 2) {
      const apiResults = await searchWithNominatim(searchQuery);

      // 중복 제거 후 합치기
      const combinedResults = [...localResults];
      apiResults.forEach((apiResult) => {
        const isDuplicate = combinedResults.some(
          (local) =>
            Math.abs(local.lat - apiResult.lat) < 0.01 &&
            Math.abs(local.lng - apiResult.lng) < 0.01
        );
        if (!isDuplicate) {
          combinedResults.push(apiResult);
        }
      });

      setResults(combinedResults.slice(0, 10));
      setIsOpen(combinedResults.length > 0);
    }

    setIsSearching(false);
  }, [searchWithNominatim]);

  // 디바운스된 검색
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length > 0) {
      // 로컬 검색은 즉시
      const localResults = GYEONGGI_LOCATIONS.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);

      if (localResults.length > 0) {
        setResults(localResults);
        setIsOpen(true);
      }

      // API 검색은 디바운스
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (location: Location) => {
    onLocationSelect(location);
    setQuery(location.name);
    setIsOpen(false);
    if (onSearch) {
      onSearch(location.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="search-bar" ref={searchRef}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRefToUse}
          type="text"
          placeholder="지역 검색 (예: 수원, 성남역)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 0 && results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="search-input"
        />
        {isSearching && (
          <span style={{ marginRight: '0.5rem', fontSize: '0.8rem' }}>
            <span className="loading-spinner" style={{ width: '16px', height: '16px' }}></span>
          </span>
        )}
        {query && !isSearching && (
          <button
            className="clear-button"
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
          >
            ✕
          </button>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="search-results">
          {results.map((location, index) => (
            <div
              key={`${location.name}-${index}`}
              className="search-result-item"
              onClick={() => handleSelect(location)}
              style={{
                background: index === 0 ? 'rgba(102, 126, 234, 0.15)' : undefined,
              }}
            >
              <span className="result-icon">
                {location.type === '시' ? '🏙️' :
                 location.type === '읍' || location.type === '리' ? '🏘️' :
                 location.type === '장소' ? '📍' : '🗺️'}
              </span>
              <div className="result-info">
                <span className="result-name">{location.name}</span>
                {location.type && (
                  <span className="result-type">{location.type}</span>
                )}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
                {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
              </span>
            </div>
          ))}
          {query.length >= 2 && !isSearching && (
            <div style={{
              padding: '0.5rem 1rem',
              fontSize: '0.75rem',
              color: 'rgba(255,255,255,0.5)',
              textAlign: 'center',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}>
              Enter를 눌러 첫 번째 결과 선택
            </div>
          )}
        </div>
      )}
      {isOpen && results.length === 0 && query.length >= 2 && !isSearching && (
        <div className="search-results">
          <div style={{
            padding: '1rem',
            textAlign: 'center',
            color: 'rgba(255,255,255,0.6)',
          }}>
            검색 결과가 없습니다
          </div>
        </div>
      )}
    </div>
  );
}
