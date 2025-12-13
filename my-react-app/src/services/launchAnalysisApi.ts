// 우주선 발사 종합 분석 API 서비스
// 경기기후플랫폼의 모든 관련 레이어를 활용한 종합 분석

import { getWFSData } from './climateApi';
import { ALL_LAYERS } from '../config/layers';

// 발사 환경 종합 평가 인터페이스
export interface LaunchEnvironmentAnalysis {
  // 기상 조건
  weather: {
    windSpeed: number;
    windDirection: number;
    precipitation: number;
    cloudCover: number;
    temperature: number;
    humidity: number;
    crosswind: number;
  };
  
  // 위험도 평가
  risks: {
    floodRisk: 'low' | 'medium' | 'high'; // 침수 위험도
    landslideRisk: 'low' | 'medium' | 'high'; // 산사태 위험도
    heatRisk: 'low' | 'medium' | 'high'; // 폭염 위험도
    airQuality: 'good' | 'moderate' | 'poor'; // 대기질
  };
  
  // 환경 지표
  environment: {
    soilStability: number; // 토양 안정성 (0-100)
    vegetationCover: number; // 식생 피복도 (0-100)
    waterProximity: number; // 하천 근접도 (km)
    elevation: number; // 고도 (m)
  };
  
  // 종합 점수
  overallScore: number; // 0-100
  launchFeasibility: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
  
  // 상세 분석
  details: {
    weatherScore: number;
    riskScore: number;
    environmentScore: number;
    blockingFactors: string[]; // 발사 방해 요소
    recommendations: string[]; // 권장사항
  };
}

// 레이어 데이터 가져오기 헬퍼 함수 (에러 처리 및 재시도 포함)
const fetchLayerData = async (
  layerName: string,
  bbox: string,
  maxFeatures: number = 10
): Promise<any> => {
  // layerName이 없거나 빈 문자열이면 WFS를 지원하지 않는 레이어
  if (!layerName || layerName.trim() === '') {
    return null;
  }

  try {
    console.debug(`[레이어 데이터 수집] ${layerName} 요청 중...`);
    const data = await getWFSData({ 
      typeName: layerName, 
      bbox, 
      maxFeatures 
    });
    
    // 데이터 유효성 검사
    if (!data) {
      return null;
    }
    
    // GeoJSON 형식 확인
    if (data.features && Array.isArray(data.features)) {
      if (data.features.length > 0) {
        console.log(`[레이어 데이터 수집] ${layerName}: ${data.features.length}개 피처 발견`);
      }
      return data;
    }
    
    // 다른 형식의 응답 처리
    if (data.xml || data.raw) {
      return null;
    }
    
    return null;
  } catch (error: any) {
    // WFS를 지원하지 않는 레이어는 조용히 처리
    if (error?.message?.includes('WFS_NOT_SUPPORTED') || 
        error?.message?.includes('No query specified')) {
      return null;
    }
    console.debug(`[레이어 데이터 수집] ${layerName} 실패:`, error.message);
    return null;
  }
};

// 여러 레이어 시도 (첫 번째 성공한 것 반환)
const tryMultipleLayers = async (
  layers: typeof ALL_LAYERS,
  bbox: string,
  maxFeatures: number = 10
): Promise<any> => {
  // wfsName이 있는 레이어만 필터링
  const validLayers = layers.filter(layer => layer.wfsName && layer.wfsName.trim() !== '');
  
  for (const layer of validLayers) {
    const data = await fetchLayerData(layer.wfsName!, bbox, maxFeatures);
    if (data && data.features && data.features.length > 0) {
      console.log(`[레이어 데이터 수집] 성공: ${layer.name} (${layer.wfsName})`);
      return data;
    }
  }
  return null;
};

