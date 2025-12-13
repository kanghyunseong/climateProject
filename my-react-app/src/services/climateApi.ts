import { API_CONFIG, WFS_LAYERS, CRS } from '../config/api';

// CORS 프록시 없이 직접 호출 (브라우저에서 직접 호출)
// API 서버가 CORS를 허용하는 경우에만 작동

// WMS 서비스 - 지도 이미지 가져오기
export interface WMSRequestParams {
  layers: string;
  bbox: string;
  width: number;
  height: number;
  format?: string;
  transparent?: boolean;
  crs?: string;
  styles?: string;
}

export const getWMSMap = (params: WMSRequestParams): string => {
  const {
    layers,
    bbox,
    width,
    height,
    format = 'image/png',
    transparent = true,
    crs = CRS.EPSG_3857,
    styles = '',
  } = params;

  const url = new URL(`${API_CONFIG.BASE_URL}/wms`);
  url.searchParams.set('apiKey', API_CONFIG.API_KEY);
  url.searchParams.set('SERVICE', 'WMS');
  url.searchParams.set('VERSION', '1.3.0');
  url.searchParams.set('REQUEST', 'GetMap');
  url.searchParams.set('LAYERS', layers);
  url.searchParams.set('STYLES', styles);
  url.searchParams.set('BBOX', bbox);
  url.searchParams.set('WIDTH', width.toString());
  url.searchParams.set('HEIGHT', height.toString());
  url.searchParams.set('FORMAT', format);
  url.searchParams.set('TRANSPARENT', transparent ? 'TRUE' : 'FALSE');
  url.searchParams.set('CRS', crs);
  url.searchParams.set('TILED', 'true');

  return url.toString();
};

// WFS 서비스 - 공간 데이터 가져오기
export interface WFSRequestParams {
  typeName: string;
  outputFormat?: string;
  bbox?: string;
  maxFeatures?: number;
  propertyName?: string;
}

export const getWFSData = async (params: WFSRequestParams) => {
  const {
    typeName,
    outputFormat = 'application/json',
    bbox,
    maxFeatures = 1000,
    propertyName,
  } = params;

  // typeName이 없으면 WFS를 지원하지 않는 레이어로 처리
  if (!typeName || typeName.trim() === '') {
    const error = new Error('WFS_NOT_SUPPORTED: No query specified');
    (error as any).layerName = 'unknown';
    throw error;
  }

  const url = new URL(`${API_CONFIG.BASE_URL}/wfs`);
  url.searchParams.set('apiKey', API_CONFIG.API_KEY);
  url.searchParams.set('service', 'WFS');
  url.searchParams.set('version', '1.1.0');
  url.searchParams.set('request', 'GetFeature');
  url.searchParams.set('typeName', typeName);
  url.searchParams.set('outputFormat', outputFormat);

  if (bbox) {
    url.searchParams.set('bbox', bbox);
  }
  if (maxFeatures) {
    url.searchParams.set('maxFeatures', maxFeatures.toString());
  }
  if (propertyName) {
    url.searchParams.set('propertyName', propertyName);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 응답 오류:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Content-Type 확인
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return data;
    } else if (contentType?.includes('text/xml') || contentType?.includes('application/xml')) {
      // XML 응답인 경우 JSON으로 변환 시도
      const text = await response.text();
      try {
        // XML을 파싱하여 JSON으로 변환
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const errorNode = xmlDoc.querySelector('Exception');
        if (errorNode) {
          const errorText = errorNode.textContent || 'Unknown error';
          // "unknown", "No query specified" 오류는 WFS를 지원하지 않는 레이어일 수 있음
          if (errorText.includes('unknown') || 
              errorText.includes('not found') ||
              errorText.includes('No query specified') ||
              errorText.includes('query')) {
            throw new Error(`WFS_NOT_SUPPORTED: ${errorText}`);
          }
          throw new Error(`API 오류: ${errorText}`);
        }
        // XML을 JSON으로 변환하는 로직 (간단한 변환)
        return { xml: text, needsParsing: true };
      } catch (parseError) {
        throw new Error(`XML 파싱 오류: ${parseError}`);
      }
    } else {
      const text = await response.text();
      return { raw: text };
    }
  } catch (error: any) {
    // WFS를 지원하지 않는 레이어인 경우 특별 처리
    if (error.message?.includes('WFS_NOT_SUPPORTED') || 
        error.message?.includes('No query specified')) {
      // WFS를 지원하지 않지만 WMS는 지원할 수 있음
      const layerError = new Error('WFS_NOT_SUPPORTED');
      (layerError as any).layerName = params.typeName || 'unknown';
      (layerError as any).originalError = error.message;
      throw layerError;
    }
    
    // "No query specified" 오류도 WFS_NOT_SUPPORTED로 처리
    if (error.message?.includes('No query specified')) {
      const layerError = new Error('WFS_NOT_SUPPORTED: No query specified');
      (layerError as any).layerName = params.typeName || 'unknown';
      throw layerError;
    }
    
    console.debug('WFS 데이터 가져오기 실패:', error);
    
    // CORS 오류인 경우 더 친화적인 메시지
    if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
      throw new Error('CORS 오류: 브라우저에서 직접 API 호출이 제한될 수 있습니다.');
    }
    
    throw error;
  }
};

