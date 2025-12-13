// AI 분석 서비스 - Groq API (무료)
// 침수 위험, 날씨 영향, 발사 윈도우, 대기질 건강 분석

import { GROQ_API_CONFIG } from '../config/api';

// ============================================
// 타입 정의
// ============================================

export interface AIAnalysisResult {
  success: boolean;
  analysis: string;
  recommendations: string[];
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  confidence?: number;
  error?: string;
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// ============================================
// Groq API 호출 함수 (Rate Limit 처리 포함)
// ============================================

// API 호출 캐시 (같은 입력에 대해 5분간 캐시)
const apiCache = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5분

// 마지막 호출 시간 추적 (호출 빈도 제한)
let lastCallTime = 0;
const MIN_CALL_INTERVAL = 2000; // 최소 2초 간격

async function callGroqAPI(
  messages: GroqMessage[],
  retryCount: number = 0,
  maxRetries: number = 2
): Promise<string | null> {
  if (!GROQ_API_CONFIG.API_KEY) {
    console.warn('Groq API 키가 설정되지 않았습니다. VITE_GROQ_API_KEY 환경변수를 설정해주세요.');
    return null;
  }

  // 캐시 키 생성 (메시지 내용 기반)
  const cacheKey = JSON.stringify(messages);
  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.debug('[Groq API] 캐시에서 결과 반환');
    return cached.result;
  }

  // 호출 빈도 제한 (최소 2초 간격)
  const now = Date.now();
  const timeSinceLastCall = now - lastCallTime;
  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    const waitTime = MIN_CALL_INTERVAL - timeSinceLastCall;
    console.debug(`[Groq API] 호출 빈도 제한: ${waitTime}ms 대기`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastCallTime = Date.now();

  try {
    const response = await fetch(`${GROQ_API_CONFIG.BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_CONFIG.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_API_CONFIG.MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 512, // 토큰 수 감소 (rate limit 완화)
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = null;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // JSON 파싱 실패 시 텍스트 그대로 사용
      }

      // 429 Rate Limit 에러 처리
      if (response.status === 429) {
        if (errorData?.error?.code === 'rate_limit_exceeded') {
          const retryAfterMatch = errorData.error.message?.match(/try again in ([\d.]+)s/);
          const retryAfter = retryAfterMatch?.[1];
          const waitTime = retryAfter ? parseFloat(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;
          
          if (retryCount < maxRetries) {
            console.warn(`[Groq API] Rate limit 도달. ${waitTime}ms 후 재시도... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return callGroqAPI(messages, retryCount + 1, maxRetries);
          } else {
            console.warn('[Groq API] Rate limit: 최대 재시도 횟수 초과. 기본 방법을 사용합니다.');
            return null; // 재시도 실패 시 null 반환하여 fallback 사용
          }
        }
      }

      // 다른 에러는 로그만 남기고 null 반환
      console.debug('Groq API 오류:', errorText);
      return null;
    }

    const data: GroqResponse = await response.json();
    const result = data.choices[0]?.message?.content || null;
    
    // 성공한 결과를 캐시에 저장
    if (result) {
      apiCache.set(cacheKey, { result, timestamp: Date.now() });
      
      // 캐시 크기 제한 (최대 50개)
      if (apiCache.size > 50) {
        const firstKey = apiCache.keys().next().value;
        if (firstKey !== undefined) {
          apiCache.delete(firstKey);
        }
      }
    }
    
    return result;
  } catch (error) {
    console.debug('Groq API 호출 실패:', error);
    return null;
  }
}