// 모든 관련 레이어에서 데이터 수집
export const collectLaunchEnvironmentData = async (
  lat: number,
  lng: number
): Promise<LaunchEnvironmentAnalysis> => {
  // EPSG:4326 형식: ymin,xmin,ymax,xmax
  const bbox = `${lat - 0.1},${lng - 0.1},${lat + 0.1},${lng + 0.1}`;
  
  console.log(`[발사 환경 분석] 시작 - 위치: (${lat}, ${lng}), bbox: ${bbox}`);
  
  // 1. 기상 데이터 (폭염/열환경 레이어)
  const weatherLayers = ALL_LAYERS.filter(l => 
    l.name.includes('폭염') || 
    l.name.includes('열환경') || 
    l.name.includes('체감온도') ||
    l.name.includes('기온') ||
    l.name.includes('온도')
  );
  
  // 2. 침수 위험도 (극한호우 레이어)
  const floodLayers = ALL_LAYERS.filter(l => 
    l.name.includes('침수') || 
    l.name.includes('호우') || 
    l.name.includes('홍수') ||
    l.name.includes('위험도')
  );
  
  // 3. 산사태 위험도
  const landslideLayers = ALL_LAYERS.filter(l => 
    l.name.includes('산사태')
  );
  
  // 4. 대기질 (대기조절 레이어)
  const airQualityLayers = ALL_LAYERS.filter(l => 
    l.name.includes('대기조절')
  );
  
  // 5. 토양 안정성
  const soilLayers = ALL_LAYERS.filter(l => 
    l.name.includes('토양') || 
    l.name.includes('침식')
  );
  
  // 6. 식생/환경
  const vegetationLayers = ALL_LAYERS.filter(l => 
    l.name.includes('식생') || 
    l.name.includes('비오톱') ||
    l.name.includes('현존식생')
  );
  
  // 7. 하천 정보
  const riverLayers = ALL_LAYERS.filter(l => 
    l.name.includes('하천') || 
    l.name.includes('소하천')
  );

  console.log(`[발사 환경 분석] 레이어 그룹: 기상(${weatherLayers.length}), 침수(${floodLayers.length}), 산사태(${landslideLayers.length}), 대기질(${airQualityLayers.length}), 토양(${soilLayers.length}), 식생(${vegetationLayers.length}), 하천(${riverLayers.length})`);

  // 병렬로 모든 데이터 수집 (여러 레이어 시도)
  const [
    weatherData,
    floodData,
    landslideData,
    airQualityData,
    soilData,
    vegetationData,
    riverData,
  ] = await Promise.allSettled([
    // 기상 데이터 - 여러 레이어 시도
    weatherLayers.length > 0 
      ? tryMultipleLayers(weatherLayers, bbox, 10)
      : Promise.resolve(null),
    
    // 침수 위험도 - 여러 레이어 시도
    floodLayers.length > 0
      ? tryMultipleLayers(floodLayers, bbox, 10)
      : Promise.resolve(null),
    
    // 산사태 위험도 - 여러 레이어 시도
    landslideLayers.length > 0
      ? tryMultipleLayers(landslideLayers, bbox, 10)
      : Promise.resolve(null),
    
    // 대기질 - 여러 레이어 시도
    airQualityLayers.length > 0
      ? tryMultipleLayers(airQualityLayers, bbox, 10)
      : Promise.resolve(null),
    
    // 토양 - 여러 레이어 시도
    soilLayers.length > 0
      ? tryMultipleLayers(soilLayers, bbox, 10)
      : Promise.resolve(null),
    
    // 식생 - 여러 레이어 시도
    vegetationLayers.length > 0
      ? tryMultipleLayers(vegetationLayers, bbox, 10)
      : Promise.resolve(null),
    
    // 하천 - 여러 레이어 시도
    riverLayers.length > 0
      ? tryMultipleLayers(riverLayers, bbox, 10)
      : Promise.resolve(null),
  ]);
  
  console.log(`[발사 환경 분석] 데이터 수집 완료`);

  // 데이터 파싱 및 분석
  const analysis = await analyzeCollectedData(
    weatherData,
    floodData,
    landslideData,
    airQualityData,
    soilData,
    vegetationData,
    riverData,
    lat,
    lng
  );

  console.log(`[발사 환경 분석] 분석 완료 - 종합 점수: ${analysis.overallScore.toFixed(0)}점`);
  return analysis;
};