// WMTS 서비스 - 타일 지도 URL 생성
export const getWMTSTileUrl = (layerName: string): string => {
  return `${API_CONFIG.WMTS_BASE_URL}?apiKey=${API_CONFIG.API_KEY}&url=/rest/${layerName}/EPSG:3857/{z}/{y}/{x}`;
};

// 특정 좌표의 기후 데이터 가져오기 (실제 API 호출)
export const getClimateDataAtPoint = async (
  lng: number,
  lat: number,
  layerName: string = WFS_LAYERS.VGMAP
) => {
  // 좌표 주변의 작은 bbox 생성 (EPSG:4326 형식: ymin,xmin,ymax,xmax)
  const buffer = 0.01;
  const bbox = `${lat - buffer},${lng - buffer},${lat + buffer},${lng + buffer}`;

  try {
    const data = await getWFSData({
      typeName: layerName,
      bbox,
      maxFeatures: 10,
    });
    return data;
  } catch (error: any) {
    if (error.message?.includes('WFS_NOT_SUPPORTED')) {
      console.debug(`[기후 데이터] ${layerName}: WMS만 지원 (래스터 레이어). 지도에는 표시되지만 상세 데이터는 제공되지 않습니다.`);
      return { 
        type: 'FeatureCollection', 
        features: [],
        wmsOnly: true,
        message: '이 레이어는 WMS만 지원합니다. 지도에는 표시되지만 상세 데이터는 제공되지 않습니다.'
      };
    }
    
    console.error(`[기후 데이터] ${layerName} 가져오기 실패:`, error.message || error);
    throw error;
  }
};

