// 경기기후플랫폼 API 설정
export const API_CONFIG = {
  BASE_URL: 'https://climate.gg.go.kr/ols/api/geoserver',
  // 환경변수에서 API 키를 가져오거나 기본값 사용
  API_KEY: import.meta.env.VITE_API_KEY || '4c58df36-82b2-40b2-b360-6450cca44b1e',
  WMTS_BASE_URL: 'https://climate.gg.go.kr/ols/api/geoserver/wmts',
};

// 기상청 공공데이터 API 설정
export const KMA_API_CONFIG = {
  // 단기예보 API (초단기실황, 초단기예보, 단기예보)
  VILAGE_FCST_URL: 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0',
  // 환경변수에서 API 키를 가져오거나 기본값 사용 (data.go.kr에서 발급)
  SERVICE_KEY: import.meta.env.VITE_KMA_API_KEY || '',
};

// Groq AI API 설정 (무료)
// https://console.groq.com 에서 API 키 발급
export const GROQ_API_CONFIG = {
  BASE_URL: 'https://api.groq.com/openai/v1',
  API_KEY: import.meta.env.VITE_GROQ_API_KEY || '',
  MODEL: 'llama-3.1-8b-instant', // 빠르고 무료
};

// 카카오맵 API 설정
export const KAKAO_CONFIG = {
  API_KEY: '4f36996732dabcbdaf0cce3a834c006d',
  // 카카오맵 JavaScript API 스크립트 URL
  SCRIPT_URL: `https://dapi.kakao.com/v2/maps/sdk.js?appkey=4f36996732dabcbdaf0cce3a834c006d`,
};

// WMS 레이어 목록 (주요 레이어 예시)
export const WMS_LAYERS = {
  // 기후 관련 레이어
  TEMPERATURE: 'spggcee:temperature',
  PRECIPITATION: 'spggcee:precipitation',
  HUMIDITY: 'spggcee:humidity',
  // 토양 관련 레이어
  SOIL: 'spggcee:soil',
  // 기타 레이어
  VGMAP: 'spggcee:vgmap',
};

// WFS 레이어 목록
export const WFS_LAYERS = {
  VGMAP: 'spggcee:vgmap',
  // 추가 레이어들...
};

// 좌표계 설정
export const CRS = {
  EPSG_4326: 'EPSG:4326', // WGS84
  EPSG_3857: 'EPSG:3857', // Web Mercator
};

// 경기도 중심 좌표 (Leaflet은 [lat, lng] 형식)
export const GYEONGGI_CENTER: [number, number] = [37.5, 127.0];
export const GYEONGGI_BOUNDS: [[number, number], [number, number]] = [
  [36.8, 126.3], // 남서쪽 [lat, lng]
  [38.3, 127.9], // 북동쪽 [lat, lng]
];