// 수집된 데이터 분석
async function analyzeCollectedData(
  weatherData: PromiseSettledResult<any>,
  floodData: PromiseSettledResult<any>,
  landslideData: PromiseSettledResult<any>,
  airQualityData: PromiseSettledResult<any>,
  soilData: PromiseSettledResult<any>,
  vegetationData: PromiseSettledResult<any>,
  riverData: PromiseSettledResult<any>,
  lat: number,
  lng: number
): Promise<LaunchEnvironmentAnalysis> {
  // 실제 날씨 API에서 데이터 가져오기 시도
  let weather = {
    windSpeed: 5,
    windDirection: 0,
    precipitation: 0,
    cloudCover: 30,
    temperature: 20,
    humidity: 60,
    crosswind: 3,
  };

  // 실제 날씨 데이터 가져오기 시도
  try {
    const { getWeatherDataForLaunch } = await import('./weatherApi');
    const realWeatherData = await getWeatherDataForLaunch(lat, lng);
    if (realWeatherData) {
      weather = {
        windSpeed: realWeatherData.windSpeed || weather.windSpeed,
        windDirection: realWeatherData.windDirection || weather.windDirection,
        precipitation: realWeatherData.precipitation || weather.precipitation,
        cloudCover: realWeatherData.cloudCover || weather.cloudCover,
        temperature: realWeatherData.temperature || weather.temperature,
        humidity: realWeatherData.humidity || weather.humidity,
        crosswind: realWeatherData.crosswind || weather.crosswind,
      };
      console.log('[데이터 파싱] 실제 날씨 API 데이터 사용:', weather);
    }
  } catch (error) {
    console.debug('[데이터 파싱] 날씨 API 호출 실패, WFS 데이터 사용:', error);
  }

  // WFS 데이터가 있으면 우선 사용 (더 정확할 수 있음)
  // 하지만 실제 날씨 API 데이터가 있으면 그것을 우선 사용 (위치별로 다른 값)
  if (weatherData.status === 'fulfilled' && weatherData.value) {
    const data = weatherData.value;
    
    // features 배열이 있는 경우
    if (data.features && Array.isArray(data.features) && data.features.length > 0) {
      // 가장 가까운 feature 찾기 (여러 feature가 있을 수 있음)
      let closestFeature = data.features[0];
      let minDistance = Infinity;
      
      // 위치 기반으로 가장 가까운 feature 선택
      data.features.forEach((feature: any) => {
        if (feature.geometry?.coordinates) {
          const coords = feature.geometry.coordinates;
          let featureLat: number, featureLng: number;
          
          if (feature.geometry.type === 'Point') {
            featureLng = coords[0];
            featureLat = coords[1];
          } else {
            // 폴리곤의 경우 중심점 계산
            const center = calculateCentroid(coords, feature.geometry.type);
            featureLng = center[0];
            featureLat = center[1];
          }
          
          const distance = calculateDistance(lat, lng, featureLat, featureLng);
          if (distance < minDistance) {
            minDistance = distance;
            closestFeature = feature;
          }
        }
      });
      
      const props = closestFeature.properties || {};
      
      console.log(`[데이터 파싱] 기상 데이터 속성 (위치: ${lat.toFixed(4)}, ${lng.toFixed(4)}):`, Object.keys(props));
      console.log(`[데이터 파싱] 기상 데이터 속성 값:`, props);
      if (minDistance < Infinity) {
        console.log(`[데이터 파싱] 가장 가까운 feature 거리: ${minDistance.toFixed(2)}km`);
      }
      
      // WFS 데이터가 있으면 실제 값으로 덮어쓰기 (null이 아닌 경우에만)
      const wfsWindSpeed = extractNumericValue(props, ['windSpeed', '풍속', 'ws', 'wind_speed', 'WIND_SPEED', 'WSD'], null);
      const wfsTemperature = extractNumericValue(props, ['temperature', '기온', 'temp', '체감온도', 'TEMP', 'temp_c', 'T1H'], null);
      const wfsPrecipitation = extractNumericValue(props, ['precipitation', '강수량', 'rain', 'precip', 'PRECIP', 'RN1', 'PCP'], null);
      const wfsWindDirection = extractNumericValue(props, ['windDirection', '풍향', 'wd', 'wind_direction', 'WIND_DIR', 'VEC'], null);
      const wfsCloudCover = extractNumericValue(props, ['cloudCover', '구름량', 'cc', 'cloud_cover', 'CLOUD', 'SKY'], null);
      const wfsHumidity = extractNumericValue(props, ['humidity', '습도', 'rh', 'HUMIDITY', 'hum', 'REH'], null);
      const wfsCrosswind = extractNumericValue(props, ['crosswind', '횡풍', 'cross_wind', 'CROSSWIND'], null);
      
      // null이 아닌 경우에만 업데이트 (실제 데이터가 있을 때만)
      if (wfsWindSpeed !== null) weather.windSpeed = wfsWindSpeed;
      if (wfsTemperature !== null) weather.temperature = wfsTemperature;
      if (wfsPrecipitation !== null) weather.precipitation = wfsPrecipitation;
      if (wfsWindDirection !== null) weather.windDirection = wfsWindDirection;
      if (wfsCloudCover !== null) weather.cloudCover = wfsCloudCover;
      if (wfsHumidity !== null) weather.humidity = wfsHumidity;
      if (wfsCrosswind !== null) weather.crosswind = wfsCrosswind;
      
      console.log(`[데이터 파싱] WFS 기상 데이터 적용 (위치: ${lat.toFixed(4)}, ${lng.toFixed(4)}):`, weather);
    } else {
      console.debug(`[데이터 파싱] 기상 데이터: features가 없거나 비어있음 (위치: ${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }
  } else {
    console.debug(`[데이터 파싱] 기상 데이터: API 호출 실패 또는 데이터 없음 (위치: ${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  }

  // 침수 위험도 평가
  let floodRisk: 'low' | 'medium' | 'high' = 'low';
  if (floodData.status === 'fulfilled' && floodData.value?.features?.length > 0) {
    const feature = floodData.value.features[0];
    const props = feature.properties || {};
    
    console.log('[데이터 파싱] 침수 데이터 속성:', Object.keys(props));
    
    const riskValue = extractNumericValue(props, ['위험도', 'risk', 'danger', '순위', 'RANK', '위험도순위'], 0) ?? 0;
    const precipitation = extractNumericValue(props, ['강수량', 'precipitation', 'rain', 'PRECIP'], 0) ?? 0;
    
    if (riskValue > 70 || precipitation > 70) {
      floodRisk = 'high';
    } else if (riskValue > 40 || precipitation > 40) {
      floodRisk = 'medium';
    }
    
    console.log(`[데이터 파싱] 침수 위험도: ${floodRisk} (riskValue: ${riskValue}, precipitation: ${precipitation})`);
  } else {
    console.debug('[데이터 파싱] 침수 데이터: API 호출 실패 또는 데이터 없음 (기본값 사용)');
  }

  // 산사태 위험도 평가
  let landslideRisk: 'low' | 'medium' | 'high' = 'low';
  if (landslideData.status === 'fulfilled' && landslideData.value?.features?.length > 0) {
    const feature = landslideData.value.features[0];
    const props = feature.properties || {};
    
    console.log('[데이터 파싱] 산사태 데이터 속성:', Object.keys(props));
    
    const riskValue = extractNumericValue(props, ['위험등급', 'risk', 'danger', '등급', 'GRADE', '위험등급'], 0) ?? 0;
    
    if (riskValue >= 3) {
      landslideRisk = 'high';
    } else if (riskValue >= 2) {
      landslideRisk = 'medium';
    }
    
    console.log(`[데이터 파싱] 산사태 위험도: ${landslideRisk} (riskValue: ${riskValue})`);
  } else {
    console.debug('[데이터 파싱] 산사태 데이터: API 호출 실패 또는 데이터 없음 (기본값 사용)');
  }

  // 폭염 위험도 평가
  let heatRisk: 'low' | 'medium' | 'high' = 'low';
  if (weather.temperature > 35) {
    heatRisk = 'high';
  } else if (weather.temperature > 30) {
    heatRisk = 'medium';
  }

  // 대기질 평가
  let airQuality: 'good' | 'moderate' | 'poor' = 'good';
  if (airQualityData.status === 'fulfilled' && airQualityData.value?.features?.length > 0) {
    const feature = airQualityData.value.features[0];
    const props = feature.properties || {};
    
    console.log('[데이터 파싱] 대기질 데이터 속성:', Object.keys(props));
    
    const airValue = extractNumericValue(props, ['대기조절', 'air', 'value', 'AIR', 'air_quality'], 50) ?? 50;
    
    if (airValue < 30) {
      airQuality = 'poor';
    } else if (airValue < 60) {
      airQuality = 'moderate';
    }
    
    console.log(`[데이터 파싱] 대기질: ${airQuality} (airValue: ${airValue})`);
  } else {
    console.debug('[데이터 파싱] 대기질 데이터: API 호출 실패 또는 데이터 없음 (기본값 사용)');
  }

  // 토양 안정성
  let soilStability = 70; // 기본값
  if (soilData.status === 'fulfilled' && soilData.value?.features?.length > 0) {
    const feature = soilData.value.features[0];
    const props = feature.properties || {};
    
    console.log('[데이터 파싱] 토양 데이터 속성:', Object.keys(props));
    
    const erosion = extractNumericValue(props, ['침식', 'erosion', '위험도', 'EROSION', 'soil_erosion'], 0) ?? 0;
    soilStability = Math.max(0, 100 - erosion * 10);
    
    console.log(`[데이터 파싱] 토양 안정성: ${soilStability}점 (erosion: ${erosion})`);
  } else {
    console.debug('[데이터 파싱] 토양 데이터: API 호출 실패 또는 데이터 없음 (기본값 사용)');
  }

  // 식생 피복도
  let vegetationCover = 50; // 기본값
  if (vegetationData.status === 'fulfilled' && vegetationData.value?.features?.length > 0) {
    const feature = vegetationData.value.features[0];
    const props = feature.properties || {};
    
    console.log('[데이터 파싱] 식생 데이터 속성:', Object.keys(props));
    
    const cover = extractNumericValue(props, ['피복', 'cover', '값', 'COVER', 'vegetation'], 50) ?? 50;
    vegetationCover = Math.min(100, Math.max(0, cover));
    
    console.log(`[데이터 파싱] 식생 피복도: ${vegetationCover}%`);
  } else {
    console.debug('[데이터 파싱] 식생 데이터: API 호출 실패 또는 데이터 없음 (기본값 사용)');
  }

  // 하천 근접도 계산
  let waterProximity = 5; // 기본값 (km)
  if (riverData.status === 'fulfilled' && riverData.value?.features?.length > 0) {
    // 가장 가까운 하천까지의 거리 계산 (간단한 근사치)
    const features = riverData.value.features;
    let minDistance = Infinity;
    
    features.forEach((feature: any) => {
      if (feature.geometry?.coordinates) {
        const coords = feature.geometry.coordinates;
        let riverLat: number, riverLng: number;
        
        if (feature.geometry.type === 'Point') {
          riverLng = coords[0];
          riverLat = coords[1];
        } else {
          // 폴리곤의 경우 중심점 계산
          const center = calculateCentroid(coords, feature.geometry.type);
          riverLng = center[0];
          riverLat = center[1];
        }
        
        const distance = calculateDistance(lat, lng, riverLat, riverLng);
        minDistance = Math.min(minDistance, distance);
      }
    });
    
    if (minDistance < Infinity) {
      waterProximity = minDistance;
    }
  }

  // 고도 (기본값, 실제로는 고도 데이터가 필요)
  const elevation = 50;

  // 점수 계산
  const weatherScore = calculateWeatherScore(weather);
  const riskScore = calculateRiskScore(floodRisk, landslideRisk, heatRisk, airQuality);
  const environmentScore = calculateEnvironmentScore(soilStability, vegetationCover, waterProximity);

  // 종합 점수 (가중 평균)
  const overallScore = (
    weatherScore * 0.4 +
    riskScore * 0.35 +
    environmentScore * 0.25
  );

  // 발사 가능성 평가
  let launchFeasibility: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
  if (overallScore >= 85) {
    launchFeasibility = 'excellent';
  } else if (overallScore >= 70) {
    launchFeasibility = 'good';
  } else if (overallScore >= 55) {
    launchFeasibility = 'moderate';
  } else if (overallScore >= 40) {
    launchFeasibility = 'poor';
  } else {
    launchFeasibility = 'critical';
  }

  // 방해 요소 및 권장사항
  const blockingFactors: string[] = [];
  const recommendations: string[] = [];

  if (weather.precipitation > 0) {
    blockingFactors.push('강수 발생 중');
    recommendations.push('강수가 멈출 때까지 대기');
  }
  if (weather.windSpeed > 15) {
    blockingFactors.push('풍속이 너무 높음');
    recommendations.push('풍속이 15m/s 이하로 감소할 때까지 대기');
  }
  if (floodRisk === 'high') {
    blockingFactors.push('침수 위험도 높음');
    recommendations.push('침수 위험이 낮은 지역으로 이동 고려');
  }
  if (landslideRisk === 'high') {
    blockingFactors.push('산사태 위험도 높음');
    recommendations.push('산사태 위험이 낮은 지역으로 이동 고려');
  }
  if (heatRisk === 'high') {
    blockingFactors.push('폭염 경보');
    recommendations.push('장비 냉각 시스템 점검 필요');
  }
  if (airQuality === 'poor') {
    blockingFactors.push('대기질 불량');
    recommendations.push('대기질 개선 대기 또는 필터링 시스템 점검');
  }
  if (waterProximity < 1) {
    blockingFactors.push('하천과 너무 가까움');
    recommendations.push('하천으로부터 최소 1km 이상 떨어진 위치 권장');
  }

  if (blockingFactors.length === 0) {
    recommendations.push('현재 조건에서 발사 가능');
  }

  return {
    weather,
    risks: {
      floodRisk,
      landslideRisk,
      heatRisk,
      airQuality,
    },
    environment: {
      soilStability,
      vegetationCover,
      waterProximity,
      elevation,
    },
    overallScore,
    launchFeasibility,
    details: {
      weatherScore,
      riskScore,
      environmentScore,
      blockingFactors,
      recommendations,
    },
  };
}

// 기상 점수 계산 (0-100)
function calculateWeatherScore(weather: LaunchEnvironmentAnalysis['weather']): number {
  let score = 100;

  // 풍속 점수 (0-15 m/s가 이상적)
  if (weather.windSpeed < 0 || weather.windSpeed > 20) {
    score -= 40;
  } else if (weather.windSpeed > 15) {
    score -= 30;
  } else {
    const optimalSpeed = 7.5;
    const deviation = Math.abs(weather.windSpeed - optimalSpeed);
    score -= deviation * 2;
  }

  // 강수량 점수
  if (weather.precipitation > 0) {
    score -= 50; // 강수는 발사 불가
  }

  // 구름량 점수
  if (weather.cloudCover > 50) {
    score -= 20;
  } else {
    score -= (weather.cloudCover / 50) * 15;
  }

  // 횡풍 점수
  if (weather.crosswind > 10) {
    score -= 30;
  } else {
    score -= (weather.crosswind / 10) * 20;
  }

  // 온도 점수 (20-25°C가 이상적)
  if (weather.temperature < 0 || weather.temperature > 40) {
    score -= 25;
  } else {
    const optimalTemp = 22.5;
    const deviation = Math.abs(weather.temperature - optimalTemp);
    score -= deviation;
  }

  return Math.max(0, Math.min(100, score));
}

// 위험도 점수 계산 (0-100)
function calculateRiskScore(
  floodRisk: 'low' | 'medium' | 'high',
  landslideRisk: 'low' | 'medium' | 'high',
  heatRisk: 'low' | 'medium' | 'high',
  airQuality: 'good' | 'moderate' | 'poor'
): number {
  let score = 100;

  // 침수 위험도
  if (floodRisk === 'high') score -= 40;
  else if (floodRisk === 'medium') score -= 20;

  // 산사태 위험도
  if (landslideRisk === 'high') score -= 35;
  else if (landslideRisk === 'medium') score -= 15;

  // 폭염 위험도
  if (heatRisk === 'high') score -= 25;
  else if (heatRisk === 'medium') score -= 10;

  // 대기질
  if (airQuality === 'poor') score -= 20;
  else if (airQuality === 'moderate') score -= 10;

  return Math.max(0, Math.min(100, score));
}

// 환경 점수 계산 (0-100)
function calculateEnvironmentScore(
  soilStability: number,
  vegetationCover: number,
  waterProximity: number
): number {
  let score = 0;

  // 토양 안정성 (40%)
  score += soilStability * 0.4;

  // 식생 피복도 (30%) - 적절한 식생이 있으면 좋음
  score += Math.min(100, vegetationCover * 1.2) * 0.3;

  // 하천 근접도 (30%) - 너무 가까우면 감점
  if (waterProximity < 0.5) {
    score += 0;
  } else if (waterProximity < 1) {
    score += 30;
  } else if (waterProximity < 2) {
    score += 60;
  } else {
    score += 100;
  }
  score *= 0.3;

  return Math.max(0, Math.min(100, score));
}

// 두 지점 간 거리 계산 (km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 속성값에서 숫자 추출 헬퍼 함수
function extractNumericValue(
  props: Record<string, any>,
  keys: string[],
  defaultValue: number | null
): number | null {
  // 1. 우선순위: 정확한 키 이름 매칭
  for (const key of keys) {
    // 정확한 키 이름 매칭 (대소문자 구분 없음)
    const exactMatch = Object.keys(props).find(
      k => k.toLowerCase() === key.toLowerCase()
    );
    
    if (exactMatch !== undefined) {
      const value = props[exactMatch];
      if (value !== null && value !== undefined && value !== '') {
        const num = parseFloat(String(value));
        if (!isNaN(num) && isFinite(num)) {
          console.debug(`[속성 추출] 정확한 매칭: ${exactMatch} = ${num}`);
          return num;
        }
      }
    }
  }
  
  // 2. 부분 매칭 (키 이름에 포함된 경우)
  for (const key of keys) {
    const partialMatch = Object.keys(props).find(
      k => k.toLowerCase().includes(key.toLowerCase()) || 
           key.toLowerCase().includes(k.toLowerCase())
    );
    
    if (partialMatch !== undefined && partialMatch !== Object.keys(props).find(k => k.toLowerCase() === key.toLowerCase())) {
      const value = props[partialMatch];
      if (value !== null && value !== undefined && value !== '') {
        const num = parseFloat(String(value));
        if (!isNaN(num) && isFinite(num)) {
          console.debug(`[속성 추출] 부분 매칭: ${partialMatch} = ${num}`);
          return num;
        }
      }
    }
  }
  
  // 3. 모든 속성값 확인 (숫자형인 경우) - 하지만 이건 마지막 수단으로만 사용
  // 이 부분은 제거하거나 주석 처리하여 기본값을 반환하도록 함
  // 왜냐하면 첫 번째 숫자값을 반환하면 위치가 달라도 같은 값이 나올 수 있기 때문
  
  // 기본값 반환
  if (defaultValue !== null) {
    console.debug(`[속성 추출] 기본값 사용: ${defaultValue} (키: ${keys.join(', ')})`);
  }
  return defaultValue;
}

// 폴리곤 중심점 계산
function calculateCentroid(coords: any, type: string): [number, number] {
  let allCoords: number[][] = [];

  if (type === 'Polygon') {
    allCoords = coords[0];
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

// 48시간 발사 윈도우 예측 (종합 분석 기반)
export const predictLaunchWindows = async (
  lat: number,
  lng: number,
  criteria: {
    minWindSpeed: number;
    maxWindSpeed: number;
    maxPrecipitation: number;
    maxCloudCover: number;
    maxCrosswind: number;
    minOverallScore: number;
  }
): Promise<Array<{
  startTime: string;
  endTime: string;
  overallScore: number;
  launchFeasibility: string;
  analysis: LaunchEnvironmentAnalysis;
}>> => {
  const windows: Array<{
    startTime: string;
    endTime: string;
    overallScore: number;
    launchFeasibility: string;
    analysis: LaunchEnvironmentAnalysis;
  }> = [];

  const now = new Date();

  // 48시간 동안 2시간 간격으로 분석
  for (let hour = 0; hour < 48; hour += 2) {
    const windowTime = new Date(now.getTime() + hour * 60 * 60 * 1000);
    
    // 현재 시간대의 종합 분석 수행
    const analysis = await collectLaunchEnvironmentData(lat, lng);

    // 시간대별 변동 시뮬레이션 (실제로는 예보 데이터 필요)
    const timeVariation = Math.sin(hour / 12) * 0.1; // 시간에 따른 변동
    analysis.weather.windSpeed += timeVariation * 3;
    analysis.weather.precipitation = Math.random() < 0.15 ? Math.random() * 3 : 0;
    analysis.weather.cloudCover += timeVariation * 10;

    // 기준 충족 여부 확인
    const meetsCriteria = 
      analysis.weather.windSpeed >= criteria.minWindSpeed &&
      analysis.weather.windSpeed <= criteria.maxWindSpeed &&
      analysis.weather.precipitation <= criteria.maxPrecipitation &&
      analysis.weather.cloudCover <= criteria.maxCloudCover &&
      analysis.weather.crosswind <= criteria.maxCrosswind &&
      analysis.overallScore >= criteria.minOverallScore;

    if (meetsCriteria) {
      windows.push({
        startTime: windowTime.toISOString(),
        endTime: new Date(windowTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        overallScore: analysis.overallScore,
        launchFeasibility: analysis.launchFeasibility,
        analysis,
      });
    }
  }

  return windows.sort((a, b) => b.overallScore - a.overallScore);
};

