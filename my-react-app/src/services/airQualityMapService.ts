// 공기질 지도 데이터 서비스
// 여러 위치의 공기질 데이터를 수집하여 지도에 표시

import { getAirQualityData } from './weatherApi';

export interface AirQualityMapPoint {
  lat: number;
  lng: number;
  pm25: number;
  pm10: number;
  ozone: number;
  temperature: number;
  feelsLike: number;
  quality: 'good' | 'moderate' | 'unhealthy' | 'very-unhealthy';
  score: number; // 0-100 점수
}

// 공기질 등급 판정
export const getAirQualityGrade = (pm25: number, pm10: number, ozone: number): AirQualityMapPoint['quality'] => {
  // PM2.5 기준 (WHO 기준)
  if (pm25 > 75 || pm10 > 150 || ozone > 0.12) return 'very-unhealthy';
  if (pm25 > 35 || pm10 > 80 || ozone > 0.09) return 'unhealthy';
  if (pm25 > 15 || pm10 > 30 || ozone > 0.06) return 'moderate';
  return 'good';
};

// 공기질 점수 계산 (0-100)
export const calculateAirQualityScore = (pm25: number, pm10: number, ozone: number): number => {
  let score = 100;

  // PM2.5 점수
  if (pm25 > 75) score -= 40;
  else if (pm25 > 35) score -= 25;
  else if (pm25 > 15) score -= 10;

  // PM10 점수
  if (pm10 > 150) score -= 30;
  else if (pm10 > 80) score -= 20;
  else if (pm10 > 30) score -= 10;

  // 오존 점수
  if (ozone > 0.12) score -= 20;
  else if (ozone > 0.09) score -= 10;

  return Math.max(0, Math.min(100, score));
};

// 공기질 색상 반환
export const getAirQualityColor = (quality: AirQualityMapPoint['quality']): string => {
  switch (quality) {
    case 'good':
      return '#4caf50'; // 녹색
    case 'moderate':
      return '#ff9800'; // 주황색
    case 'unhealthy':
      return '#ff5722'; // 빨간색
    case 'very-unhealthy':
      return '#9c27b0'; // 보라색
    default:
      return '#9e9e9e'; // 회색
  }
};

// 특정 영역의 공기질 데이터 수집 (격자 방식)
export const collectAirQualityData = async (
  centerLat: number,
  centerLng: number,
  radius: number = 0.1, // 약 11km
  gridSize: number = 5 // 5x5 격자
): Promise<AirQualityMapPoint[]> => {
  const points: AirQualityMapPoint[] = [];
  const step = (radius * 2) / gridSize;

  // 격자 좌표 생성
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = centerLat - radius + (i * step);
      const lng = centerLng - radius + (j * step);

      try {
        // 목업 데이터 확인
        const { loadMockDataFromStorage, generateMockAirQuality, saveMockDataToStorage } = await import('./mockDataService');
        const mockKey = `air_quality_${Math.round(lat * 100)}_${Math.round(lng * 100)}`;
        let airData = loadMockDataFromStorage(mockKey);
        
        if (!airData) {
          airData = await getAirQualityData(lat, lng);
          if (airData) {
            saveMockDataToStorage(mockKey, airData, 30 * 60 * 1000); // 30분
          } else {
            // API 실패 시 목업 데이터 생성
            airData = generateMockAirQuality(lat, lng);
            saveMockDataToStorage(mockKey, airData, 5 * 60 * 1000); // 5분
          }
        }
        
        if (airData) {
          const quality = getAirQualityGrade(airData.pm25, airData.pm10, airData.ozone);
          const score = calculateAirQualityScore(airData.pm25, airData.pm10, airData.ozone);

          points.push({
            lat,
            lng,
            pm25: airData.pm25,
            pm10: airData.pm10,
            ozone: airData.ozone,
            temperature: airData.temperature,
            feelsLike: airData.feelsLike,
            quality,
            score,
          });
        }
      } catch (error) {
        console.warn(`공기질 데이터 수집 실패 (${lat}, ${lng}):`, error);
      }

      // API 호출 제한을 위한 딜레이
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return points;
};

// 단일 위치의 공기질 데이터
export const getAirQualityPoint = async (
  lat: number,
  lng: number
): Promise<AirQualityMapPoint | null> => {
  try {
    const airData = await getAirQualityData(lat, lng);
    if (!airData) return null;

    const quality = getAirQualityGrade(airData.pm25, airData.pm10, airData.ozone);
    const score = calculateAirQualityScore(airData.pm25, airData.pm10, airData.ozone);

    return {
      lat,
      lng,
      pm25: airData.pm25,
      pm10: airData.pm10,
      ozone: airData.ozone,
      temperature: airData.temperature,
      feelsLike: airData.feelsLike,
      quality,
      score,
    };
  } catch (error) {
    console.error('공기질 데이터 가져오기 실패:', error);
    return null;
  }
};