// 여러 레이어에서 동시에 데이터 가져오기
export const getMultipleLayerData = async (
  lng: number,
  lat: number,
  layerNames: string[]
) => {
  const buffer = 0.01;
  const bbox = `${lat - buffer},${lng - buffer},${lat + buffer},${lng + buffer}`;

  const promises = layerNames.map(layerName =>
    getWFSData({
      typeName: layerName,
      bbox,
      maxFeatures: 5,
    }).catch(error => {
      console.error(`레이어 ${layerName} 데이터 가져오기 실패:`, error);
      return null;
    })
  );

  const results = await Promise.allSettled(promises);
  return results.map((result, index) => ({
    layerName: layerNames[index],
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
};

// GetCapabilities 요청 - 사용 가능한 레이어 목록 가져오기 (XML)
export const getWMSLayersXML = async (): Promise<string> => {
  try {
    const url = new URL(`${API_CONFIG.BASE_URL}/wms`);
    url.searchParams.set('apiKey', API_CONFIG.API_KEY);
    url.searchParams.set('SERVICE', 'WMS');
    url.searchParams.set('VERSION', '1.3.0');
    url.searchParams.set('REQUEST', 'GetCapabilities');

    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return text;
  } catch (error) {
    console.error('레이어 목록 가져오기 실패:', error);
    throw error;
  }
};

// 히트맵 데이터 포인트 타입
export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  name?: string;
  properties?: Record<string, any>;
}

// 전체 레이어 데이터를 가져와서 히트맵 데이터로 변환
export const getHeatmapData = async (layerName: string): Promise<HeatmapPoint[]> => {
  try {
    // 경기도 전체 영역 bbox (EPSG:4326 형식: ymin,xmin,ymax,xmax)
    const gyeonggiBbox = '36.8,126.3,38.3,127.9';

    const data = await getWFSData({
      typeName: layerName,
      bbox: gyeonggiBbox,
      maxFeatures: 500, // 최대 500개 피처
    });

    if (!data || !data.features) {
      // 데이터가 없는 경우는 info 레벨로 변경 (경고가 아님)
      console.info(`[히트맵] ${layerName}: WFS는 지원하지만 현재 범위에 데이터가 없습니다.`);
      return [];
    }

    // GeoJSON 피처에서 히트맵 포인트 추출
    const points: HeatmapPoint[] = [];

    data.features.forEach((feature: any) => {
      if (feature.geometry && feature.geometry.coordinates) {
        const coords = feature.geometry.coordinates;
        const props = feature.properties || {};

        // 좌표 추출 (GeoJSON은 [lng, lat] 형식)
        let lat: number, lng: number;

        if (feature.geometry.type === 'Point') {
          lng = coords[0];
          lat = coords[1];
        } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          // 폴리곤의 중심점 계산
          const center = calculateCentroid(coords, feature.geometry.type);
          lng = center[0];
          lat = center[1];
        } else if (feature.geometry.type === 'LineString') {
          // 라인의 중간점
          const midIndex = Math.floor(coords.length / 2);
          lng = coords[midIndex][0];
          lat = coords[midIndex][1];
        } else {
          return; // 지원하지 않는 geometry 타입
        }

        // 강도 계산 (속성값 기반)
        const intensity = calculateIntensity(props);

        points.push({
          lat,
          lng,
          intensity,
          name: props.name || props.NAME || props.지역명 || `위치 ${points.length + 1}`,
          properties: props,
        });
      }
    });

    return points;
  } catch (error: any) {
    // WFS를 지원하지 않는 레이어인 경우 (WMS만 지원) - 정상적인 경우이므로 info 레벨
    if (error.message?.includes('WFS_NOT_SUPPORTED')) {
      // WFS를 지원하지 않는 레이어는 정상적인 경우이므로 경고 대신 info로 변경
      return [];
    }
    
    // 실제 에러인 경우에만 error 레벨로 로깅
    console.error(`[히트맵] ${layerName} 데이터 가져오기 실패:`, error.message || error);
    return [];
  }
};

// 폴리곤 중심점 계산
function calculateCentroid(coords: any, type: string): [number, number] {
  let allCoords: number[][] = [];

  if (type === 'Polygon') {
    allCoords = coords[0]; // 외부 링
  } else if (type === 'MultiPolygon') {
    coords.forEach((polygon: any) => {
      allCoords = allCoords.concat(polygon[0]);
    });
  }

  if (allCoords.length === 0) {
    return [127.0, 37.5]; // 기본 중심점
  }

  let sumLng = 0, sumLat = 0;
  allCoords.forEach((coord: number[]) => {
    sumLng += coord[0];
    sumLat += coord[1];
  });

  return [sumLng / allCoords.length, sumLat / allCoords.length];
}

// 속성값에서 강도 계산
function calculateIntensity(props: Record<string, any>): number {
  // 다양한 속성명으로 값 찾기
  const valueKeys = ['value', 'VALUE', '값', 'temp', 'temperature', 'precipitation', 'humidity'];

  for (const key of valueKeys) {
    if (props[key] !== undefined && typeof props[key] === 'number') {
      // 0-1 범위로 정규화 (임시로 0-100 범위 가정)
      return Math.min(1, Math.max(0, props[key] / 100));
    }
  }

  // 값이 없으면 랜덤 강도 (0.3-0.9 범위)
  return 0.3 + Math.random() * 0.6;
}

// 전체 레이어 목록과 데이터를 가져오기
export const getAllLayerData = async (): Promise<{ layerName: string; data: HeatmapPoint[] }[]> => {
  const layerNames = [
    WFS_LAYERS.VGMAP,
  ];

  const results = await Promise.all(
    layerNames.map(async (layerName) => {
      const data = await getHeatmapData(layerName);
      return { layerName, data };
    })
  );

  return results;
};

// 경기도 시군구별 데이터 가져오기
export const getRegionalData = async (): Promise<HeatmapPoint[]> => {
  try {
    const data = await getWFSData({
      typeName: WFS_LAYERS.VGMAP,
      maxFeatures: 100,
    });

    if (!data || !data.features) {
      return [];
    }

    return data.features.map((feature: any, index: number) => {
      const coords = feature.geometry?.coordinates;
      const props = feature.properties || {};

      let lat = 37.5, lng = 127.0;
      if (coords) {
        if (feature.geometry.type === 'Point') {
          lng = coords[0];
          lat = coords[1];
        } else {
          const center = calculateCentroid(coords, feature.geometry.type);
          lng = center[0];
          lat = center[1];
        }
      }

      return {
        lat,
        lng,
        intensity: calculateIntensity(props),
        name: props.name || props.NAME || `지역 ${index + 1}`,
        properties: props,
      };
    });
  } catch (error) {
    console.error('지역 데이터 가져오기 실패:', error);
    return [];
  }
};
