// 기상청 공공데이터 API 서비스
import { KMA_API_CONFIG } from '../config/api';

// 기상청 API 키 상태 확인 함수
export function hasKMAApiKey(): boolean {
  return !!KMA_API_CONFIG.SERVICE_KEY && KMA_API_CONFIG.SERVICE_KEY.trim() !== '';
}

// 기상청 격자 좌표 변환 상수 (Lambert Conformal Conic Projection)
const GRID_CONST = {
  RE: 6371.00877, // 지구 반경 (km)
  GRID: 5.0, // 격자 간격 (km)
  SLAT1: 30.0, // 투영 위도1 (degree)
  SLAT2: 60.0, // 투영 위도2 (degree)
  OLON: 126.0, // 기준점 경도 (degree)
  OLAT: 38.0, // 기준점 위도 (degree)
  XO: 43, // 기준점 X좌표 (GRID)
  YO: 136, // 기준점 Y좌표 (GRID)
};

// 위경도를 기상청 격자 좌표로 변환
export function latLngToGrid(lat: number, lng: number): { nx: number; ny: number } {
  const DEGRAD = Math.PI / 180.0;
  const { RE, GRID, SLAT1, SLAT2, OLON, OLAT, XO, YO } = GRID_CONST;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  let ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  ra = (re * sf) / Math.pow(ra, sn);
  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}

// 기상청 API 응답 타입
interface KMAResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body?: {
      dataType: string;
      items: {
        item: KMAItem[];
      };
      pageNo: number;
      numOfRows: number;
      totalCount: number;
    };
  };
}

interface KMAItem {
  baseDate: string;
  baseTime: string;
  category: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
  obsrValue?: string;
  nx: number;
  ny: number;
}

// 기상청 카테고리 코드
export const KMA_CATEGORY = {
  // 초단기실황
  T1H: 'T1H', // 기온 (°C)
  RN1: 'RN1', // 1시간 강수량 (mm)
  UUU: 'UUU', // 동서바람성분 (m/s)
  VVV: 'VVV', // 남북바람성분 (m/s)
  REH: 'REH', // 습도 (%)
  PTY: 'PTY', // 강수형태 (코드)
  VEC: 'VEC', // 풍향 (deg)
  WSD: 'WSD', // 풍속 (m/s)
  // 단기예보 추가
  POP: 'POP', // 강수확률 (%)
  PCP: 'PCP', // 1시간 강수량 (범주)
  SNO: 'SNO', // 1시간 신적설 (범주)
  SKY: 'SKY', // 하늘상태 (코드: 1맑음, 3구름많음, 4흐림)
  TMP: 'TMP', // 1시간 기온 (°C)
  TMN: 'TMN', // 일 최저기온 (°C)
  TMX: 'TMX', // 일 최고기온 (°C)
  WAV: 'WAV', // 파고 (M)
};

// 현재 시간을 기상청 API 포맷으로 변환
function getKMADateTime(): { baseDate: string; baseTime: string } {
  const now = new Date();
  // 한국 시간으로 변환
  const kstOffset = 9 * 60; // UTC+9
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + kstOffset * 60000);

  // API는 매시 30분에 업데이트되므로, 현재 시간에서 40분을 빼서 안정적인 데이터 조회
  kst.setMinutes(kst.getMinutes() - 40);

  const year = kst.getFullYear();
  const month = String(kst.getMonth() + 1).padStart(2, '0');
  const day = String(kst.getDate()).padStart(2, '0');
  const hour = String(kst.getHours()).padStart(2, '0');

  return {
    baseDate: `${year}${month}${day}`,
    baseTime: `${hour}00`,
  };
}

// 단기예보용 base_time 계산 (02, 05, 08, 11, 14, 17, 20, 23시)
function getVilageFcstBaseTime(): { baseDate: string; baseTime: string } {
  const now = new Date();
  const kstOffset = 9 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + kstOffset * 60000);

  const baseTimes = ['0200', '0500', '0800', '1100', '1400', '1700', '2000', '2300'];
  const currentHour = kst.getHours();
  const currentMinute = kst.getMinutes();

  // 현재 시간에 맞는 가장 최근 base_time 찾기
  let baseTime = '2300';
  let useYesterday = true;

  for (let i = baseTimes.length - 1; i >= 0; i--) {
    const bt = parseInt(baseTimes[i].substring(0, 2));
    // API 발표 후 10분 후부터 조회 가능
    if (currentHour > bt || (currentHour === bt && currentMinute >= 10)) {
      baseTime = baseTimes[i];
      useYesterday = false;
      break;
    }
  }

  let date = kst;
  if (useYesterday) {
    date = new Date(kst.getTime() - 24 * 60 * 60 * 1000);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return {
    baseDate: `${year}${month}${day}`,
    baseTime,
  };
}

