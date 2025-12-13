// 기후 데이터 기반 동적 테마 변경 훅
import { useEffect, useState } from 'react';
import { getWeatherDataForLaunch, getAirQualityData } from '../services/weatherApi';

export interface ClimateTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundGradient: string;
  mood: 'calm' | 'active' | 'unstable' | 'danger';
  moodLabel: string;
}

// 기후 데이터를 감성 키워드로 변환
function getClimateMood(
  temperature: number,
  precipitation: number,
  windSpeed: number,
  _humidity: number
): { mood: ClimateTheme['mood']; label: string } {
  // 위험한 날씨 (강한 비, 강풍)
  if (precipitation > 50 || windSpeed > 15) {
    return { mood: 'danger', label: '불안정한 날씨' };
  }
  
  // 활동적인 날씨 (적당한 온도, 약한 바람)
  if (temperature >= 18 && temperature <= 28 && windSpeed < 10 && precipitation < 5) {
    return { mood: 'active', label: '활동하기 좋은 날씨' };
  }
  
  // 불안정한 날씨 (변화가 큰 날씨)
  if (precipitation > 20 || (temperature < 5 || temperature > 30)) {
    return { mood: 'unstable', label: '변화무쌍한 날씨' };
  }
  
  // 고요한 날씨 (기본값)
  return { mood: 'calm', label: '고요한 날씨' };
}

// 기온 기반 색상 팔레트
function getTemperatureColor(temperature: number): { primary: string; secondary: string; gradient: string } {
  if (temperature < 0) {
    // 매우 추움 - 파란색 계열
    return {
      primary: '#4A90E2',
      secondary: '#7B9CB0',
      gradient: 'linear-gradient(135deg, #4A90E2 0%, #7B9CB0 100%)',
    };
  } else if (temperature < 10) {
    // 추움 - 청록색 계열
    return {
      primary: '#5B9BD5',
      secondary: '#8FB8D4',
      gradient: 'linear-gradient(135deg, #5B9BD5 0%, #8FB8D4 100%)',
    };
  } else if (temperature < 20) {
    // 서늘함 - 초록색 계열
    return {
      primary: '#6BCF7F',
      secondary: '#95D5A2',
      gradient: 'linear-gradient(135deg, #6BCF7F 0%, #95D5A2 100%)',
    };
  } else if (temperature < 28) {
    // 따뜻함 - 노란색 계열
    return {
      primary: '#F5A623',
      secondary: '#FFC857',
      gradient: 'linear-gradient(135deg, #F5A623 0%, #FFC857 100%)',
    };
  } else if (temperature < 35) {
    // 더움 - 주황색 계열
    return {
      primary: '#FF6B35',
      secondary: '#FF8C61',
      gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8C61 100%)',
    };
  } else {
    // 매우 더움 - 빨간색 계열
    return {
      primary: '#E63946',
      secondary: '#F77F7F',
      gradient: 'linear-gradient(135deg, #E63946 0%, #F77F7F 100%)',
    };
  }
}

// 미세먼지 기반 색상 조정
function adjustColorForAirQuality(
  baseColor: { primary: string; secondary: string; gradient: string },
  pm25: number
): { primary: string; secondary: string; gradient: string } {
  // 미세먼지가 나쁘면 색상을 더 어둡게
  if (pm25 > 75) {
    // 매우 나쁨 - 회색 계열로 변경
    return {
      primary: '#6C757D',
      secondary: '#8E9AAF',
      gradient: 'linear-gradient(135deg, #6C757D 0%, #8E9AAF 100%)',
    };
  } else if (pm25 > 35) {
    // 나쁨 - 약간 어둡게
    const darken = (color: string, percent: number) => {
      const num = parseInt(color.replace('#', ''), 16);
      const amt = Math.round(2.55 * percent);
      const R = Math.max(0, Math.min(255, (num >> 16) + amt));
      const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
      const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
      return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    };
    return {
      primary: darken(baseColor.primary, -15),
      secondary: darken(baseColor.secondary, -10),
      gradient: `linear-gradient(135deg, ${darken(baseColor.primary, -15)} 0%, ${darken(baseColor.secondary, -10)} 100%)`,
    };
  }
  return baseColor;
}

// 기후 데이터 기반 테마 생성
export function useClimateTheme(lat: number | null, lng: number | null, enabled: boolean = true) {
  const [theme, setTheme] = useState<ClimateTheme>({
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    mood: 'calm',
    moodLabel: '고요한 날씨',
  });

  useEffect(() => {
    if (!enabled || !lat || !lng) {
      // 기본 테마 유지
      return;
    }

    const updateTheme = async () => {
      try {
        const weatherData = await getWeatherDataForLaunch(lat, lng);
        
        if (!weatherData) {
          // 기본값 사용
          return;
        }

        const temperature = weatherData.temperature || 20;
        const precipitation = weatherData.precipitation || 0;
        const windSpeed = weatherData.windSpeed || 5;
        const humidity = weatherData.humidity || 60;

        // 기온 기반 색상
        const tempColors = getTemperatureColor(temperature);
        
        // 미세먼지 데이터 가져오기 및 색상 조정
        let colors = tempColors;
        try {
          const airQuality = await getAirQualityData(lat, lng);
          if (airQuality && airQuality.pm25) {
            colors = adjustColorForAirQuality(tempColors, airQuality.pm25);
          }
        } catch (error: any) {
          // 공기질 데이터 가져오기 실패 시 기본 색상 사용 (조용히 처리)
          if (error?.message?.includes('WFS_NOT_SUPPORTED') || 
              error?.message?.includes('No query specified')) {
            // WFS를 지원하지 않는 레이어는 정상적인 경우
            return;
          }
          console.debug('공기질 데이터를 가져올 수 없어 기본 색상을 사용합니다.');
        }

        // 감성 키워드
        const { mood, label } = getClimateMood(temperature, precipitation, windSpeed, humidity);

        // CSS 변수 업데이트
        const root = document.documentElement;
        root.style.setProperty('--climate-primary', colors.primary);
        root.style.setProperty('--climate-secondary', colors.secondary);
        root.style.setProperty('--climate-gradient', colors.gradient);

        setTheme({
          primaryColor: colors.primary,
          secondaryColor: colors.secondary,
          backgroundGradient: colors.gradient,
          mood,
          moodLabel: label,
        });
      } catch (error: any) {
        // API 오류는 조용히 처리 (이미 kmaApi에서 처리됨)
        if (error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
          // 기본 테마 유지 (조용히 처리)
          return;
        }
        console.debug('기후 테마 업데이트 실패:', error);
      }
    };

    updateTheme();
    
    // 30초마다 테마 업데이트
    // API 호출 빈도 줄이기 (5분마다 업데이트, 429 오류 방지)
    const interval = setInterval(updateTheme, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lng, enabled]);

  return theme;
}

