// 기후 위험 종합 분석 서비스
// 모든 기후 데이터를 통합하여 종합 위험도를 계산하고 AI 기반 예측을 제공

import { getWFSData } from './climateApi';
import { getWeatherDataForLaunch, getAirQualityData } from './weatherApi';
import { predictFloodWithAI } from './floodPrediction';

export interface ClimateRiskScore {
  overall: number; // 종합 위험도 (0-100, 높을수록 위험)
  flood: number; // 침수 위험도
  landslide: number; // 산사태 위험도
  heatwave: number; // 폭염 위험도
  airQuality: number; // 대기질 위험도
  soil: number; // 토양 안정성 위험도
  vegetation: number; // 식생 상태 위험도
}

export interface RiskLevel {
  level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  label: string;
  color: string;
}

export interface ClimateRiskAnalysis {
  location: { lat: number; lng: number };
  timestamp: number;
  scores: ClimateRiskScore;
  riskLevel: RiskLevel;
  predictions: {
    next24h: ClimateRiskScore;
    next7d: ClimateRiskScore;
  };
  recommendations: string[];
  aiInsights: string;
  details: {
    flood: {
      risk: 'low' | 'medium' | 'high' | 'critical';
      factors: string[];
      nearbyFacilities: number;
    };
    landslide: {
      risk: 'low' | 'medium' | 'high' | 'critical';
      factors: string[];
      historyCount: number;
    };
    heatwave: {
      risk: 'low' | 'medium' | 'high' | 'critical';
      currentTemp: number;
      heatIndex: number;
      shelters: number;
    };
    airQuality: {
      risk: 'good' | 'moderate' | 'poor';
      pm25: number;
      pm10: number;
      ozone: number;
    };
    soil: {
      stability: number; // 0-100
      carbonStorage: number;
      erosionRisk: number;
    };
    vegetation: {
      coverage: number; // 0-100
      biodiversity: number;
      carbonAbsorption: number;
    };
  };
}

// 위험도 레벨 계산
const getRiskLevel = (score: number): RiskLevel => {
  if (score >= 80) {
    return { level: 'critical', label: '매우 위험', color: '#d32f2f' };
  } else if (score >= 60) {
    return { level: 'high', label: '위험', color: '#f57c00' };
  } else if (score >= 40) {
    return { level: 'medium', label: '보통', color: '#fbc02d' };
  } else if (score >= 20) {
    return { level: 'low', label: '낮음', color: '#388e3c' };
  } else {
    return { level: 'safe', label: '안전', color: '#1976d2' };
  }
};

// 침수 위험도 계산
const calculateFloodRisk = async (
  lat: number,
  lng: number
): Promise<{ score: number; risk: 'low' | 'medium' | 'high' | 'critical'; factors: string[]; facilities: number }> => {
  try {
    const weatherData = await getWeatherDataForLaunch(lat, lng);
    
    // AI 예측을 위한 입력 데이터 준비
    const aiPrediction = await predictFloodWithAI({
      lat,
      lng,
      precipitation: weatherData?.precipitation || 0,
      elevation: 50, // 기본값 (실제 고도 데이터는 별도 API 필요)
      temperature: weatherData?.temperature || 20,
      humidity: weatherData?.humidity || 60,
      windSpeed: weatherData?.windSpeed || 5,
      pressure: weatherData?.pressure || 1013,
    });

    let score = 0;
    const factors: string[] = [];
    let facilities = 0;

    // 침수 취약시설 확인
    const weakFacilities = await getWFSData({
      typeName: 'spggcee:flod_weak_fclt',
      bbox: `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`,
      maxFeatures: 10,
    });
    facilities = weakFacilities?.features?.length || 0;

    // 침수 흔적 확인
    const floodTrace = await getWFSData({
      typeName: 'spggcee:tm_fldn_trce',
      bbox: `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`,
      maxFeatures: 5,
    });
    if (floodTrace?.features && floodTrace.features.length > 0) {
      score += 30;
      factors.push('과거 침수 이력 존재');
    }

    // 하천 근접도
    const rivers = await getWFSData({
      typeName: 'spggcee:lsmd_cont_uj301_41',
      bbox: `${lat - 0.02},${lng - 0.02},${lat + 0.02},${lng + 0.02}`,
      maxFeatures: 5,
    });
    if (rivers?.features && rivers.features.length > 0) {
      score += 20;
      factors.push('소하천 인접');
    }

    // AI 예측 결과
    if (aiPrediction?.riskLevel === 'high' || aiPrediction?.riskLevel === 'critical') {
      score += 30;
      factors.push('AI 기반 높은 침수 위험 예측');
    }

    // 강수량 기반
    if (weatherData && weatherData.precipitation > 50) {
      score += 20;
      factors.push('강수량 높음');
    }

    // 취약시설 근접
    if (facilities > 0) {
      score += 20;
      factors.push(`${facilities}개 취약시설 근접`);
    }

    score = Math.min(100, score);

    let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (score >= 70) risk = 'critical';
    else if (score >= 50) risk = 'high';
    else if (score >= 30) risk = 'medium';

    return { score, risk, factors, facilities };
  } catch (error) {
    console.debug('침수 위험도 계산 실패:', error);
    return { score: 0, risk: 'low', factors: [], facilities: 0 };
  }
};

