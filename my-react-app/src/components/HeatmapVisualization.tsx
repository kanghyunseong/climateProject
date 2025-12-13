// 히트맵 데이터 유틸리티 함수
// 실제 히트맵 시각화는 ClimateMap 컴포넌트의 CircleMarker로 구현됨

export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  intensity: number;
}

// GeoJSON 데이터에서 히트맵 포인트 추출
export function getHeatmapDataFromFeatures(data: any): HeatmapDataPoint[] {
  if (!data || !data.features) {
    return [];
  }

  const points: HeatmapDataPoint[] = [];
  
  data.features.forEach((feature: any) => {
    if (feature.geometry && feature.geometry.coordinates) {
      const coords = feature.geometry.coordinates;
      if (Array.isArray(coords[0])) {
        coords.forEach((coord: number[]) => {
          points.push({
            lng: coord[0],
            lat: coord[1],
            intensity: 1,
          });
        });
      } else {
        points.push({
          lng: coords[0],
          lat: coords[1],
          intensity: 1,
        });
      }
    }
  });

  return points;
}

// 샘플 히트맵 데이터 생성 (경기도 주요 지역)
export function getSampleHeatmapData(): HeatmapDataPoint[] {
  return [
    { lat: 37.2636, lng: 127.0286, intensity: 0.8 }, // 수원시
    { lat: 37.4201, lng: 127.1266, intensity: 0.9 }, // 성남시
    { lat: 37.6584, lng: 126.8320, intensity: 0.7 }, // 고양시
    { lat: 37.2411, lng: 127.1776, intensity: 0.6 }, // 용인시
    { lat: 37.5034, lng: 126.7660, intensity: 0.85 }, // 부천시
    { lat: 37.3219, lng: 126.8309, intensity: 0.75 }, // 안산시
    { lat: 37.3925, lng: 126.9269, intensity: 0.65 }, // 안양시
    { lat: 36.9908, lng: 127.0856, intensity: 0.7 }, // 평택시
    { lat: 37.3800, lng: 126.8029, intensity: 0.6 }, // 시흥시
    { lat: 37.6153, lng: 126.7158, intensity: 0.55 }, // 김포시
  ];
}
