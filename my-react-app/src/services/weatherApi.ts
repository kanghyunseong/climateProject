// 기상 데이터 API 서비스
import { getWFSData } from './climateApi';
import { ALL_LAYERS } from '../config/layers';
import {
  getUltraSrtNcst,
  getVilageFcst,
  KMA_CATEGORY,
  skyCodeToCloudCover,
} from './kmaApi';

// 기상 조건 인터페이스
export interface WeatherConditions {
  windSpeed: number; // 풍속 (m/s)
  windDirection: number; // 풍향 (도)
  precipitation: number; // 강수량 (mm)
  cloudCover: number; // 구름량 (%)
  temperature: number; // 기온 (°C)
  humidity: number; // 습도 (%)
  pressure: number; // 기압 (hPa)
  crosswind: number; // 횡풍 (m/s)
}

// 기상 예보 데이터 (48시간)
export interface WeatherForecast {
  time: string;
  conditions: WeatherConditions;
}

// 기상 데이터 캐시 (간단한 메모리 캐시)
const weatherDataCache = new Map<string, { data: WeatherConditions; timestamp: number }>();
const WEATHER_CACHE_TTL = 5 * 60 * 1000; // 5분

// 캐시 키 생성
const getWeatherCacheKey = (lat: number, lng: number): string => {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `weather_${roundedLat}_${roundedLng}`;
};

// 발사 윈도우 분석을 위한 기상 데이터 가져오기 (기상청 API 사용)
export const getWeatherDataForLaunch = async (
  lat: number,
  lng: number
): Promise<WeatherConditions | null> => {
  // 캐시 확인
  const cacheKey = getWeatherCacheKey(lat, lng);
  const cached = weatherDataCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
    console.debug('[기상 데이터] 캐시에서 불러옴');
    return cached.data;
  }

  try {
    // 기상청 초단기실황 API 호출
    const kmaData = await getUltraSrtNcst(lat, lng);

    if (kmaData && kmaData.size > 0) {
      // 기상청 데이터에서 기상 조건 추출
      const windSpeed = parseFloat(kmaData.get(KMA_CATEGORY.WSD) || '5');
      const windDirection = parseFloat(kmaData.get(KMA_CATEGORY.VEC) || '0');
      const temperature = parseFloat(kmaData.get(KMA_CATEGORY.T1H) || '20');
      const humidity = parseFloat(kmaData.get(KMA_CATEGORY.REH) || '60');

      // 강수량 처리 (강수없음은 0으로)
      const rn1 = kmaData.get(KMA_CATEGORY.RN1) || '0';
      const precipitation = rn1 === '강수없음' ? 0 : parseFloat(rn1);

      // 동서바람성분으로 횡풍 계산
      const uuu = parseFloat(kmaData.get(KMA_CATEGORY.UUU) || '0');
      const crosswind = Math.abs(uuu); // 동서 방향 바람을 횡풍으로 사용

      const conditions: WeatherConditions = {
        windSpeed,
        windDirection,
        precipitation,
        cloudCover: 30, // 초단기실황에는 구름량이 없어 기본값 사용
        temperature,
        humidity,
        pressure: 1013, // 초단기실황에는 기압이 없어 기본값 사용
        crosswind,
      };

      // 캐시에 저장
      weatherDataCache.set(cacheKey, { data: conditions, timestamp: Date.now() });
      return conditions;
    }

    // 기상청 API 실패 시 기존 WFS 방식으로 폴백
    console.info('기상청 API 데이터 없음, WFS 데이터로 폴백합니다.');
    return await getWeatherDataFromWFS(lat, lng);
  } catch (error) {
    console.info('기상청 API 호출 실패, WFS 데이터로 폴백:', error);
    return await getWeatherDataFromWFS(lat, lng);
  }
};