// 산사태 위험도 계산
const calculateLandslideRisk = async (
  lat: number,
  lng: number
): Promise<{ score: number; risk: 'low' | 'medium' | 'high' | 'critical'; factors: string[]; historyCount: number }> => {
  try {
    let score = 0;
    const factors: string[] = [];

    // 산사태 발생 이력
    const landslideHistory = await getWFSData({
      typeName: 'spggcee:ldsld_ocrn_prst',
      bbox: `${lat - 0.02},${lng - 0.02},${lat + 0.02},${lng + 0.02}`,
      maxFeatures: 10,
    });
    const historyCount = landslideHistory?.features?.length || 0;
    if (historyCount > 0) {
      score += Math.min(40, historyCount * 10);
      factors.push(`과거 산사태 발생 이력 ${historyCount}건`);
    }

    // 사방댐 존재 여부 (안전 시설)
    const debrisBarriers = await getWFSData({
      typeName: 'spggcee:debarr',
      bbox: `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`,
      maxFeatures: 5,
    });
    if (debrisBarriers?.features && debrisBarriers.features.length > 0) {
      score -= 20; // 안전 시설이 있으면 위험도 감소
      factors.push('사방댐 설치됨');
    }

    // 강수량 기반 (산사태는 강수량이 중요)
    const weatherData = await getWeatherDataForLaunch(lat, lng);
    if (weatherData && weatherData.precipitation > 30) {
      score += 30;
      factors.push('강수량 높음 (산사태 위험 증가)');
    }

    score = Math.max(0, Math.min(100, score));

    let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (score >= 70) risk = 'critical';
    else if (score >= 50) risk = 'high';
    else if (score >= 30) risk = 'medium';

    return { score, risk, factors, historyCount };
  } catch (error) {
    console.debug('산사태 위험도 계산 실패:', error);
    return { score: 0, risk: 'low', factors: [], historyCount: 0 };
  }
};

// 폭염 위험도 계산
const calculateHeatwaveRisk = async (
  lat: number,
  lng: number
): Promise<{ score: number; risk: 'low' | 'medium' | 'high' | 'critical'; currentTemp: number; heatIndex: number; shelters: number }> => {
  try {
    const weatherData = await getWeatherDataForLaunch(lat, lng);
    const temperature = weatherData?.temperature || 20;
    const humidity = weatherData?.humidity || 60;

    // 체감온도 계산 (Heat Index)
    const heatIndex = calculateHeatIndex(temperature, humidity);

    let score = 0;

    // 온도 기반
    if (temperature >= 35) {
      score += 40;
    } else if (temperature >= 30) {
      score += 25;
    } else if (temperature >= 25) {
      score += 10;
    }

    // 체감온도 기반
    if (heatIndex >= 40) {
      score += 30;
    } else if (heatIndex >= 35) {
      score += 20;
    } else if (heatIndex >= 30) {
      score += 10;
    }

    // 무더위쉼터 확인
    const sheltersData = await getWFSData({
      typeName: 'spggcee:swtr_rstar',
      bbox: `${lat - 0.05},${lng - 0.05},${lat + 0.05},${lng + 0.05}`,
      maxFeatures: 20,
    });
    const shelterCount = sheltersData?.features?.length || 0;
    if (shelterCount > 0) {
      score -= Math.min(20, shelterCount * 2); // 쉼터가 있으면 위험도 감소
    }

    score = Math.max(0, Math.min(100, score));

    let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (score >= 70) risk = 'critical';
    else if (score >= 50) risk = 'high';
    else if (score >= 30) risk = 'medium';

    return { score, risk, currentTemp: temperature, heatIndex, shelters: shelterCount };
  } catch (error) {
    console.debug('폭염 위험도 계산 실패:', error);
    return { score: 0, risk: 'low', currentTemp: 20, heatIndex: 20, shelters: 0 };
  }
};

