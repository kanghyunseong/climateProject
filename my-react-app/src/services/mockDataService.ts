// 데이터 목업 서비스
// API 호출 실패 시 또는 오프라인 모드에서 사용할 샘플 데이터

export interface MockWeatherForecast {
  time: string;
  conditions: {
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    cloudCover: number;
    temperature: number;
    humidity: number;
    pressure: number;
    crosswind: number;
  };
}

export interface MockAirQuality {
  lat: number;
  lng: number;
  pm25: number;
  pm10: number;
  ozone: number;
  temperature: number;
  feelsLike: number;
}

// 샘플 기상 예보 데이터 생성
export const generateMockWeatherForecast = (
  _lat: number,
  _lng: number,
  hours: number = 48
): MockWeatherForecast[] => {
  const forecasts: MockWeatherForecast[] = [];
  const now = new Date();

  for (let i = 0; i < hours; i++) {
    const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000);
    
    // 시간대별 변동 시뮬레이션
    const hour = forecastTime.getHours();
    const timeVariation = Math.sin((hour / 24) * Math.PI * 2);
    
    forecasts.push({
      time: forecastTime.toISOString(),
      conditions: {
        windSpeed: 5 + timeVariation * 5 + Math.random() * 3,
        windDirection: (hour * 15 + Math.random() * 30) % 360,
        precipitation: Math.random() < 0.2 ? Math.random() * 5 : 0,
        cloudCover: 30 + timeVariation * 20 + Math.random() * 20,
        temperature: 20 + timeVariation * 5 + Math.random() * 3,
        humidity: 60 + timeVariation * 15 + Math.random() * 10,
        pressure: 1013 + Math.random() * 5,
        crosswind: 3 + Math.random() * 4,
      },
    });
  }

  return forecasts;
};

// 샘플 공기질 데이터 생성
export const generateMockAirQuality = (
  lat: number,
  lng: number
): MockAirQuality => {
  // 위치에 따른 미세한 변동
  const latVariation = (lat % 1) * 10;
  const lngVariation = (lng % 1) * 10;
  
  return {
    lat,
    lng,
    pm25: 25 + latVariation + Math.random() * 10,
    pm10: 50 + lngVariation + Math.random() * 15,
    ozone: 0.08 + Math.random() * 0.02,
    temperature: 20 + Math.random() * 5,
    feelsLike: 20 + Math.random() * 5,
  };
};

// 여러 위치의 샘플 공기질 데이터 생성
export const generateMockAirQualityGrid = (
  centerLat: number,
  centerLng: number,
  gridSize: number = 5,
  radius: number = 0.1
): MockAirQuality[] => {
  const points: MockAirQuality[] = [];
  const step = (radius * 2) / gridSize;

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = centerLat - radius + (i * step);
      const lng = centerLng - radius + (j * step);
      points.push(generateMockAirQuality(lat, lng));
    }
  }

  return points;
};

// localStorage에 목업 데이터 저장
export const saveMockDataToStorage = (
  key: string,
  data: any,
  ttl: number = 60 * 60 * 1000 // 1시간
): void => {
  try {
    const mockData = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(`mock_${key}`, JSON.stringify(mockData));
  } catch (error) {
    console.warn('목업 데이터 저장 실패:', error);
  }
};

// localStorage에서 목업 데이터 불러오기
export const loadMockDataFromStorage = (key: string): any | null => {
  try {
    const stored = localStorage.getItem(`mock_${key}`);
    if (!stored) return null;

    const mockData = JSON.parse(stored);
    const age = Date.now() - mockData.timestamp;
    
    if (age > mockData.ttl) {
      localStorage.removeItem(`mock_${key}`);
      return null;
    }

    return mockData.data;
  } catch (error) {
    console.warn('목업 데이터 불러오기 실패:', error);
    return null;
  }
};