// WFS에서 기상 데이터 가져오기 (폴백용)
const getWeatherDataFromWFS = async (
  lat: number,
  lng: number
): Promise<WeatherConditions | null> => {
  try {
    const weatherLayers = ALL_LAYERS.filter(l =>
      (l.name.includes('폭염') ||
      l.name.includes('열환경') ||
      l.name.includes('기온') ||
      l.name.includes('온도')) &&
      l.wfsName
    );

    if (weatherLayers.length === 0) {
      return null;
    }

    const layer = weatherLayers[0];
    if (!layer.wfsName) {
      return null;
    }

    const bbox = `${lat - 0.05},${lng - 0.05},${lat + 0.05},${lng + 0.05}`;

    const data = await getWFSData({
      typeName: layer.wfsName,
      bbox,
      maxFeatures: 10,
    });

    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const props = feature.properties || {};

      return {
        windSpeed: parseFloat(props.windSpeed || props.풍속 || props.ws || '5'),
        windDirection: parseFloat(props.windDirection || props.풍향 || props.wd || '0'),
        precipitation: parseFloat(props.precipitation || props.강수량 || props.rain || '0'),
        cloudCover: parseFloat(props.cloudCover || props.구름량 || props.cc || '30'),
        temperature: parseFloat(props.temperature || props.기온 || props.temp || '20'),
        humidity: parseFloat(props.humidity || props.습도 || props.rh || '60'),
        pressure: parseFloat(props.pressure || props.기압 || props.pres || '1013'),
        crosswind: parseFloat(props.crosswind || props.횡풍 || '3'),
      };
    }

    return null;
  } catch (error) {
    console.info('WFS 기상 데이터 가져오기 실패:', error);
    return null;
  }
};