// 체감온도 계산 (Heat Index)
const calculateHeatIndex = (temp: number, humidity: number): number => {
  // 간단한 체감온도 공식 (화씨 기준)
  const tF = (temp * 9) / 5 + 32;
  const h = humidity;

  const hi =
    -42.379 +
    2.04901523 * tF +
    10.14333127 * h -
    0.22475541 * tF * h -
    6.83783e-3 * tF * tF -
    5.481717e-2 * h * h +
    1.22874e-3 * tF * tF * h +
    8.5282e-4 * tF * h * h -
    1.99e-6 * tF * tF * h * h;

  // 섭씨로 변환
  return ((hi - 32) * 5) / 9;
};

// 대기질 위험도 계산
const calculateAirQualityRisk = async (
  lat: number,
  lng: number
): Promise<{ score: number; risk: 'good' | 'moderate' | 'poor'; pm25: number; pm10: number; ozone: number }> => {
  try {
    const airQuality = await getAirQualityData(lat, lng);
    
    if (!airQuality) {
      return { score: 0, risk: 'good', pm25: 0, pm10: 0, ozone: 0 };
    }

    const pm25 = airQuality.pm25 || 0;
    const pm10 = airQuality.pm10 || 0;
    const ozone = airQuality.ozone || 0;

    let score = 0;

    // PM2.5 기준 (μg/m³)
    if (pm25 >= 75) {
      score += 40;
    } else if (pm25 >= 50) {
      score += 25;
    } else if (pm25 >= 35) {
      score += 15;
    }

    // PM10 기준
    if (pm10 >= 150) {
      score += 30;
    } else if (pm10 >= 100) {
      score += 20;
    } else if (pm10 >= 80) {
      score += 10;
    }

    // 오존 기준
    if (ozone >= 0.12) {
      score += 30;
    } else if (ozone >= 0.09) {
      score += 20;
    }

    score = Math.min(100, score);

    let risk: 'good' | 'moderate' | 'poor' = 'good';
    if (score >= 50) risk = 'poor';
    else if (score >= 25) risk = 'moderate';

    return { score, risk, pm25, pm10, ozone };
  } catch (error) {
    console.debug('대기질 위험도 계산 실패:', error);
    return { score: 0, risk: 'good', pm25: 0, pm10: 0, ozone: 0 };
  }
};

// 토양 안정성 계산
const calculateSoilRisk = async (
  lat: number,
  lng: number
): Promise<{ stability: number; carbonStorage: number; erosionRisk: number }> => {
  try {
    // 토양 탄소 저장 확인
    const soilCarbon = await getWFSData({
      typeName: 'spggcee:soil_cbn_strgat',
      bbox: `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`,
      maxFeatures: 5,
    });

    let carbonStorage = 0;
    let stability = 50; // 기본값

    if (soilCarbon?.features && soilCarbon.features.length > 0) {
      const props = soilCarbon.features[0].properties || {};
      carbonStorage = parseFloat(props.carbon || props.탄소 || '0');
      stability = Math.min(100, 50 + carbonStorage / 10); // 탄소 저장량이 높을수록 안정적
    }

    // 토양 침식 위험 (식생 커버 기반 추정)
    const vegetation = await getWFSData({
      typeName: 'spggcee:vgmap',
      bbox: `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`,
      maxFeatures: 10,
    });

    const vegetationCount = vegetation?.features?.length || 0;
    const erosionRisk = Math.max(0, 100 - vegetationCount * 10); // 식생이 많을수록 침식 위험 낮음

    return { stability, carbonStorage, erosionRisk };
  } catch (error) {
    console.debug('토양 위험도 계산 실패:', error);
    return { stability: 50, carbonStorage: 0, erosionRisk: 50 };
  }
};

