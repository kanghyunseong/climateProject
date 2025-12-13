// 침수 예측 서비스 - 수문학/기상학 규칙 기반 예측
//
// 기상청 데이터와 수문학 모델을 활용한 침수 위험도 계산
// 서버/AI 없이 클라이언트에서 완전히 동작

// ============================================
// 인터페이스 정의
// ============================================

export interface FloodPredictionInput {
  lat: number;
  lng: number;
  precipitation: number; // 강수량 (mm)
  elevation: number; // 고도 (m)
  temperature: number; // 기온 (°C)
  humidity: number; // 습도 (%)
  windSpeed: number; // 풍속 (m/s)
  pressure?: number; // 기압 (hPa)
  soilMoisture?: number; // 토양 수분 (%, 0-100)
  drainageCapacity?: number; // 배수 용량 (mm/h)
  historicalData?: any;
}

export interface FloodPredictionOutput {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100 정밀 점수
  predictedFloodDepth: number; // 예상 침수 깊이 (m)
  confidence: number; // 신뢰도 (0-1)
  timeToFlood?: number; // 침수까지 예상 시간 (분)
  peakTime?: string; // 최대 침수 예상 시각
  affectedArea?: number; // 영향받는 면적 (m²)
  recommendations: string[]; // 권장사항
  analysisDetails: {
    precipitationFactor: number;
    elevationFactor: number;
    saturationFactor: number;
    drainageFactor: number;
  };
}

// ============================================
// 수문학 기반 침수 예측 알고리즘
// ============================================

// 침수 위험도 계산 (기상청 기준 + 수문학 모델)
function calculateFloodRisk(input: FloodPredictionInput): {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  predictedDepth: number;
  timeToFlood: number;
  factors: FloodPredictionOutput['analysisDetails'];
} {
  // 1. 강수량 팩터 (기상청 호우 기준)
  // - 약한 비: 3mm/h 미만
  // - 보통 비: 3-15mm/h
  // - 강한 비: 15-30mm/h
  // - 매우 강한 비: 30mm/h 이상
  // - 극한 호우: 50mm/h 이상
  let precipitationFactor = 0;
  if (input.precipitation >= 80) {
    precipitationFactor = 100; // 극한 상황
  } else if (input.precipitation >= 50) {
    precipitationFactor = 85;
  } else if (input.precipitation >= 30) {
    precipitationFactor = 70;
  } else if (input.precipitation >= 15) {
    precipitationFactor = 50;
  } else if (input.precipitation >= 5) {
    precipitationFactor = 25;
  } else {
    precipitationFactor = Math.max(0, input.precipitation * 5);
  }

  // 2. 고도 팩터 (저지대 위험도 증가)
  // 해발 10m 이하: 매우 위험
  // 해발 10-30m: 위험
  // 해발 30-100m: 보통
  // 해발 100m 이상: 낮음
  let elevationFactor = 0;
  if (input.elevation <= 5) {
    elevationFactor = 100;
  } else if (input.elevation <= 10) {
    elevationFactor = 85;
  } else if (input.elevation <= 30) {
    elevationFactor = 60;
  } else if (input.elevation <= 100) {
    elevationFactor = 30;
  } else {
    elevationFactor = Math.max(0, 20 - (input.elevation - 100) / 50);
  }

  // 3. 토양 포화도 팩터 (습도 + 토양 수분 기반)
  const soilMoisture = input.soilMoisture ?? (input.humidity * 0.8);
  let saturationFactor = 0;
  if (soilMoisture >= 90) {
    saturationFactor = 100; // 완전 포화
  } else if (soilMoisture >= 70) {
    saturationFactor = 70;
  } else if (soilMoisture >= 50) {
    saturationFactor = 40;
  } else {
    saturationFactor = soilMoisture * 0.5;
  }

  // 4. 배수 용량 팩터
  const drainageCapacity = input.drainageCapacity ?? 20; // 기본 20mm/h
  let drainageFactor = 0;
  if (input.precipitation > drainageCapacity * 2) {
    drainageFactor = 100; // 배수 용량 초과
  } else if (input.precipitation > drainageCapacity) {
    drainageFactor = 70;
  } else if (input.precipitation > drainageCapacity * 0.5) {
    drainageFactor = 40;
  } else {
    drainageFactor = 20;
  }

  // 종합 위험도 점수 (가중 평균)
  const weights = {
    precipitation: 0.40, // 강수량이 가장 중요
    elevation: 0.25,
    saturation: 0.20,
    drainage: 0.15,
  };

  const riskScore = Math.round(
    precipitationFactor * weights.precipitation +
    elevationFactor * weights.elevation +
    saturationFactor * weights.saturation +
    drainageFactor * weights.drainage
  );

  // 위험도 등급 결정
  let riskLevel: 'low' | 'medium' | 'high' | 'critical';
  if (riskScore >= 80) {
    riskLevel = 'critical';
  } else if (riskScore >= 60) {
    riskLevel = 'high';
  } else if (riskScore >= 40) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  // 예상 침수 깊이 계산 (간단한 수문학 모델)
  // 침수 깊이 = (강수량 - 배수용량) * 시간 / 면적 계수
  const excessRain = Math.max(0, input.precipitation - drainageCapacity);
  const depthFactor = (100 - input.elevation) / 100; // 고도가 낮을수록 깊음
  const predictedDepth = Math.min(3, (excessRain / 100) * (1 + depthFactor) * (saturationFactor / 50));

  // 침수까지 예상 시간 (분)
  let timeToFlood = 0;
  if (riskLevel === 'critical') {
    timeToFlood = 15;
  } else if (riskLevel === 'high') {
    timeToFlood = 30;
  } else if (riskLevel === 'medium') {
    timeToFlood = 60;
  } else {
    timeToFlood = 120;
  }

  return {
    riskLevel,
    riskScore,
    predictedDepth,
    timeToFlood,
    factors: {
      precipitationFactor,
      elevationFactor,
      saturationFactor,
      drainageFactor,
    },
  };
}