// 초단기실황 조회 (현재 날씨)
export async function getUltraSrtNcst(
  lat: number,
  lng: number
): Promise<Map<string, string> | null> {
  if (!KMA_API_CONFIG.SERVICE_KEY) {
    console.warn('기상청 API 키가 설정되지 않았습니다. VITE_KMA_API_KEY 환경변수를 설정해주세요.');
    return null;
  }

  const { nx, ny } = latLngToGrid(lat, lng);
  const { baseDate, baseTime } = getKMADateTime();

  const url = new URL(`${KMA_API_CONFIG.VILAGE_FCST_URL}/getUltraSrtNcst`);
  url.searchParams.set('serviceKey', KMA_API_CONFIG.SERVICE_KEY);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '10');
  url.searchParams.set('dataType', 'JSON');
  url.searchParams.set('base_date', baseDate);
  url.searchParams.set('base_time', baseTime);
  url.searchParams.set('nx', String(nx));
  url.searchParams.set('ny', String(ny));

  // 재시도 로직 (429 오류 처리)
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url.toString());
      
      // 429 오류 처리 (Too Many Requests)
      if (response.status === 429) {
        if (attempt < maxRetries) {
          // Exponential backoff: 2초, 4초 대기
          const waitTime = Math.pow(2, attempt + 1) * 1000;
          console.warn(`[기상청 API] 429 오류 발생. ${waitTime}ms 후 재시도... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          console.warn('[기상청 API] 429 오류: API 호출 한도 초과. 캐시된 데이터를 사용하거나 나중에 다시 시도해주세요.');
          return null;
        }
      }

      if (!response.ok) {
        // 429가 아닌 다른 오류는 즉시 반환
        if (attempt === 0) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // 재시도 중이었다면 마지막 시도에서만 오류 발생
        if (attempt === maxRetries) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        continue;
      }

      const data: KMAResponse = await response.json();

      if (data.response.header.resultCode !== '00') {
        // API 오류 코드 처리
        const errorCode = data.response.header.resultCode;
        if (errorCode === '03' || errorCode === '05') {
          console.info(`[기상청 API] API 키 오류 (코드: ${errorCode}). 기본값을 사용합니다.`);
        } else {
          console.debug(`[기상청 API] API 오류 (코드: ${errorCode}): ${data.response.header.resultMsg}`);
        }
        return null;
      }

      if (!data.response.body?.items?.item) {
        return null;
      }

      // 카테고리별로 데이터 매핑
      const result = new Map<string, string>();
      data.response.body.items.item.forEach((item) => {
        if (item.obsrValue) {
          result.set(item.category, item.obsrValue);
        }
      });

      // API 키가 설정되어 있고 데이터를 성공적으로 가져온 경우
      if (result.size > 0) {
        console.info('✅ 기상청 API 데이터를 성공적으로 가져왔습니다.');
      }

      return result;
    } catch (error: any) {
      // 429 오류 체크
      if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt + 1) * 1000;
          console.warn(`[기상청 API] 429 오류 발생. ${waitTime}ms 후 재시도... (${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          console.warn('[기상청 API] 429 오류: API 호출 한도 초과. 캐시된 데이터를 사용하거나 나중에 다시 시도해주세요.');
          return null;
        }
      }
      
      // 마지막 시도에서도 실패한 경우
      if (attempt === maxRetries) {
        console.debug('초단기실황 조회 실패:', error);
        return null;
      }
    }
  }

  return null;
}

// 단기예보 조회 (48시간 예보)
export async function getVilageFcst(
  lat: number,
  lng: number
): Promise<KMAItem[] | null> {
  if (!KMA_API_CONFIG.SERVICE_KEY) {
    console.warn('기상청 API 키가 설정되지 않았습니다. VITE_KMA_API_KEY 환경변수를 설정해주세요.');
    return null;
  }

  const { nx, ny } = latLngToGrid(lat, lng);
  const { baseDate, baseTime } = getVilageFcstBaseTime();

  const url = new URL(`${KMA_API_CONFIG.VILAGE_FCST_URL}/getVilageFcst`);
  url.searchParams.set('serviceKey', KMA_API_CONFIG.SERVICE_KEY);
  url.searchParams.set('pageNo', '1');
  url.searchParams.set('numOfRows', '1000'); // 48시간 * 12개 항목 정도
  url.searchParams.set('dataType', 'JSON');
  url.searchParams.set('base_date', baseDate);
  url.searchParams.set('base_time', baseTime);
  url.searchParams.set('nx', String(nx));
  url.searchParams.set('ny', String(ny));

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      // 401 Unauthorized는 API 키 문제
      if (response.status === 401) {
        console.info('기상청 API 키가 유효하지 않거나 만료되었습니다. 기본값을 사용합니다.');
        return null;
      }
      // 다른 HTTP 오류
      console.debug(`기상청 API HTTP 오류: ${response.status}`);
      return null;
    }

    const data: KMAResponse = await response.json();

    if (data.response.header.resultCode !== '00') {
      // API 키 관련 오류는 조용히 처리
      if (data.response.header.resultCode === '03' || 
          data.response.header.resultCode === '05' ||
          data.response.header.resultMsg?.includes('인증') ||
          data.response.header.resultMsg?.includes('KEY')) {
        console.info('기상청 API 인증 오류. 기본값을 사용합니다.');
        return null;
      }
      console.debug('기상청 API 오류:', data.response.header.resultMsg);
      return null;
    }

    const items = data.response.body?.items?.item || null;
    
    // API 키가 설정되어 있고 데이터를 성공적으로 가져온 경우
    if (items && items.length > 0) {
      console.info(`✅ 기상청 예보 데이터를 성공적으로 가져왔습니다. (${items.length}개 항목)`);
    }

    return items;
  } catch (error: any) {
    // 네트워크 오류나 기타 오류는 조용히 처리
    if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
      console.info('기상청 API 인증 실패. 기본값을 사용합니다.');
    } else {
      console.debug('단기예보 조회 실패:', error);
    }
    return null;
  }
}

// 하늘상태 코드를 구름량(%)으로 변환
export function skyCodeToCloudCover(skyCode: string): number {
  switch (skyCode) {
    case '1': return 0;   // 맑음
    case '3': return 50;  // 구름많음
    case '4': return 90;  // 흐림
    default: return 30;
  }
}

// 강수형태 코드 해석
export function ptyCodeToString(ptyCode: string): string {
  switch (ptyCode) {
    case '0': return '없음';
    case '1': return '비';
    case '2': return '비/눈';
    case '3': return '눈';
    case '4': return '소나기';
    case '5': return '빗방울';
    case '6': return '빗방울눈날림';
    case '7': return '눈날림';
    default: return '없음';
  }
}
