import type { MapType } from '../components/MapTypeSelector';

// 지도 타입별 타일 URL 설정 (모두 무료로 작동하는 타일 서버)
export const getMapTileUrl = (mapType: MapType): string => {
  switch (mapType) {
    case 'kakao':
      // OpenTopoMap (지형도 스타일, 한국 지역 잘 표시됨)
      return 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';

    case 'vworld':
      // CartoDB Positron (밝은 스타일, 한국 지역 잘 표시됨)
      return 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    case 'osm':
    default:
      // OpenStreetMap (기본, 가장 안정적)
      return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  }
};

// 지도 타입별 Attribution
export const getMapAttribution = (mapType: MapType): string => {
  switch (mapType) {
    case 'kakao':
      return '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    case 'vworld':
      return '&copy; <a href="https://carto.com/attributions">CARTO</a> | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    case 'osm':
    default:
      return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
  }
};

// 지도 타입별 서브도메인
export const getMapSubdomains = (mapType: MapType): string[] => {
  switch (mapType) {
    case 'osm':
      return ['a', 'b', 'c'];
    case 'vworld':
      return ['a', 'b', 'c', 'd'];
    case 'kakao':
      return ['a', 'b', 'c'];
    default:
      return ['a', 'b', 'c'];
  }
};

// 지도 타입별 최대 줌 레벨
export const getMaxZoom = (mapType: MapType): number => {
  switch (mapType) {
    case 'kakao':
      return 17; // OpenTopoMap 최대 줌
    case 'vworld':
    case 'osm':
    default:
      return 19;
  }
};