// JSON 파싱 헬퍼
function parseJSONResponse(text: string): any {
  try {
    // JSON 블록 추출 시도
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                      text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr);
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// 1. 침수 위험 AI 분석
// ============================================

export interface FloodAnalysisInput {
  precipitation: number; // 강수량 (mm)
  elevation: number; // 고도 (m)
  humidity: number; // 습도 (%)
  temperature: number; // 기온 (°C)
  windSpeed: number; // 풍속 (m/s)
  riskScore: number; // 기존 규칙 기반 점수
  location?: string; // 지역명
}

export async function analyzeFloodRisk(input: FloodAnalysisInput): Promise<AIAnalysisResult> {
  const systemPrompt = `당신은 재난 안전 전문가입니다. 기상 데이터를 분석하여 침수 위험을 평가하고 구체적인 대응 방안을 제시해주세요.
응답은 반드시 다음 JSON 형식으로만 해주세요:
{
  "analysis": "상황 분석 (2-3문장)",
  "riskLevel": "low|medium|high|critical",
  "recommendations": ["권장사항1", "권장사항2", "권장사항3"],
  "confidence": 0.0-1.0
}`;

  const userPrompt = `현재 기상 상황:
- 강수량: ${input.precipitation}mm/h
- 고도: ${input.elevation}m
- 습도: ${input.humidity}%
- 기온: ${input.temperature}°C
- 풍속: ${input.windSpeed}m/s
- 기존 위험도 점수: ${input.riskScore}/100
${input.location ? `- 위치: ${input.location}` : ''}

이 상황에서의 침수 위험을 분석해주세요.`;

  const response = await callGroqAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  if (!response) {
    return {
      success: false,
      analysis: '기상 데이터 기반 규칙 분석을 사용합니다.',
      recommendations: getDefaultFloodRecommendations(input.riskScore),
      error: 'AI 분석을 사용할 수 없습니다.',
    };
  }

  const parsed = parseJSONResponse(response);
  if (parsed) {
    return {
      success: true,
      analysis: parsed.analysis || response,
      recommendations: parsed.recommendations || [],
      riskLevel: parsed.riskLevel,
      confidence: parsed.confidence,
    };
  }

  return {
    success: true,
    analysis: response,
    recommendations: [],
  };
}

function getDefaultFloodRecommendations(riskScore: number): string[] {
  if (riskScore >= 80) {
    return ['즉시 대피하세요', '119에 신고 준비', '전기/가스 차단'];
  } else if (riskScore >= 60) {
    return ['대피 경로 확인', '재난 문자 확인', '차량 고지대 이동'];
  } else if (riskScore >= 40) {
    return ['외출 자제', '비상 물품 점검', '기상 상황 주시'];
  }
  return ['현재 안전', '기상 예보 확인'];
}

// ============================================
// 2. 날씨 영향 AI 분석
// ============================================

export interface WeatherImpactInput {
  temperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  cloudCover: number;
  activity?: string; // 계획된 활동 (예: 등산, 캠핑, 야외운동)
}

export async function analyzeWeatherImpact(input: WeatherImpactInput): Promise<AIAnalysisResult> {
  const systemPrompt = `당신은 기상 분석 전문가입니다. 현재 날씨가 일상 활동에 미치는 영향을 분석해주세요.
응답은 반드시 다음 JSON 형식으로만 해주세요:
{
  "analysis": "날씨 영향 분석 (2-3문장)",
  "suitableActivities": ["적합한 활동1", "적합한 활동2"],
  "unsuitableActivities": ["부적합한 활동1", "부적합한 활동2"],
  "recommendations": ["조언1", "조언2", "조언3"],
  "overallRating": "excellent|good|fair|poor"
}`;

  const userPrompt = `현재 날씨:
- 기온: ${input.temperature}°C
- 습도: ${input.humidity}%
- 풍속: ${input.windSpeed}m/s
- 강수량: ${input.precipitation}mm
- 구름량: ${input.cloudCover}%
${input.activity ? `- 계획된 활동: ${input.activity}` : ''}

이 날씨가 야외 활동에 미치는 영향을 분석해주세요.`;

  const response = await callGroqAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  if (!response) {
    return {
      success: false,
      analysis: getDefaultWeatherAnalysis(input),
      recommendations: getDefaultWeatherRecommendations(input),
      error: 'AI 분석을 사용할 수 없습니다.',
    };
  }

  const parsed = parseJSONResponse(response);
  if (parsed) {
    return {
      success: true,
      analysis: parsed.analysis || response,
      recommendations: parsed.recommendations || [],
    };
  }

  return {
    success: true,
    analysis: response,
    recommendations: [],
  };
}

function getDefaultWeatherAnalysis(input: WeatherImpactInput): string {
  const conditions: string[] = [];
  if (input.temperature > 30) conditions.push('고온');
  if (input.temperature < 5) conditions.push('저온');
  if (input.precipitation > 0) conditions.push('강수');
  if (input.windSpeed > 10) conditions.push('강풍');

  if (conditions.length === 0) return '야외 활동에 적합한 날씨입니다.';
  return `${conditions.join(', ')} 조건으로 야외 활동 시 주의가 필요합니다.`;
}

function getDefaultWeatherRecommendations(input: WeatherImpactInput): string[] {
  const recs: string[] = [];
  if (input.temperature > 30) recs.push('충분한 수분 섭취', '그늘에서 휴식');
  if (input.temperature < 5) recs.push('방한복 착용', '체온 유지');
  if (input.precipitation > 0) recs.push('우산/우비 준비');
  if (input.windSpeed > 10) recs.push('강풍 주의');
  if (recs.length === 0) recs.push('좋은 날씨를 즐기세요!');
  return recs;
}

// ============================================
// 3. 발사 윈도우 AI 분석
// ============================================

export interface LaunchWindowInput {
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  temperature: number;
  humidity: number;
  pressure?: number;
  crosswind?: number;
  visibility?: number;
}

export async function analyzeLaunchWindow(input: LaunchWindowInput): Promise<AIAnalysisResult> {
  const systemPrompt = `당신은 항공우주 기상 전문가입니다. 로켓/드론 발사에 적합한 기상 조건인지 분석해주세요.
발사 기준:
- 풍속: 10m/s 이하 권장, 15m/s 이상 위험
- 횡풍: 7m/s 이하 권장
- 강수: 0mm 필수
- 구름량: 50% 이하 권장
- 가시거리: 5km 이상 필수

응답은 반드시 다음 JSON 형식으로만 해주세요:
{
  "analysis": "발사 조건 분석 (2-3문장)",
  "launchStatus": "GO|CAUTION|NO-GO",
  "criticalFactors": ["주요 위험 요소1", "주요 위험 요소2"],
  "recommendations": ["권장사항1", "권장사항2"],
  "confidence": 0.0-1.0
}`;

  const userPrompt = `현재 기상 조건:
- 풍속: ${input.windSpeed}m/s
- 풍향: ${input.windDirection}°
- 강수량: ${input.precipitation}mm
- 구름량: ${input.cloudCover}%
- 기온: ${input.temperature}°C
- 습도: ${input.humidity}%
${input.pressure ? `- 기압: ${input.pressure}hPa` : ''}
${input.crosswind ? `- 횡풍: ${input.crosswind}m/s` : ''}
${input.visibility ? `- 가시거리: ${input.visibility}km` : ''}

발사 가능 여부를 분석해주세요.`;

  const response = await callGroqAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  if (!response) {
    return {
      success: false,
      analysis: getDefaultLaunchAnalysis(input),
      recommendations: getDefaultLaunchRecommendations(input),
      riskLevel: getLaunchRiskLevel(input),
      error: 'AI 분석을 사용할 수 없습니다.',
    };
  }

  const parsed = parseJSONResponse(response);
  if (parsed) {
    const riskLevel = parsed.launchStatus === 'GO' ? 'low' :
                      parsed.launchStatus === 'CAUTION' ? 'medium' : 'high';
    return {
      success: true,
      analysis: parsed.analysis || response,
      recommendations: parsed.recommendations || [],
      riskLevel,
      confidence: parsed.confidence,
    };
  }

  return {
    success: true,
    analysis: response,
    recommendations: [],
  };
}

function getLaunchRiskLevel(input: LaunchWindowInput): 'low' | 'medium' | 'high' | 'critical' {
  if (input.precipitation > 0 || input.windSpeed > 15) return 'critical';
  if (input.windSpeed > 10 || input.cloudCover > 70) return 'high';
  if (input.windSpeed > 7 || input.cloudCover > 50) return 'medium';
  return 'low';
}

function getDefaultLaunchAnalysis(input: LaunchWindowInput): string {
  const issues: string[] = [];
  if (input.precipitation > 0) issues.push('강수');
  if (input.windSpeed > 10) issues.push('강풍');
  if (input.cloudCover > 70) issues.push('구름 과다');

  if (issues.length === 0) return '발사 조건 양호. GO 판정.';
  return `${issues.join(', ')}으로 인해 발사에 주의가 필요합니다.`;
}

function getDefaultLaunchRecommendations(input: LaunchWindowInput): string[] {
  const recs: string[] = [];
  if (input.precipitation > 0) recs.push('강수 종료 후 발사 검토');
  if (input.windSpeed > 10) recs.push('풍속 감소 대기');
  if (input.cloudCover > 70) recs.push('구름량 감소 대기');
  if (recs.length === 0) recs.push('현재 조건에서 발사 가능');
  return recs;
}

// ============================================
// 4. 대기질 건강 AI 조언
// ============================================

export interface AirQualityInput {
  pm25: number; // 초미세먼지 (μg/m³)
  pm10: number; // 미세먼지 (μg/m³)
  ozone?: number; // 오존 (ppm)
  temperature: number;
  humidity: number;
  userProfile?: {
    hasAsthma?: boolean;
    hasAllergy?: boolean;
    isElderly?: boolean;
    isChild?: boolean;
    exerciseType?: string;
  };
}

export async function analyzeAirQualityHealth(input: AirQualityInput): Promise<AIAnalysisResult> {
  const systemPrompt = `당신은 환경 건강 전문가입니다. 대기질 데이터를 분석하여 건강 관련 조언을 제공해주세요.
대기질 기준 (한국):
- PM2.5: 좋음(0-15), 보통(16-35), 나쁨(36-75), 매우나쁨(76+)
- PM10: 좋음(0-30), 보통(31-80), 나쁨(81-150), 매우나쁨(151+)

응답은 반드시 다음 JSON 형식으로만 해주세요:
{
  "analysis": "대기질 건강 영향 분석 (2-3문장)",
  "airQualityLevel": "good|moderate|unhealthy|hazardous",
  "healthRisks": ["건강 위험1", "건강 위험2"],
  "recommendations": ["건강 조언1", "건강 조언2", "건강 조언3"],
  "outdoorActivityAdvice": "야외 활동 적합 여부"
}`;

  const userPrompt = `현재 대기질:
- PM2.5 (초미세먼지): ${input.pm25}μg/m³
- PM10 (미세먼지): ${input.pm10}μg/m³
${input.ozone ? `- 오존: ${input.ozone}ppm` : ''}
- 기온: ${input.temperature}°C
- 습도: ${input.humidity}%
${input.userProfile ? `
사용자 정보:
${input.userProfile.hasAsthma ? '- 천식 있음' : ''}
${input.userProfile.hasAllergy ? '- 알레르기 있음' : ''}
${input.userProfile.isElderly ? '- 고령자' : ''}
${input.userProfile.isChild ? '- 어린이' : ''}
${input.userProfile.exerciseType ? `- 운동 계획: ${input.userProfile.exerciseType}` : ''}
` : ''}

건강 관련 조언을 제공해주세요.`;

  const response = await callGroqAPI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  if (!response) {
    return {
      success: false,
      analysis: getDefaultAirQualityAnalysis(input),
      recommendations: getDefaultAirQualityRecommendations(input),
      riskLevel: getAirQualityRiskLevel(input),
      error: 'AI 분석을 사용할 수 없습니다.',
    };
  }

  const parsed = parseJSONResponse(response);
  if (parsed) {
    const riskMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'good': 'low',
      'moderate': 'medium',
      'unhealthy': 'high',
      'hazardous': 'critical',
    };
    return {
      success: true,
      analysis: parsed.analysis || response,
      recommendations: parsed.recommendations || [],
      riskLevel: riskMap[parsed.airQualityLevel] || 'medium',
    };
  }

  return {
    success: true,
    analysis: response,
    recommendations: [],
  };
}