// 식생 상태 계산
const calculateVegetationRisk = async (
  lat: number,
  lng: number
): Promise<{ coverage: number; biodiversity: number; carbonAbsorption: number }> => {
  try {
    // 현존식생 확인
    const vegetation = await getWFSData({
      typeName: 'spggcee:vgmap',
      bbox: `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`,
      maxFeatures: 20,
    });

    const coverage = Math.min(100, (vegetation?.features?.length || 0) * 5); // 식생 피처 수 기반

    // 탄소 흡수 확인
    const carbonAbsorption = await getWFSData({
      typeName: 'spggcee:biotop_cbn_abpvl',
      bbox: `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`,
      maxFeatures: 5,
    });

    let carbonAbsorptionValue = 0;
    if (carbonAbsorption?.features && carbonAbsorption.features.length > 0) {
      const props = carbonAbsorption.features[0].properties || {};
      carbonAbsorptionValue = parseFloat(props.carbon || props.탄소 || '0');
    }

    // 생물 다양성 (비오톱 유형 기반)
    const biotop = await getWFSData({
      typeName: 'spggcee:biotop_lclsf',
      bbox: `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`,
      maxFeatures: 10,
    });

    const biodiversity = Math.min(100, (biotop?.features?.length || 0) * 10);

    return { coverage, biodiversity, carbonAbsorption: carbonAbsorptionValue };
  } catch (error) {
    console.debug('식생 위험도 계산 실패:', error);
    return { coverage: 0, biodiversity: 0, carbonAbsorption: 0 };
  }
};

// AI 기반 인사이트 생성
const generateAIInsights = (analysis: ClimateRiskAnalysis): string => {
  const { scores, details } = analysis;
  
  const insights: string[] = [];

  if (scores.overall >= 70) {
    insights.push('⚠️ 이 지역은 종합 위험도가 매우 높습니다. 즉시 대응이 필요합니다.');
  }

  if (details.flood.risk === 'high' || details.flood.risk === 'critical') {
    insights.push(`🌊 침수 위험이 높습니다. ${details.flood.factors.join(', ')}`);
  }

  if (details.landslide.risk === 'high' || details.landslide.risk === 'critical') {
    insights.push(`⛰️ 산사태 위험이 높습니다. 과거 발생 이력 ${details.landslide.historyCount}건`);
  }

  if (details.heatwave.risk === 'high' || details.heatwave.risk === 'critical') {
    insights.push(`🔥 폭염 위험이 높습니다. 체감온도 ${details.heatwave.heatIndex.toFixed(1)}°C`);
    if (details.heatwave.shelters > 0) {
      insights.push(`무더위쉼터 ${details.heatwave.shelters}개가 근처에 있습니다.`);
    }
  }

  if (details.airQuality.risk === 'poor') {
    insights.push(`💨 대기질이 나쁩니다. PM2.5: ${details.airQuality.pm25}μg/m³`);
  }

  if (details.vegetation.coverage < 30) {
    insights.push(`🌳 식생 커버가 낮습니다 (${details.vegetation.coverage}%). 녹지 확대를 권장합니다.`);
  }

  if (insights.length === 0) {
    insights.push('✅ 현재 이 지역은 대체로 안전한 상태입니다.');
  }

  return insights.join(' ');
};

// 권장사항 생성
const generateRecommendations = (analysis: ClimateRiskAnalysis): string[] => {
  const recommendations: string[] = [];
  const { details } = analysis;

  if (details.flood.risk === 'high' || details.flood.risk === 'critical') {
    recommendations.push('침수 대비 비상용품 준비');
    recommendations.push('지하실이나 저지대 사용 자제');
    recommendations.push('실시간 기상 정보 확인');
  }

  if (details.landslide.risk === 'high' || details.landslide.risk === 'critical') {
    recommendations.push('산사태 주의보 발령 시 대피 준비');
    recommendations.push('비가 많이 올 때는 외출 자제');
  }

  if (details.heatwave.risk === 'high' || details.heatwave.risk === 'critical') {
    recommendations.push('충분한 수분 섭취');
    recommendations.push('무더위쉼터 이용');
    recommendations.push('야외 활동 자제');
  }

  if (details.airQuality.risk === 'poor') {
    recommendations.push('외출 시 마스크 착용');
    recommendations.push('창문 닫기');
    recommendations.push('공기청정기 사용');
  }

  if (details.vegetation.coverage < 30) {
    recommendations.push('녹지 확대 계획 수립');
    recommendations.push('나무 심기 캠페인 참여');
  }

  if (recommendations.length === 0) {
    recommendations.push('현재 상태를 유지하세요');
  }

  return recommendations;
};

// 미래 위험도 예측 (간단한 선형 예측)
const predictFutureRisk = (currentScore: number, trend: number): number => {
  // trend: -1 (개선), 0 (유지), 1 (악화)
  const change = trend * 10; // 10점 변화
  return Math.max(0, Math.min(100, currentScore + change));
};