// 48시간 기상 예보 데이터 (기상청 단기예보 API 사용)
// localStorage 캐싱 지원
export const getWeatherForecast = async (
  lat: number,
  lng: number,
  useCache: boolean = true
): Promise<WeatherForecast[]> => {
  // 캐시에서 먼저 확인
  if (useCache) {
    const { getCachedWeatherForecast } = await import('./weatherCacheService');
    const cached = getCachedWeatherForecast(lat, lng);
    if (cached) {
      console.info('기상 예보 데이터를 캐시에서 불러왔습니다.');
      return cached;
    }
  }

  try {
    // 기상청 단기예보 API 호출
    const kmaForecastData = await getVilageFcst(lat, lng);

    if (kmaForecastData && kmaForecastData.length > 0) {
      // 시간별로 데이터 그룹화
      const forecastMap = new Map<string, Map<string, string>>();

      kmaForecastData.forEach((item) => {
        if (item.fcstDate && item.fcstTime && item.fcstValue) {
          const key = `${item.fcstDate}${item.fcstTime}`;
          if (!forecastMap.has(key)) {
            forecastMap.set(key, new Map());
          }
          forecastMap.get(key)!.set(item.category, item.fcstValue);
        }
      });

      // 시간순 정렬 및 WeatherForecast 형식으로 변환
      const forecasts: WeatherForecast[] = [];
      const sortedKeys = Array.from(forecastMap.keys()).sort();

      for (const key of sortedKeys) {
        const data = forecastMap.get(key)!;
        const dateStr = key.substring(0, 8);
        const timeStr = key.substring(8, 12);

        // ISO 형식 시간 생성
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        const hour = timeStr.substring(0, 2);
        const minute = timeStr.substring(2, 4);
        const isoTime = `${year}-${month}-${day}T${hour}:${minute}:00+09:00`;

        // 풍속
        const windSpeed = parseFloat(data.get(KMA_CATEGORY.WSD) || '5');
        // 풍향
        const windDirection = parseFloat(data.get(KMA_CATEGORY.VEC) || '0');
        // 기온
        const temperature = parseFloat(data.get(KMA_CATEGORY.TMP) || '20');
        // 습도
        const humidity = parseFloat(data.get(KMA_CATEGORY.REH) || '60');
        // 하늘상태 -> 구름량
        const skyCode = data.get(KMA_CATEGORY.SKY) || '1';
        const cloudCover = skyCodeToCloudCover(skyCode);
        // 강수량
        const pcpStr = data.get(KMA_CATEGORY.PCP) || '강수없음';
        let precipitation = 0;
        if (pcpStr !== '강수없음') {
          // "1.0mm" 형태에서 숫자 추출
          const match = pcpStr.match(/[\d.]+/);
          if (match) {
            precipitation = parseFloat(match[0]);
          }
        }
        // 동서바람성분으로 횡풍 계산
        const uuu = parseFloat(data.get(KMA_CATEGORY.UUU) || '0');
        const crosswind = Math.abs(uuu);

        forecasts.push({
          time: isoTime,
          conditions: {
            windSpeed,
            windDirection,
            precipitation,
            cloudCover,
            temperature,
            humidity,
            pressure: 1013, // 단기예보에 기압 없음
            crosswind,
          },
        });
      }

      // 최대 48시간분만 반환
      const result = forecasts.slice(0, 48);
      
      // 캐시에 저장
      if (useCache) {
        const { cacheWeatherForecast } = await import('./weatherCacheService');
        cacheWeatherForecast(lat, lng, result);
      }
      
      return result;
    }

    // 기상청 API 실패 시 현재 날씨 기반 시뮬레이션
    console.info('기상청 예보 API 데이터 없음, 시뮬레이션 데이터 사용');
    const simulated = await getSimulatedForecast(lat, lng);
    
    // 시뮬레이션 데이터도 캐시에 저장 (TTL은 짧게)
    if (useCache) {
      const { cacheWeatherForecast } = await import('./weatherCacheService');
      cacheWeatherForecast(lat, lng, simulated, 5 * 60 * 1000); // 5분
    }
    
    return simulated;
  } catch (error) {
    console.error('기상 예보 데이터 가져오기 실패:', error);
    
    // 목업 데이터 확인
    const { loadMockDataFromStorage, saveMockDataToStorage } = await import('./mockDataService');
    const mockKey = `weather_forecast_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
    const cachedMock = loadMockDataFromStorage(mockKey);
    
    if (cachedMock) {
      console.info('목업 데이터를 사용합니다.');
      return cachedMock;
    }
    
    const simulated = await getSimulatedForecast(lat, lng);
    
    // 목업 데이터 저장
    saveMockDataToStorage(mockKey, simulated, 30 * 60 * 1000);
    
    // 에러 시에도 캐시 저장 (TTL은 짧게)
    if (useCache) {
      const { cacheWeatherForecast } = await import('./weatherCacheService');
      cacheWeatherForecast(lat, lng, simulated, 5 * 60 * 1000); // 5분
    }
    
    return simulated;
  }
};

// 시뮬레이션 예보 데이터 생성 (폴백용)
const getSimulatedForecast = async (
  lat: number,
  lng: number
): Promise<WeatherForecast[]> => {
  const currentConditions = await getWeatherDataForLaunch(lat, lng);
  const forecasts: WeatherForecast[] = [];
  const now = new Date();

  for (let hour = 0; hour < 48; hour += 1) {
    const forecastTime = new Date(now.getTime() + hour * 60 * 60 * 1000);

    if (currentConditions) {
      forecasts.push({
        time: forecastTime.toISOString(),
        conditions: {
          windSpeed: Math.max(0, currentConditions.windSpeed + (Math.sin(hour / 12) * 3)),
          windDirection: (currentConditions.windDirection + hour * 3) % 360,
          precipitation: Math.random() < 0.15 ? Math.random() * 3 : 0,
          cloudCover: Math.max(0, Math.min(100, currentConditions.cloudCover + (Math.sin(hour / 8) * 15))),
          temperature: currentConditions.temperature + (Math.sin((hour - 6) / 24 * Math.PI * 2) * 4),
          humidity: Math.max(30, Math.min(95, currentConditions.humidity + (Math.sin(hour / 12) * 10))),
          pressure: currentConditions.pressure + (Math.sin(hour / 24) * 3),
          crosswind: Math.max(0, currentConditions.crosswind + (Math.sin(hour / 8) * 2)),
        },
      });
    } else {
      forecasts.push({
        time: forecastTime.toISOString(),
        conditions: {
          windSpeed: 5 + Math.sin(hour / 12) * 5,
          windDirection: (hour * 5) % 360,
          precipitation: Math.random() < 0.15 ? Math.random() * 3 : 0,
          cloudCover: 30 + Math.sin(hour / 8) * 25,
          temperature: 18 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 6,
          humidity: 60 + Math.sin(hour / 12) * 15,
          pressure: 1013 + Math.sin(hour / 24) * 3,
          crosswind: 3 + Math.sin(hour / 8) * 3,
        },
      });
    }
  }

  return forecasts;
};

// 침수 위험도 데이터 가져오기
export const getFloodRiskData = async (
  lat: number,
  lng: number,
  radius: number = 0.2
): Promise<Array<{
  lat: number;
  lng: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  precipitation: number;
  elevation: number;
  predictedFlood: number;
  properties: Record<string, any>;
}>> => {
  try {
    // 극한호우 관련 레이어 찾기
    const floodLayers = ALL_LAYERS.filter(l => 
      l.name.includes('침수') || 
      l.name.includes('호우') || 
      l.name.includes('홍수') ||
      l.name.includes('위험도')
    );

    const risks: Array<{
      lat: number;
      lng: number;
      riskLevel: 'low' | 'medium' | 'high';
      precipitation: number;
      elevation: number;
      predictedFlood: number;
      properties: Record<string, any>;
    }> = [];

    // 모든 침수 관련 레이어에서 데이터 가져오기
    for (const layer of floodLayers) {
      try {
        const bbox = `${lat - radius},${lng - radius},${lat + radius},${lng + radius}`;
        const data = await getWFSData({
          typeName: layer.wfsName,
          bbox,
          maxFeatures: 100,
        });

        if (data && data.features) {
          data.features.forEach((feature: any) => {
            if (feature.geometry && feature.geometry.coordinates) {
              const coords = feature.geometry.coordinates;
              const props = feature.properties || {};

              // 좌표 추출
              let pointLat: number, pointLng: number;
              if (feature.geometry.type === 'Point') {
                pointLng = coords[0];
                pointLat = coords[1];
              } else {
                // 폴리곤의 경우 중심점 계산
                const center = calculatePolygonCenter(coords, feature.geometry.type);
                pointLng = center[0];
                pointLat = center[1];
              }

              // 위험도 계산
              const precipitation = parseFloat(
                props.precipitation || 
                props.강수량 || 
                props.rain || 
                props.위험도 || 
                props.risk || 
                '0'
              );
              
              const elevation = parseFloat(props.elevation || props.고도 || props.elev || '50');
              const riskValue = parseFloat(props.위험도 || props.risk || props.danger || '0');
              
              let riskLevel: 'low' | 'medium' | 'high';
              if (riskValue > 70 || precipitation > 70) {
                riskLevel = 'high';
              } else if (riskValue > 40 || precipitation > 40) {
                riskLevel = 'medium';
              } else {
                riskLevel = 'low';
              }

              risks.push({
                lat: pointLat,
                lng: pointLng,
                riskLevel,
                precipitation,
                elevation,
                predictedFlood: precipitation / 100,
                properties: props,
              });
            }
          });
        }
      } catch (error) {
        console.warn(`레이어 ${layer.name} 데이터 가져오기 실패:`, error);
      }
    }

    // 데이터가 없으면 시뮬레이션 데이터 생성
    if (risks.length === 0) {
      console.info('침수 위험도 데이터가 없어 시뮬레이션 데이터를 생성합니다.');
      return generateSimulatedFloodRiskData(lat, lng, radius);
    }

    return risks;
  } catch (error) {
    console.error('침수 위험도 데이터 가져오기 실패:', error);
    // 에러 시에도 시뮬레이션 데이터 반환
    return generateSimulatedFloodRiskData(lat, lng, radius);
  }
};

// 침수 위험도 시뮬레이션 데이터 생성
function generateSimulatedFloodRiskData(
  lat: number,
  lng: number,
  radius: number
): Array<{
  lat: number;
  lng: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  precipitation: number;
  elevation: number;
  predictedFlood: number;
  properties: Record<string, any>;
}> {
  const risks = [];
  const gridSize = 5; // 5x5 그리드

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const pointLat = lat - radius + (radius * 2 * i) / (gridSize - 1);
      const pointLng = lng - radius + (radius * 2 * j) / (gridSize - 1);

      // 중심에 가까울수록 위험도 높음 (시뮬레이션)
      const distFromCenter = Math.sqrt(
        Math.pow(pointLat - lat, 2) + Math.pow(pointLng - lng, 2)
      );
      const normalizedDist = distFromCenter / radius;

      // 랜덤 요소 추가
      const randomFactor = Math.random() * 30;
      const baseRisk = (1 - normalizedDist) * 70 + randomFactor;

      // 고도 시뮬레이션 (낮은 지역일수록 위험)
      const elevation = 20 + Math.random() * 80;
      const elevationFactor = elevation < 30 ? 20 : elevation < 50 ? 10 : 0;

      const totalRisk = Math.min(100, baseRisk + elevationFactor);

      // 강수량 시뮬레이션
      const precipitation = 10 + Math.random() * 60;

      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (totalRisk > 80) {
        riskLevel = 'critical';
      } else if (totalRisk > 60) {
        riskLevel = 'high';
      } else if (totalRisk > 40) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }

      risks.push({
        lat: pointLat,
        lng: pointLng,
        riskLevel,
        precipitation,
        elevation,
        predictedFlood: totalRisk / 100,
        properties: {
          simulated: true,
          riskScore: totalRisk,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  return risks;
}

// 대기질 데이터 가져오기
export const getAirQualityData = async (
  lat: number,
  lng: number
): Promise<{
  pm25: number;
  pm10: number;
  ozone: number;
  temperature: number;
  feelsLike: number;
} | null> => {
  try {
    // 폭염/열환경 레이어에서 대기질 관련 데이터 가져오기
    const airLayers = ALL_LAYERS.filter(l => 
      l.name.includes('폭염') || 
      l.name.includes('열환경') ||
      l.name.includes('체감온도')
    );

    if (airLayers.length === 0) {
      console.info('대기질 관련 레이어를 찾을 수 없습니다. 목업 데이터를 사용합니다.');
      const { loadMockDataFromStorage, generateMockAirQuality, saveMockDataToStorage } = await import('./mockDataService');
      const mockKey = `air_quality_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
      const cachedMock = loadMockDataFromStorage(mockKey);
      
      if (cachedMock) {
        return cachedMock;
      }
      
      const mockData = generateMockAirQuality(lat, lng);
      saveMockDataToStorage(mockKey, mockData, 30 * 60 * 1000); // 30분
      return mockData;
    }

    const layer = airLayers[0];
    
    // WFS를 지원하지 않는 레이어인 경우 목업 데이터 사용
    if (!layer.wfsName) {
      console.info('대기질 레이어가 WFS를 지원하지 않습니다. 목업 데이터를 사용합니다.');
      const { loadMockDataFromStorage, generateMockAirQuality, saveMockDataToStorage } = await import('./mockDataService');
      const mockKey = `air_quality_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
      const cachedMock = loadMockDataFromStorage(mockKey);
      
      if (cachedMock) {
        return cachedMock;
      }
      
      const mockData = generateMockAirQuality(lat, lng);
      saveMockDataToStorage(mockKey, mockData, 30 * 60 * 1000); // 30분
      return mockData;
    }
    
    const bbox = `${lat - 0.05},${lng - 0.05},${lat + 0.05},${lng + 0.05}`;

    const data = await getWFSData({
      typeName: layer.wfsName,
      bbox,
      maxFeatures: 10,
    });

    if (data && data.features && data.features.length > 0) {
      const feature = data.features[0];
      const props = feature.properties || {};

      // 대기질 데이터 추출 (실제 속성명에 맞게 조정 필요)
      return {
        pm25: parseFloat(props.pm25 || props.PM25 || props['PM2.5'] || '25'),
        pm10: parseFloat(props.pm10 || props.PM10 || '50'),
        ozone: parseFloat(props.ozone || props.O3 || props.오존 || '0.08'),
        temperature: parseFloat(props.temperature || props.기온 || props.temp || '20'),
        feelsLike: parseFloat(props.feelsLike || props.체감온도 || props.temp || '20'),
      };
    }

    // 데이터가 없으면 목업 데이터 사용
    console.info('대기질 데이터가 없어 목업 데이터를 사용합니다.');
    const { loadMockDataFromStorage, generateMockAirQuality, saveMockDataToStorage } = await import('./mockDataService');
    const mockKey = `air_quality_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
    const cachedMock = loadMockDataFromStorage(mockKey);
    
    if (cachedMock) {
      return cachedMock;
    }
    
    const mockData = generateMockAirQuality(lat, lng);
    saveMockDataToStorage(mockKey, mockData, 30 * 60 * 1000); // 30분
    return mockData;
  } catch (error: any) {
    // WFS를 지원하지 않는 레이어나 쿼리 오류는 조용히 처리
    if (error?.message?.includes('WFS_NOT_SUPPORTED') || 
        error?.message?.includes('No query specified') ||
        error?.message?.includes('unknown')) {
      console.info('대기질 데이터를 가져올 수 없어 목업 데이터를 사용합니다.');
      const { loadMockDataFromStorage, generateMockAirQuality, saveMockDataToStorage } = await import('./mockDataService');
      const mockKey = `air_quality_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
      const cachedMock = loadMockDataFromStorage(mockKey);
      
      if (cachedMock) {
        return cachedMock;
      }
      
      const mockData = generateMockAirQuality(lat, lng);
      saveMockDataToStorage(mockKey, mockData, 30 * 60 * 1000); // 30분
      return mockData;
    }
    console.debug('대기질 데이터 가져오기 실패, 목업 데이터 사용:', error);
    
    // 오류 발생 시에도 목업 데이터 반환
    const { loadMockDataFromStorage, generateMockAirQuality, saveMockDataToStorage } = await import('./mockDataService');
    const mockKey = `air_quality_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
    const cachedMock = loadMockDataFromStorage(mockKey);
    
    if (cachedMock) {
      return cachedMock;
    }
    
    const mockData = generateMockAirQuality(lat, lng);
    saveMockDataToStorage(mockKey, mockData, 30 * 60 * 1000); // 30분
    return mockData;
  }
};

// 폴리곤 중심점 계산 헬퍼 함수
function calculatePolygonCenter(coords: any, type: string): [number, number] {
  let allCoords: number[][] = [];

  if (type === 'Polygon') {
    allCoords = coords[0]; // 외부 링
  } else if (type === 'MultiPolygon') {
    coords.forEach((polygon: any) => {
      allCoords = allCoords.concat(polygon[0]);
    });
  }

  if (allCoords.length === 0) {
    return [127.0, 37.5];
  }

  let sumLng = 0, sumLat = 0;
  allCoords.forEach((coord: number[]) => {
    sumLng += coord[0];
    sumLat += coord[1];
  });

  return [sumLng / allCoords.length, sumLat / allCoords.length];
}