function getAirQualityRiskLevel(input: AirQualityInput): 'low' | 'medium' | 'high' | 'critical' {
  if (input.pm25 > 75 || input.pm10 > 150) return 'critical';
  if (input.pm25 > 35 || input.pm10 > 80) return 'high';
  if (input.pm25 > 15 || input.pm10 > 30) return 'medium';
  return 'low';
}

function getDefaultAirQualityAnalysis(input: AirQualityInput): string {
  const pm25Level = input.pm25 <= 15 ? '좋음' : input.pm25 <= 35 ? '보통' : input.pm25 <= 75 ? '나쁨' : '매우나쁨';
  return `현재 초미세먼지(PM2.5) 농도는 ${input.pm25}μg/m³로 '${pm25Level}' 수준입니다.`;
}

function getDefaultAirQualityRecommendations(input: AirQualityInput): string[] {
  const recs: string[] = [];
  if (input.pm25 > 35) {
    recs.push('외출 시 마스크 착용');
    recs.push('창문 닫고 공기청정기 가동');
    recs.push('격한 야외 운동 자제');
  } else if (input.pm25 > 15) {
    recs.push('민감군은 야외 활동 주의');
    recs.push('외출 후 손씻기');
  } else {
    recs.push('야외 활동에 좋은 대기질입니다');
  }
  return recs;
}

// ============================================
// API 키 확인
// ============================================

export function hasGroqApiKey(): boolean {
  return Boolean(GROQ_API_CONFIG.API_KEY && GROQ_API_CONFIG.API_KEY.trim() !== '');
}
