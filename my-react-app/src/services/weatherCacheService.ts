// 기상 예보 데이터 캐싱 서비스 (localStorage 기반)
// TTL(Time To Live) 지원으로 오래된 데이터 자동 삭제

export interface CachedWeatherForecast {
  data: any[];
  timestamp: number;
  lat: number;
  lng: number;
  ttl: number; // 캐시 유효 시간 (밀리초)
}

const CACHE_KEY_PREFIX = 'weather_forecast_cache_';
const DEFAULT_TTL = 30 * 60 * 1000; // 30분

// 캐시 키 생성
const getCacheKey = (lat: number, lng: number): string => {
  // 좌표를 반올림하여 캐시 키 생성 (0.01도 단위, 약 1km)
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `${CACHE_KEY_PREFIX}${roundedLat}_${roundedLng}`;
};

// 기상 예보 데이터 캐싱
export const cacheWeatherForecast = (
  lat: number,
  lng: number,
  data: any[],
  ttl: number = DEFAULT_TTL
): void => {
  try {
    const cacheKey = getCacheKey(lat, lng);
    const cached: CachedWeatherForecast = {
      data,
      timestamp: Date.now(),
      lat,
      lng,
      ttl,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cached));
  } catch (error) {
    console.warn('기상 예보 캐시 저장 실패:', error);
    // localStorage 용량 초과 시 오래된 캐시 삭제
    clearOldCaches();
  }
};

// 캐시된 기상 예보 데이터 불러오기
export const getCachedWeatherForecast = (
  lat: number,
  lng: number
): any[] | null => {
  try {
    const cacheKey = getCacheKey(lat, lng);
    const cachedStr = localStorage.getItem(cacheKey);
    
    if (!cachedStr) {
      return null;
    }

    const cached: CachedWeatherForecast = JSON.parse(cachedStr);
    
    // TTL 확인
    const age = Date.now() - cached.timestamp;
    if (age > cached.ttl) {
      // 캐시 만료
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.warn('기상 예보 캐시 불러오기 실패:', error);
    return null;
  }
};

// 오래된 캐시 정리
export const clearOldCaches = (): void => {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    let clearedCount = 0;

    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached: CachedWeatherForecast = JSON.parse(
            localStorage.getItem(key) || '{}'
          );
          const age = now - cached.timestamp;
          if (age > cached.ttl) {
            localStorage.removeItem(key);
            clearedCount++;
          }
        } catch {
          // 파싱 실패 시 삭제
          localStorage.removeItem(key);
          clearedCount++;
        }
      }
    });

    if (clearedCount > 0) {
      console.info(`오래된 캐시 ${clearedCount}개 정리 완료`);
    }
  } catch (error) {
    console.error('캐시 정리 실패:', error);
  }
};

// 모든 기상 예보 캐시 삭제
export const clearAllWeatherCaches = (): void => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.info('모든 기상 예보 캐시 삭제 완료');
  } catch (error) {
    console.error('캐시 삭제 실패:', error);
  }
};

// 캐시 통계
export const getCacheStats = (): {
  count: number;
  totalSize: number;
  oldestTimestamp: number;
} => {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_KEY_PREFIX));
    let totalSize = 0;
    let oldestTimestamp = Date.now();

    cacheKeys.forEach((key) => {
      const data = localStorage.getItem(key);
      if (data) {
        totalSize += data.length;
        try {
          const cached: CachedWeatherForecast = JSON.parse(data);
          if (cached.timestamp < oldestTimestamp) {
            oldestTimestamp = cached.timestamp;
          }
        } catch {
          // 무시
        }
      }
    });

    return {
      count: cacheKeys.length,
      totalSize,
      oldestTimestamp,
    };
  } catch (error) {
    return { count: 0, totalSize: 0, oldestTimestamp: Date.now() };
  }
};

