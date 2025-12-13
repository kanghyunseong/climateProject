import { API_CONFIG } from '../config/api';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

// 레이어 정보 인터페이스
export interface LayerInfo {
  name: string;
  title: string;
  abstract?: string;
  srs?: string[];
  bbox?: {
    minx: number;
    miny: number;
    maxx: number;
    maxy: number;
  };
}

// GetCapabilities로 실제 레이어 목록 가져오기
export const fetchAvailableLayers = async (): Promise<LayerInfo[]> => {
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

    const xmlText = await response.text();
    const jsonObj = parser.parse(xmlText);

    // WMS Capabilities XML 구조 파싱
    const layers: LayerInfo[] = [];
    
    try {
      const capability = jsonObj?.WMS_Capabilities?.Capability?.Layer?.Layer || [];
      const layerArray = Array.isArray(capability) ? capability : [capability];

      layerArray.forEach((layer: any) => {
        if (layer?.Name) {
          layers.push({
            name: layer.Name,
            title: layer.Title || layer.Name,
            abstract: layer.Abstract?.['#text'] || layer.Abstract,
            srs: Array.isArray(layer.CRS) ? layer.CRS : layer.CRS ? [layer.CRS] : [],
            bbox: layer.BoundingBox ? {
              minx: parseFloat(layer.BoundingBox['@_minx'] || layer.BoundingBox['@_minX'] || '0'),
              miny: parseFloat(layer.BoundingBox['@_miny'] || layer.BoundingBox['@_minY'] || '0'),
              maxx: parseFloat(layer.BoundingBox['@_maxx'] || layer.BoundingBox['@_maxX'] || '0'),
              maxy: parseFloat(layer.BoundingBox['@_maxy'] || layer.BoundingBox['@_maxY'] || '0'),
            } : undefined,
          });
        }
      });
    } catch (parseError) {
      console.warn('XML 파싱 오류, 기본 레이어 사용:', parseError);
      // 파싱 실패 시 기본 레이어 반환
      return getDefaultLayers();
    }

    return layers.length > 0 ? layers : getDefaultLayers();
  } catch (error) {
    console.error('레이어 목록 가져오기 실패:', error);
    // 에러 발생 시 기본 레이어 반환
    return getDefaultLayers();
  }
};

// 기본 레이어 목록 (API 호출 실패 시 사용)
export const getDefaultLayers = (): LayerInfo[] => {
  return [
    { name: 'spggcee:vgmap', title: '지도 데이터', abstract: '기본 지도 레이어' },
    { name: 'spggcee:temperature', title: '기온 데이터', abstract: '기온 정보 레이어' },
    { name: 'spggcee:precipitation', title: '강수량 데이터', abstract: '강수량 정보 레이어' },
    { name: 'spggcee:humidity', title: '습도 데이터', abstract: '습도 정보 레이어' },
    { name: 'spggcee:soil', title: '토양 데이터', abstract: '토양 정보 레이어' },
  ];
};

// 레이어 이름으로 레이어 정보 찾기
export const findLayerInfo = (layers: LayerInfo[], layerName: string): LayerInfo | undefined => {
  return layers.find(layer => layer.name === layerName);
};

