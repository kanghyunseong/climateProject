// Web Worker: 대량 데이터 처리
// 메인 스레드를 블로킹하지 않고 데이터 처리

export interface ProcessHeatmapDataMessage {
  type: 'processHeatmap';
  data: any[];
}

export interface ProcessForecastDataMessage {
  type: 'processForecast';
  data: any[];
}

export type WorkerMessage = ProcessHeatmapDataMessage | ProcessForecastDataMessage;

// 히트맵 데이터 처리
function processHeatmapData(features: any[]): any[] {
  return features.map((feature, index) => {
    if (!feature.geometry || !feature.geometry.coordinates) {
      return null;
    }

    const coords = feature.geometry.coordinates;
    const props = feature.properties || {};

    // 좌표 추출
    let lat: number, lng: number;

    if (feature.geometry.type === 'Point') {
      lng = coords[0];
      lat = coords[1];
    } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      // 폴리곤 중심점 계산
      const flatCoords = feature.geometry.type === 'Polygon' ? coords[0] : coords[0][0];
      if (flatCoords?.length > 0) {
        const sumLat = flatCoords.reduce((sum: number, c: number[]) => sum + c[1], 0);
        const sumLng = flatCoords.reduce((sum: number, c: number[]) => sum + c[0], 0);
        lat = sumLat / flatCoords.length;
        lng = sumLng / flatCoords.length;
      } else {
        return null;
      }
    } else {
      return null;
    }

    // 강도 계산
    const intensity = Math.min(1, Math.max(0, 
      (parseFloat(props.value || props.값 || '0.5') || 0.5)
    ));

    return {
      lat,
      lng,
      intensity,
      name: props.name || props.NAME || `위치 ${index + 1}`,
      properties: props,
    };
  }).filter(Boolean);
}

// 예보 데이터 처리
function processForecastData(forecasts: any[]): any[] {
  return forecasts.map((forecast) => {
    const conditions = forecast.conditions || {};
    
    return {
      time: forecast.time,
      conditions: {
        windSpeed: parseFloat(conditions.windSpeed) || 5,
        windDirection: parseFloat(conditions.windDirection) || 0,
        precipitation: parseFloat(conditions.precipitation) || 0,
        cloudCover: parseFloat(conditions.cloudCover) || 30,
        temperature: parseFloat(conditions.temperature) || 20,
        humidity: parseFloat(conditions.humidity) || 60,
        pressure: parseFloat(conditions.pressure) || 1013,
        crosswind: parseFloat(conditions.crosswind) || 3,
      },
    };
  });
}

// Worker 메시지 핸들러
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;

  try {
    let result: any;

    switch (type) {
      case 'processHeatmap':
        result = processHeatmapData(data);
        break;
      case 'processForecast':
        result = processForecastData(data);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }

    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

