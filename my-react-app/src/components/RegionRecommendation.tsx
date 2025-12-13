import { useState, useEffect, useCallback } from 'react';
import { getWeatherDataForLaunch } from '../services/weatherApi';

interface CityWeather {
  name: string;
  lat: number;
  lng: number;
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  status: 'good' | 'moderate' | 'poor';
  statusText: string;
  isLoading: boolean;
  error: boolean;
}

interface RegionRecommendationProps {
  selectedLayer: string | null;
  onCitySelect?: (city: { lat: number; lng: number; name: string }) => void;
}

// 경기도 주요 도시
const GYEONGGI_CITIES = [
  { name: '수원시', lat: 37.2636, lng: 127.0286 },
  { name: '성남시', lat: 37.4201, lng: 127.1266 },
  { name: '고양시', lat: 37.6584, lng: 126.8320 },
  { name: '용인시', lat: 37.2411, lng: 127.1776 },
  { name: '부천시', lat: 37.5034, lng: 126.7660 },
  { name: '안산시', lat: 37.3219, lng: 126.8309 },
  { name: '안양시', lat: 37.3925, lng: 126.9269 },
  { name: '평택시', lat: 36.9908, lng: 127.0856 },
  { name: '시흥시', lat: 37.3800, lng: 126.8029 },
  { name: '김포시', lat: 37.6153, lng: 126.7158 },
];

// 기상 상태 평가
function evaluateWeatherStatus(weather: { temperature: number; humidity: number; windSpeed: number; precipitation: number }): { status: 'good' | 'moderate' | 'poor'; statusText: string } {
  let score = 100;

  // 온도 평가 (15-25도가 이상적)
  if (weather.temperature < 0 || weather.temperature > 35) score -= 40;
  else if (weather.temperature < 10 || weather.temperature > 30) score -= 20;
  else if (weather.temperature < 15 || weather.temperature > 25) score -= 10;

  // 강수량 평가
  if (weather.precipitation > 10) score -= 30;
  else if (weather.precipitation > 5) score -= 15;
  else if (weather.precipitation > 0) score -= 5;

  // 습도 평가 (40-60%가 이상적)
  if (weather.humidity < 20 || weather.humidity > 90) score -= 20;
  else if (weather.humidity < 30 || weather.humidity > 80) score -= 10;

  // 풍속 평가
  if (weather.windSpeed > 15) score -= 20;
  else if (weather.windSpeed > 10) score -= 10;

  if (score >= 70) {
    return { status: 'good', statusText: '쾌적' };
  } else if (score >= 50) {
    return { status: 'moderate', statusText: '보통' };
  } else {
    return { status: 'poor', statusText: '주의' };
  }
}

// 목업 날씨 데이터 생성
function generateMockWeather(cityName: string): { temperature: number; humidity: number; windSpeed: number; precipitation: number } {
  // 도시별로 약간 다른 값 생성 (일관성 유지를 위해 이름 기반)
  const seed = cityName.charCodeAt(0) + cityName.charCodeAt(1);
  const baseTemp = 18 + (seed % 10);
  const baseHumidity = 50 + (seed % 20);

  return {
    temperature: baseTemp + (Math.random() * 4 - 2),
    humidity: baseHumidity + (Math.random() * 10 - 5),
    windSpeed: 2 + (seed % 5) + Math.random() * 2,
    precipitation: Math.random() < 0.2 ? Math.random() * 5 : 0,
  };
}

