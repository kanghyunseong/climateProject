// Web Worker 서비스 래퍼
// Worker 생성 및 메시지 통신 관리

let heatmapWorker: Worker | null = null;
let forecastWorker: Worker | null = null;

// Worker 초기화
const initWorker = (): Worker | null => {
  try {
    // Vite 환경에서 Worker 로드
    return new Worker(
      new URL('../workers/dataProcessor.worker.ts', import.meta.url),
      { type: 'module' }
    );
  } catch (error) {
    console.warn('Web Worker 초기화 실패:', error);
    return null;
  }
};

// 히트맵 데이터 처리 (Worker 사용)
export const processHeatmapDataWithWorker = (
  features: any[]
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!heatmapWorker) {
      heatmapWorker = initWorker();
      if (!heatmapWorker) {
        // Worker를 사용할 수 없으면 동기 처리
        resolve(processHeatmapDataSync(features));
        return;
      }
    }

    const timeout = setTimeout(() => {
      reject(new Error('Worker 처리 시간 초과'));
    }, 30000); // 30초 타임아웃

    heatmapWorker.onmessage = (event) => {
      clearTimeout(timeout);
      if (event.data.success) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error));
      }
    };

    heatmapWorker.onerror = (error) => {
      clearTimeout(timeout);
      console.warn('Worker 오류, 동기 처리로 폴백:', error);
      resolve(processHeatmapDataSync(features));
    };

    heatmapWorker.postMessage({
      type: 'processHeatmap',
      data: features,
    });
  });
};

// 예보 데이터 처리 (Worker 사용)
export const processForecastDataWithWorker = (
  forecasts: any[]
): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    if (!forecastWorker) {
      forecastWorker = initWorker();
      if (!forecastWorker) {
        resolve(processForecastDataSync(forecasts));
        return;
      }
    }

    const timeout = setTimeout(() => {
      reject(new Error('Worker 처리 시간 초과'));
    }, 30000);

    forecastWorker.onmessage = (event) => {
      clearTimeout(timeout);
      if (event.data.success) {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.error));
      }
    };

    forecastWorker.onerror = (error) => {
      clearTimeout(timeout);
      console.warn('Worker 오류, 동기 처리로 폴백:', error);
      resolve(processForecastDataSync(forecasts));
    };

    forecastWorker.postMessage({
      type: 'processForecast',
      data: forecasts,
    });
  });
};

// 동기 처리 (폴백)
function processHeatmapDataSync(features: any[]): any[] {
  return features.map((feature, index) => {
    if (!feature.geometry || !feature.geometry.coordinates) {
      return null;
    }

    const coords = feature.geometry.coordinates;
    const props = feature.properties || {};

    let lat: number, lng: number;

    if (feature.geometry.type === 'Point') {
      lng = coords[0];
      lat = coords[1];
    } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
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

function processForecastDataSync(forecasts: any[]): any[] {
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

// Worker 정리
export const cleanupWorkers = (): void => {
  if (heatmapWorker) {
    heatmapWorker.terminate();
    heatmapWorker = null;
  }
  if (forecastWorker) {
    forecastWorker.terminate();
    forecastWorker = null;
  }
};