// 규칙 기반 권장사항 생성
function generateRecommendations(
  riskLevel: 'low' | 'medium' | 'high' | 'critical',
  input: FloodPredictionInput,
  factors: FloodPredictionOutput['analysisDetails']
): string[] {
  const recommendations: string[] = [];

  // 위험도별 기본 권장사항
  if (riskLevel === 'critical') {
    recommendations.push('즉시 대피하세요! 저지대와 하천 근처를 피하세요.');
    recommendations.push('119에 긴급 신고 준비를 하세요.');
    recommendations.push('전기 차단기를 내리고 가스 밸브를 잠그세요.');
  } else if (riskLevel === 'high') {
    recommendations.push('대피 경로를 확인하고 이동 준비를 하세요.');
    recommendations.push('재난 문자 알림을 확인하세요.');
    recommendations.push('차량은 고지대로 이동시키세요.');
  } else if (riskLevel === 'medium') {
    recommendations.push('외출을 자제하고 기상 상황을 주시하세요.');
    recommendations.push('비상 물품을 점검하세요.');
  } else {
    recommendations.push('현재 침수 위험이 낮습니다.');
    recommendations.push('기상 예보를 주기적으로 확인하세요.');
  }

  // 상황별 추가 권장사항
  if (factors.elevationFactor >= 70) {
    recommendations.push('저지대에 위치해 있어 침수에 취약합니다. 고지대 대피소 위치를 확인하세요.');
  }

  if (factors.saturationFactor >= 70) {
    recommendations.push('토양이 포화 상태입니다. 산사태 위험도 있으니 경사면을 주의하세요.');
  }

  if (input.precipitation >= 50 && factors.drainageFactor >= 70) {
    recommendations.push('배수 용량을 초과했습니다. 도로 침수와 맨홀 역류에 주의하세요.');
  }

  if (input.windSpeed >= 10) {
    recommendations.push('강풍이 동반되고 있습니다. 창문을 닫고 시설물을 점검하세요.');
  }

  return recommendations;
}

// ============================================
// 메인 API 함수
// ============================================

// 침수 예측 (규칙 기반)
export const predictFlood = async (
  input: FloodPredictionInput
): Promise<FloodPredictionOutput> => {
  // 1. 규칙 기반 침수 예측
  const coreResult = calculateFloodRisk(input);

  // 2. 권장사항 생성
  const recommendations = generateRecommendations(
    coreResult.riskLevel,
    input,
    coreResult.factors
  );

  // 3. 최대 침수 예상 시각 계산
  const peakTime = new Date(Date.now() + coreResult.timeToFlood * 60 * 1000)
    .toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  // 4. 신뢰도 계산 (데이터 완성도 기반)
  let confidence = 0.85; // 기본 신뢰도
  if (input.soilMoisture !== undefined) confidence += 0.05;
  if (input.drainageCapacity !== undefined) confidence += 0.05;
  if (input.pressure !== undefined) confidence += 0.03;
  confidence = Math.min(0.98, confidence);

  return {
    riskLevel: coreResult.riskLevel,
    riskScore: coreResult.riskScore,
    predictedFloodDepth: Math.round(coreResult.predictedDepth * 100) / 100,
    confidence,
    timeToFlood: coreResult.timeToFlood,
    peakTime,
    recommendations,
    analysisDetails: coreResult.factors,
  };
};

// 침수 예측 + AI 분석 (Groq API 사용)
export const predictFloodWithAI = async (
  input: FloodPredictionInput,
  enableAI: boolean = true
): Promise<FloodPredictionOutput & { aiAnalysis?: string }> => {
  // 1. 기본 규칙 기반 예측
  const baseResult = await predictFlood(input);

  // 2. AI 분석 추가 (옵션)
  if (enableAI) {
    try {
      const { analyzeFloodRisk, hasGroqApiKey } = await import('./aiAnalysis');

      if (hasGroqApiKey()) {
        const aiResult = await analyzeFloodRisk({
          precipitation: input.precipitation,
          elevation: input.elevation,
          humidity: input.humidity,
          temperature: input.temperature,
          windSpeed: input.windSpeed,
          riskScore: baseResult.riskScore,
        });

        if (aiResult.success) {
          return {
            ...baseResult,
            recommendations: aiResult.recommendations.length > 0
              ? aiResult.recommendations
              : baseResult.recommendations,
            aiAnalysis: aiResult.analysis,
            confidence: aiResult.confidence ?? baseResult.confidence,
          };
        }
      }
    } catch (error) {
      console.warn('AI 분석 실패, 규칙 기반 결과 사용:', error);
    }
  }

  return baseResult;
};

// 여러 위치에 대한 일괄 예측
export const predictFloodBatch = async (
  inputs: FloodPredictionInput[]
): Promise<FloodPredictionOutput[]> => {
  return Promise.all(inputs.map(input => predictFlood(input)));
};