// 종합 기후 위험 분석
export const analyzeClimateRisk = async (
  lat: number,
  lng: number
): Promise<ClimateRiskAnalysis> => {
  console.log(`[기후 위험 분석] 시작: (${lat}, ${lng})`);

  // 모든 위험도 병렬 계산
  const [
    floodRisk,
    landslideRisk,
    heatwaveRisk,
    airQualityRisk,
    soilRisk,
    vegetationRisk,
  ] = await Promise.all([
    calculateFloodRisk(lat, lng),
    calculateLandslideRisk(lat, lng),
    calculateHeatwaveRisk(lat, lng),
    calculateAirQualityRisk(lat, lng),
    calculateSoilRisk(lat, lng),
    calculateVegetationRisk(lat, lng),
  ]);

  // 종합 점수 계산 (가중 평균)
  const overallScore = Math.round(
    floodRisk.score * 0.25 + // 침수 25%
    landslideRisk.score * 0.20 + // 산사태 20%
    heatwaveRisk.score * 0.20 + // 폭염 20%
    airQualityRisk.score * 0.15 + // 대기질 15%
    (100 - soilRisk.stability) * 0.10 + // 토양 (안정성 낮을수록 위험) 10%
    (100 - vegetationRisk.coverage) * 0.10 // 식생 (커버 낮을수록 위험) 10%
  );

  const scores: ClimateRiskScore = {
    overall: overallScore,
    flood: floodRisk.score,
    landslide: landslideRisk.score,
    heatwave: heatwaveRisk.score,
    airQuality: airQualityRisk.score,
    soil: 100 - soilRisk.stability,
    vegetation: 100 - vegetationRisk.coverage,
  };

  const riskLevel = getRiskLevel(overallScore);

  // 미래 예측 (간단한 추정)
  const predictions = {
    next24h: {
      overall: predictFutureRisk(overallScore, 0),
      flood: predictFutureRisk(floodRisk.score, 0),
      landslide: predictFutureRisk(landslideRisk.score, 0),
      heatwave: predictFutureRisk(heatwaveRisk.score, 0),
      airQuality: predictFutureRisk(airQualityRisk.score, 0),
      soil: predictFutureRisk(scores.soil, 0),
      vegetation: predictFutureRisk(scores.vegetation, 0),
    },
    next7d: {
      overall: predictFutureRisk(overallScore, 1), // 악화 추정
      flood: predictFutureRisk(floodRisk.score, 1),
      landslide: predictFutureRisk(landslideRisk.score, 1),
      heatwave: predictFutureRisk(heatwaveRisk.score, 1),
      airQuality: predictFutureRisk(airQualityRisk.score, 1),
      soil: predictFutureRisk(scores.soil, 0),
      vegetation: predictFutureRisk(scores.vegetation, -1), // 개선 추정
    },
  };

  const analysis: ClimateRiskAnalysis = {
    location: { lat, lng },
    timestamp: Date.now(),
    scores: {
      overall: overallScore,
      flood: floodRisk.score,
      landslide: landslideRisk.score,
      heatwave: heatwaveRisk.score,
      airQuality: airQualityRisk.score,
      soil: 100 - soilRisk.stability,
      vegetation: 100 - vegetationRisk.coverage,
    },
    riskLevel,
    predictions,
    recommendations: [],
    aiInsights: '',
    details: {
      flood: {
        risk: floodRisk.risk,
        factors: floodRisk.factors,
        nearbyFacilities: floodRisk.facilities,
      },
      landslide: {
        risk: landslideRisk.risk,
        factors: landslideRisk.factors,
        historyCount: landslideRisk.historyCount,
      },
      heatwave: {
        risk: heatwaveRisk.risk,
        currentTemp: heatwaveRisk.currentTemp,
        heatIndex: heatwaveRisk.heatIndex,
        shelters: heatwaveRisk.shelters,
      },
      airQuality: {
        risk: airQualityRisk.risk,
        pm25: airQualityRisk.pm25,
        pm10: airQualityRisk.pm10,
        ozone: airQualityRisk.ozone,
      },
      soil: {
        stability: soilRisk.stability,
        carbonStorage: soilRisk.carbonStorage,
        erosionRisk: soilRisk.erosionRisk,
      },
      vegetation: {
        coverage: vegetationRisk.coverage,
        biodiversity: vegetationRisk.biodiversity,
        carbonAbsorption: vegetationRisk.carbonAbsorption,
      },
    },
  };

  // AI 인사이트 및 권장사항 생성
  analysis.aiInsights = generateAIInsights(analysis);
  analysis.recommendations = generateRecommendations(analysis);

  console.log(`[기후 위험 분석] 완료: 종합 위험도 ${overallScore}점 (${riskLevel.label})`);

  return analysis;
};