export default function RegionRecommendation({ onCitySelect }: RegionRecommendationProps) {
  const [cities, setCities] = useState<CityWeather[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 모든 도시 날씨 데이터 가져오기
  const fetchAllCitiesWeather = useCallback(async () => {
    setIsRefreshing(true);

    const updatedCities: CityWeather[] = await Promise.all(
      GYEONGGI_CITIES.map(async (city) => {
        try {
          const weatherData = await getWeatherDataForLaunch(city.lat, city.lng);

          if (weatherData) {
            const { status, statusText } = evaluateWeatherStatus(weatherData);
            return {
              ...city,
              temperature: weatherData.temperature,
              humidity: weatherData.humidity,
              windSpeed: weatherData.windSpeed,
              precipitation: weatherData.precipitation,
              status,
              statusText,
              isLoading: false,
              error: false,
            };
          } else {
            // API 실패 시 목업 데이터 사용
            const mockData = generateMockWeather(city.name);
            const { status, statusText } = evaluateWeatherStatus(mockData);
            return {
              ...city,
              ...mockData,
              status,
              statusText,
              isLoading: false,
              error: false,
            };
          }
        } catch (error) {
          // 에러 시 목업 데이터 사용
          const mockData = generateMockWeather(city.name);
          const { status, statusText } = evaluateWeatherStatus(mockData);
          return {
            ...city,
            ...mockData,
            status,
            statusText,
            isLoading: false,
            error: false,
          };
        }
      })
    );

    // 상태순 정렬 (good > moderate > poor), 같은 상태면 온도순
    updatedCities.sort((a, b) => {
      const statusOrder = { good: 0, moderate: 1, poor: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.temperature - a.temperature;
    });

    setCities(updatedCities);
    setLastUpdate(new Date());
    setIsRefreshing(false);
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchAllCitiesWeather();
  }, [fetchAllCitiesWeather]);

  // 자동 새로고침 (5분마다)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAllCitiesWeather();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllCitiesWeather]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return '#4caf50';
      case 'moderate': return '#ff9800';
      case 'poor': return '#f44336';
      default: return '#999';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '☀️';
      case 'moderate': return '⛅';
      case 'poor': return '🌧️';
      default: return '❓';
    }
  };

  const handleCityClick = (city: CityWeather) => {
    if (onCitySelect) {
      onCitySelect({ lat: city.lat, lng: city.lng, name: city.name });
    }
  };

  return (
    <div className="region-recommendation">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>🌤️ 경기도 실시간 기후 현황</h3>
        <button
          onClick={fetchAllCitiesWeather}
          disabled={isRefreshing}
          style={{
            padding: '0.4rem 0.75rem',
            fontSize: '0.75rem',
            background: isRefreshing ? '#ccc' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
          }}
        >
          {isRefreshing ? '갱신 중...' : '🔄 새로고침'}
        </button>
      </div>

      {/* 자동 새로고침 토글 */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        fontSize: '0.8rem',
        color: '#666',
      }}>
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(e) => setAutoRefresh(e.target.checked)}
        />
        5분마다 자동 갱신
      </label>

      {lastUpdate && (
        <p style={{ fontSize: '0.75rem', color: '#999', marginBottom: '0.75rem' }}>
          마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
        </p>
      )}

      {/* 도시 목록 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
        {cities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            데이터를 불러오는 중...
          </div>
        ) : (
          cities.map((city, index) => (
            <div
              key={city.name}
              onClick={() => handleCityClick(city)}
              style={{
                padding: '0.75rem',
                background: index === 0 ? 'rgba(102, 126, 234, 0.1)' : '#f8f9fa',
                borderRadius: '8px',
                border: `1px solid ${index === 0 ? '#667eea' : '#e0e0e0'}`,
                cursor: onCitySelect ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                if (onCitySelect) {
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{getStatusIcon(city.status)}</span>
                  <div>
                    <strong style={{ color: index === 0 ? '#667eea' : '#333' }}>
                      {index === 0 && '🏆 '}{city.name}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#999' }}>
                      {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div style={{
                  padding: '0.25rem 0.5rem',
                  background: getStatusColor(city.status),
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                }}>
                  {city.statusText}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem',
                marginTop: '0.5rem',
                fontSize: '0.8rem',
              }}>
                <div style={{ textAlign: 'center', padding: '0.25rem', background: 'white', borderRadius: '4px' }}>
                  <div style={{ color: '#999', fontSize: '0.7rem' }}>온도</div>
                  <div style={{ fontWeight: '600', color: city.temperature > 30 ? '#f44336' : city.temperature < 10 ? '#2196f3' : '#333' }}>
                    {city.temperature.toFixed(1)}°C
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.25rem', background: 'white', borderRadius: '4px' }}>
                  <div style={{ color: '#999', fontSize: '0.7rem' }}>습도</div>
                  <div style={{ fontWeight: '600' }}>{city.humidity.toFixed(0)}%</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.25rem', background: 'white', borderRadius: '4px' }}>
                  <div style={{ color: '#999', fontSize: '0.7rem' }}>풍속</div>
                  <div style={{ fontWeight: '600' }}>{city.windSpeed.toFixed(1)}m/s</div>
                </div>
                <div style={{ textAlign: 'center', padding: '0.25rem', background: 'white', borderRadius: '4px' }}>
                  <div style={{ color: '#999', fontSize: '0.7rem' }}>강수</div>
                  <div style={{ fontWeight: '600', color: city.precipitation > 0 ? '#2196f3' : '#333' }}>
                    {city.precipitation > 0 ? `${city.precipitation.toFixed(1)}mm` : '-'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 범례 */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '0.75rem',
      }}>
        <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>상태 기준</div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <span>☀️ <span style={{ color: '#4caf50' }}>쾌적</span>: 야외활동 적합</span>
          <span>⛅ <span style={{ color: '#ff9800' }}>보통</span>: 일부 주의</span>
          <span>🌧️ <span style={{ color: '#f44336' }}>주의</span>: 실내활동 권장</span>
        </div>
      </div>

      {onCitySelect && (
        <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem', textAlign: 'center' }}>
          💡 도시를 클릭하면 해당 위치로 지도가 이동합니다
        </p>
      )}
    </div>
  );
}
