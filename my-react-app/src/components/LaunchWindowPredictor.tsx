import { useState, useMemo, useEffect, useCallback } from 'react';
import { predictLaunchWindows, collectLaunchEnvironmentData, type LaunchEnvironmentAnalysis } from '../services/launchAnalysisApi';
import { getWeatherDataForLaunch, getWeatherForecast, type WeatherForecast } from '../services/weatherApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

interface LaunchCriteria {
  minWindSpeed: number;
  maxWindSpeed: number;
  maxPrecipitation: number;
  maxCloudCover: number;
  noThunderstorm: boolean;
  maxCrosswind: number;
  minTemperature: number;
  maxTemperature: number;
  maxHumidity: number;
  minVisibility: number;
}

interface CurrentWeather {
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  cloudCover: number;
  temperature: number;
  humidity: number;
  pressure: number;
  crosswind: number;
}

interface LaunchWindow {
  startTime: string;
  endTime: string;
  overallScore: number;
  launchFeasibility: string;
  analysis: LaunchEnvironmentAnalysis;
}

interface LaunchWindowPredictorProps {
  center?: { lat: number; lng: number };
  trajectoryMode: 'azimuth' | 'markers';
  customTrajectoryMarkers: Array<{ lat: number; lng: number }>;
}

export default function LaunchWindowPredictor({ center, trajectoryMode, customTrajectoryMarkers }: LaunchWindowPredictorProps) {
  const [criteria, setCriteria] = useState<LaunchCriteria>({
    minWindSpeed: 0,
    maxWindSpeed: 15,
    maxPrecipitation: 0,
    maxCloudCover: 30,
    noThunderstorm: true,
    maxCrosswind: 10,
    minTemperature: 5,
    maxTemperature: 35,
    maxHumidity: 80,
    minVisibility: 5,
  });

  const [minOverallScore, setMinOverallScore] = useState<number>(60);
  const [currentAnalysis, setCurrentAnalysis] = useState<LaunchEnvironmentAnalysis | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [useManualWeather, setUseManualWeather] = useState(false);
  const [manualWeather, setManualWeather] = useState<CurrentWeather>({
    windSpeed: 5,
    windDirection: 180,
    precipitation: 0,
    cloudCover: 20,
    temperature: 20,
    humidity: 50,
    pressure: 1013,
    crosswind: 3,
  });

  const [launchWindows, setLaunchWindows] = useState<LaunchWindow[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<LaunchWindow | null>(null);
  const [activeTab, setActiveTab] = useState<'criteria' | 'weather' | 'results' | 'timeline'>('criteria');
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast[]>([]);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(false);
  const [launchAzimuth, setLaunchAzimuth] = useState(0); // 발사 방위각 (0-360도)
  const [localTrajectoryMode, setLocalTrajectoryMode] = useState<'azimuth' | 'markers'>('azimuth'); // 로컬 궤적 모드 상태

  // 궤적 모드 변경 이벤트 리스너
  useEffect(() => {
    const handleSetTrajectoryMode = (e: Event) => {
      const customEvent = e as CustomEvent<'azimuth' | 'markers'>;
      setLocalTrajectoryMode(customEvent.detail);
    };

    window.addEventListener('setTrajectoryMode', handleSetTrajectoryMode);
    return () => {
      window.removeEventListener('setTrajectoryMode', handleSetTrajectoryMode);
    };
  }, []);

  // 48시간 기상 예보 데이터 가져오기
  const fetchWeatherForecast = useCallback(async () => {
    if (!center) return;

    setIsLoadingForecast(true);
    try {
      const forecast = await getWeatherForecast(center.lat, center.lng);
      setWeatherForecast(forecast);
    } catch (error) {
      console.error('기상 예보 데이터 로드 실패:', error);
    } finally {
      setIsLoadingForecast(false);
    }
  }, [center]);

  // 현재 위치의 기상 데이터 가져오기
  const fetchCurrentWeather = useCallback(async () => {
    if (!center) return;

    setIsLoadingWeather(true);
    try {
      const weatherData = await getWeatherDataForLaunch(center.lat, center.lng);
      if (weatherData) {
        setCurrentWeather({
          windSpeed: weatherData.windSpeed,
          windDirection: weatherData.windDirection,
          precipitation: weatherData.precipitation,
          cloudCover: weatherData.cloudCover,
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          pressure: weatherData.pressure,
          crosswind: weatherData.crosswind,
        });
      }
    } catch (error) {
      console.error('기상 데이터 로드 실패:', error);
    } finally {
      setIsLoadingWeather(false);
    }
  }, [center]);

  // 위치 변경 시 자동으로 기상 데이터 가져오기
  useEffect(() => {
    if (center && !useManualWeather) {
      fetchCurrentWeather();
      fetchWeatherForecast();
    }
  }, [center, useManualWeather, fetchCurrentWeather, fetchWeatherForecast]);

  // 현재 조건이 기준을 만족하는지 확인
  const checkCriteriaMet = (weather: CurrentWeather): { met: boolean; issues: string[] } => {
    const issues: string[] = [];

    if (weather.windSpeed < criteria.minWindSpeed) {
      issues.push(`풍속이 너무 낮음 (${weather.windSpeed.toFixed(1)} < ${criteria.minWindSpeed} m/s)`);
    }
    if (weather.windSpeed > criteria.maxWindSpeed) {
      issues.push(`풍속이 너무 높음 (${weather.windSpeed.toFixed(1)} > ${criteria.maxWindSpeed} m/s)`);
    }
    if (weather.precipitation > criteria.maxPrecipitation) {
      issues.push(`강수량 초과 (${weather.precipitation.toFixed(1)} > ${criteria.maxPrecipitation} mm)`);
    }
    if (weather.cloudCover > criteria.maxCloudCover) {
      issues.push(`구름량 초과 (${weather.cloudCover.toFixed(0)} > ${criteria.maxCloudCover}%)`);
    }
    if (weather.crosswind > criteria.maxCrosswind) {
      issues.push(`횡풍 초과 (${weather.crosswind.toFixed(1)} > ${criteria.maxCrosswind} m/s)`);
    }
    if (weather.temperature < criteria.minTemperature) {
      issues.push(`기온이 너무 낮음 (${weather.temperature.toFixed(1)} < ${criteria.minTemperature}°C)`);
    }
    if (weather.temperature > criteria.maxTemperature) {
      issues.push(`기온이 너무 높음 (${weather.temperature.toFixed(1)} > ${criteria.maxTemperature}°C)`);
    }
    if (weather.humidity > criteria.maxHumidity) {
      issues.push(`습도 초과 (${weather.humidity.toFixed(0)} > ${criteria.maxHumidity}%)`);
    }

    return { met: issues.length === 0, issues };
  };

  // 현재 조건 기반 발사 점수 계산
  const calculateLaunchScore = (weather: CurrentWeather): number => {
    let score = 100;

    // 풍속 점수 (최적: 5-10 m/s)
    if (weather.windSpeed < criteria.minWindSpeed) {
      score -= 20;
    } else if (weather.windSpeed > criteria.maxWindSpeed) {
      score -= Math.min(40, (weather.windSpeed - criteria.maxWindSpeed) * 5);
    } else if (weather.windSpeed >= 5 && weather.windSpeed <= 10) {
      score += 5; // 보너스
    }

    // 강수량 점수
    if (weather.precipitation > 0) {
      score -= Math.min(30, weather.precipitation * 10);
    }

    // 구름량 점수
    if (weather.cloudCover > criteria.maxCloudCover) {
      score -= Math.min(25, (weather.cloudCover - criteria.maxCloudCover) * 0.5);
    }

    // 횡풍 점수
    if (weather.crosswind > criteria.maxCrosswind) {
      score -= Math.min(30, (weather.crosswind - criteria.maxCrosswind) * 3);
    }

    // 기온 점수
    if (weather.temperature < criteria.minTemperature || weather.temperature > criteria.maxTemperature) {
      score -= 15;
    }

    // 습도 점수
    if (weather.humidity > criteria.maxHumidity) {
      score -= Math.min(20, (weather.humidity - criteria.maxHumidity) * 0.5);
    }

    // 기압 점수 (정상: 1000-1025 hPa)
    if (weather.pressure < 1000 || weather.pressure > 1025) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  };

  const activeWeather = useManualWeather ? manualWeather : currentWeather;
  const criteriaCheck = activeWeather ? checkCriteriaMet(activeWeather) : null;
  const launchScore = activeWeather ? calculateLaunchScore(activeWeather) : null;

  // 현재 위치의 종합 환경 분석
  const analyzeCurrentEnvironment = async () => {
    // 마커 경로 모드일 때는 마커 경로의 모든 지점을 분석
    if (trajectoryMode === 'markers' && customTrajectoryMarkers.length > 0) {
      setIsAnalyzing(true);
      try {
        console.log(`[발사 환경 분석] 마커 경로 기반 분석 시작: ${customTrajectoryMarkers.length}개 지점`);
        
        // 모든 마커 지점의 데이터 수집
        const analyses = await Promise.all(
          customTrajectoryMarkers.map(marker => 
            collectLaunchEnvironmentData(marker.lat, marker.lng)
              .catch(error => {
                console.debug(`[발사 환경 분석] 마커 (${marker.lat}, ${marker.lng}) 분석 실패:`, error);
                return null;
              })
          )
        );

        // 유효한 분석 결과만 필터링
        const validAnalyses = analyses.filter((a): a is NonNullable<typeof a> => a !== null);
        
        if (validAnalyses.length === 0) {
          alert('마커 경로의 모든 지점에서 데이터를 불러올 수 없습니다.');
          setIsAnalyzing(false);
          return;
        }

        // 여러 지점의 데이터를 종합하여 평균 점수 계산
        const avgWeather = {
          windSpeed: validAnalyses.reduce((sum, a) => sum + a.weather.windSpeed, 0) / validAnalyses.length,
          windDirection: validAnalyses.reduce((sum, a) => sum + a.weather.windDirection, 0) / validAnalyses.length,
          precipitation: validAnalyses.reduce((sum, a) => sum + a.weather.precipitation, 0) / validAnalyses.length,
          cloudCover: validAnalyses.reduce((sum, a) => sum + a.weather.cloudCover, 0) / validAnalyses.length,
          temperature: validAnalyses.reduce((sum, a) => sum + a.weather.temperature, 0) / validAnalyses.length,
          humidity: validAnalyses.reduce((sum, a) => sum + a.weather.humidity, 0) / validAnalyses.length,
          crosswind: validAnalyses.reduce((sum, a) => sum + a.weather.crosswind, 0) / validAnalyses.length,
        };

        // 위험도는 가장 높은 것을 선택 (최악의 경우 고려)
        const maxRisk = (risks: Array<'low' | 'medium' | 'high'>): 'low' | 'medium' | 'high' => {
          if (risks.includes('high')) return 'high';
          if (risks.includes('medium')) return 'medium';
          return 'low';
        };

        const avgRisks: LaunchEnvironmentAnalysis['risks'] = {
          floodRisk: maxRisk(validAnalyses.map(a => a.risks.floodRisk)),
          landslideRisk: maxRisk(validAnalyses.map(a => a.risks.landslideRisk)),
          heatRisk: maxRisk(validAnalyses.map(a => a.risks.heatRisk)),
          airQuality: (validAnalyses.some(a => a.risks.airQuality === 'poor') ? 'poor' :
                     validAnalyses.some(a => a.risks.airQuality === 'moderate') ? 'moderate' : 'good') as 'good' | 'moderate' | 'poor',
        };

        const avgEnvironment = {
          soilStability: validAnalyses.reduce((sum, a) => sum + a.environment.soilStability, 0) / validAnalyses.length,
          vegetationCover: validAnalyses.reduce((sum, a) => sum + a.environment.vegetationCover, 0) / validAnalyses.length,
          waterProximity: validAnalyses.reduce((sum, a) => sum + a.environment.waterProximity, 0) / validAnalyses.length,
          elevation: validAnalyses.reduce((sum, a) => sum + a.environment.elevation, 0) / validAnalyses.length,
        };

        // 종합 점수 계산 (평균)
        const avgOverallScore = validAnalyses.reduce((sum, a) => sum + a.overallScore, 0) / validAnalyses.length;
        const avgWeatherScore = validAnalyses.reduce((sum, a) => sum + a.details.weatherScore, 0) / validAnalyses.length;
        const avgRiskScore = validAnalyses.reduce((sum, a) => sum + a.details.riskScore, 0) / validAnalyses.length;
        const avgEnvironmentScore = validAnalyses.reduce((sum, a) => sum + a.details.environmentScore, 0) / validAnalyses.length;

        // 발사 가능성 평가
        let launchFeasibility: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
        if (avgOverallScore >= 85) {
          launchFeasibility = 'excellent';
        } else if (avgOverallScore >= 70) {
          launchFeasibility = 'good';
        } else if (avgOverallScore >= 55) {
          launchFeasibility = 'moderate';
        } else if (avgOverallScore >= 40) {
          launchFeasibility = 'poor';
        } else {
          launchFeasibility = 'critical';
        }

        // 모든 지점의 방해 요소 및 권장사항 수집
        const allBlockingFactors = new Set<string>();
        const allRecommendations = new Set<string>();
        validAnalyses.forEach(a => {
          a.details.blockingFactors.forEach(f => allBlockingFactors.add(f));
          a.details.recommendations.forEach(r => allRecommendations.add(r));
        });

        // 종합 분석 결과 생성
        const combinedAnalysis: LaunchEnvironmentAnalysis = {
          weather: avgWeather,
          risks: avgRisks,
          environment: avgEnvironment,
          overallScore: Math.round(avgOverallScore),
          launchFeasibility,
          details: {
            weatherScore: Math.round(avgWeatherScore),
            riskScore: Math.round(avgRiskScore),
            environmentScore: Math.round(avgEnvironmentScore),
            blockingFactors: Array.from(allBlockingFactors),
            recommendations: Array.from(allRecommendations),
          },
        };

        setCurrentAnalysis(combinedAnalysis);
        setActiveTab('results');
        console.log(`[발사 환경 분석] 마커 경로 종합 분석 완료 - ${validAnalyses.length}개 지점 평균 점수: ${Math.round(avgOverallScore)}점`);
      } catch (error) {
        console.error('환경 분석 실패:', error);
        alert('환경 데이터를 불러올 수 없습니다.');
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    // 방위각 모드 또는 마커가 없을 때는 기존대로 단일 위치 분석
    if (!center) {
      alert('지도를 클릭하여 발사 위치를 선택하세요.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await collectLaunchEnvironmentData(center.lat, center.lng);
      setCurrentAnalysis(analysis);
      setActiveTab('results');
    } catch (error) {
      console.error('환경 분석 실패:', error);
      alert('환경 데이터를 불러올 수 없습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 48시간 윈도우 분석
  const analyzeLaunchWindows = async () => {
    if (!center) {
      alert('지도를 클릭하여 발사 위치를 선택하세요.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const windows = await predictLaunchWindows(center.lat, center.lng, {
        minWindSpeed: criteria.minWindSpeed,
        maxWindSpeed: criteria.maxWindSpeed,
        maxPrecipitation: criteria.maxPrecipitation,
        maxCloudCover: criteria.maxCloudCover,
        maxCrosswind: criteria.maxCrosswind,
        minOverallScore: minOverallScore,
      });

      setLaunchWindows(windows);
      setActiveTab('results');

      if (windows.length === 0) {
        alert('48시간 내에 기준을 만족하는 발사 윈도우가 없습니다.');
      } else if (windows.length > 0) {
        setCurrentAnalysis(windows[0].analysis);
      }
    } catch (error) {
      console.error('윈도우 분석 실패:', error);
      alert('데이터를 불러올 수 없습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const chartData = useMemo(() => {
    return launchWindows.map((window, index) => ({
      name: `${index + 1}번`,
      종합점수: window.overallScore,
      기상점수: window.analysis.details.weatherScore,
      위험도점수: window.analysis.details.riskScore,
      환경점수: window.analysis.details.environmentScore,
    }));
  }, [launchWindows]);

  const getFeasibilityColor = (feasibility: string): string => {
    switch (feasibility) {
      case 'excellent': return '#4caf50';
      case 'good': return '#8bc34a';
      case 'moderate': return '#ff9800';
      case 'poor': return '#ff5722';
      case 'critical': return '#f44336';
      default: return '#999';
    }
  };

  const getFeasibilityLabel = (feasibility: string): string => {
    switch (feasibility) {
      case 'excellent': return '우수';
      case 'good': return '양호';
      case 'moderate': return '보통';
      case 'poor': return '불량';
      case 'critical': return '위험';
      default: return '알 수 없음';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 85) return '#4caf50';
    if (score >= 70) return '#8bc34a';
    if (score >= 55) return '#ff9800';
    return '#f44336';
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(148, 163, 184, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  };

  // 글래스 스타일 공통 설정
  const glassTextPrimary = '#f1f5f9';
  const glassTextSecondary = '#94a3b8';
  const glassTextMuted = '#64748b';

  return (
    <div className="launch-window-predictor" style={{ ...cardStyle, padding: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.1rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          우주선 발사 최적 윈도우 예측
        </h3>
        {center && (
          <div style={{
            fontSize: '0.7rem',
            padding: '4px 8px',
            background: 'rgba(102, 126, 234, 0.2)',
            borderRadius: '8px',
            color: '#667eea',
          }}>
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </div>
        )}
      </div>

      {!center && (
        <div style={{
          padding: '16px',
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '12px',
          marginBottom: '16px',
          fontSize: '0.85rem',
          color: '#fbbf24',
          textAlign: 'center',
        }}>
          📍 지도를 클릭하여 발사 위치를 선택하세요
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        paddingBottom: '8px',
      }}>
        {[
          { key: 'criteria', label: '발사 기준', icon: '⚙️' },
          { key: 'weather', label: '기상 조건', icon: '🌤️' },
          { key: 'timeline', label: '48시간 타임라인', icon: '📅' },
          { key: 'results', label: '분석 결과', icon: '📊' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: 1,
              padding: '8px',
              background: activeTab === tab.key
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)'
                : 'rgba(255, 255, 255, 0.05)',
              border: activeTab === tab.key
                ? '1px solid rgba(102, 126, 234, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.8rem',
              color: activeTab === tab.key ? '#667eea' : '#666',
              fontWeight: activeTab === tab.key ? 600 : 400,
              transition: 'all 0.3s ease',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 발사 기준 탭 */}
      {activeTab === 'criteria' && (
        <div>
          <div style={{ display: 'grid', gap: '12px' }}>
            {/* 풍속 */}
            <div style={{ ...cardStyle, padding: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                💨 풍속 범위: {criteria.minWindSpeed} - {criteria.maxWindSpeed} m/s
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={criteria.minWindSpeed}
                  onChange={(e) => setCriteria({ ...criteria, minWindSpeed: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={criteria.maxWindSpeed}
                  onChange={(e) => setCriteria({ ...criteria, maxWindSpeed: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* 강수량 & 구름량 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ ...cardStyle, padding: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                  🌧️ 최대 강수량: {criteria.maxPrecipitation}mm
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={criteria.maxPrecipitation}
                  onChange={(e) => setCriteria({ ...criteria, maxPrecipitation: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ ...cardStyle, padding: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                  ☁️ 최대 구름량: {criteria.maxCloudCover}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={criteria.maxCloudCover}
                  onChange={(e) => setCriteria({ ...criteria, maxCloudCover: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* 온도 범위 */}
            <div style={{ ...cardStyle, padding: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                🌡️ 온도 범위: {criteria.minTemperature}°C - {criteria.maxTemperature}°C
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="range"
                  min="-20"
                  max="30"
                  value={criteria.minTemperature}
                  onChange={(e) => setCriteria({ ...criteria, minTemperature: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={criteria.maxTemperature}
                  onChange={(e) => setCriteria({ ...criteria, maxTemperature: parseFloat(e.target.value) })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* 습도 & 횡풍 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ ...cardStyle, padding: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                  💧 최대 습도: {criteria.maxHumidity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={criteria.maxHumidity}
                  onChange={(e) => setCriteria({ ...criteria, maxHumidity: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ ...cardStyle, padding: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                  🌬️ 최대 횡풍: {criteria.maxCrosswind}m/s
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={criteria.maxCrosswind}
                  onChange={(e) => setCriteria({ ...criteria, maxCrosswind: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* 최소 종합 점수 */}
            <div style={{ ...cardStyle, padding: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                🎯 최소 종합 점수: {minOverallScore}점
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={minOverallScore}
                onChange={(e) => setMinOverallScore(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            {/* 뇌우 금지 */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              ...cardStyle,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={criteria.noThunderstorm}
                onChange={(e) => setCriteria({ ...criteria, noThunderstorm: e.target.checked })}
              />
              <span style={{ fontSize: '0.85rem' }}>⛈️ 뇌우 발생 시 발사 불가</span>
            </label>
          </div>
        </div>
      )}

      {/* 기상 조건 탭 */}
      {activeTab === 'weather' && (
        <div>
          {/* 수동/자동 전환 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <button
              onClick={() => setUseManualWeather(false)}
              style={{
                flex: 1,
                padding: '10px',
                background: !useManualWeather
                  ? 'linear-gradient(135deg, #4caf50, #8bc34a)'
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: !useManualWeather ? 'white' : '#666',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              📡 실시간 데이터
            </button>
            <button
              onClick={() => setUseManualWeather(true)}
              style={{
                flex: 1,
                padding: '10px',
                background: useManualWeather
                  ? 'linear-gradient(135deg, #2196f3, #03a9f4)'
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                color: useManualWeather ? 'white' : '#666',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              ✏️ 수동 입력
            </button>
          </div>

          {isLoadingWeather && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
              기상 데이터 로딩 중...
            </div>
          )}

          {/* 현재 기상 조건 또는 수동 입력 */}
          {(activeWeather || useManualWeather) && (
            <div style={{ display: 'grid', gap: '12px' }}>
              {/* 발사 점수 표시 */}
              {launchScore !== null && (
                <div style={{
                  padding: '16px',
                  background: `linear-gradient(135deg, ${getScoreColor(launchScore)} 0%, ${getScoreColor(launchScore)}dd 100%)`,
                  borderRadius: '12px',
                  color: 'white',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    {launchScore.toFixed(0)}점
                  </div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                    {launchScore >= 85 ? '발사 적합' :
                      launchScore >= 70 ? '발사 양호' :
                        launchScore >= 55 ? '주의 필요' : '발사 불가'}
                  </div>
                </div>
              )}

              {/* 기준 충족 여부 */}
              {criteriaCheck && (
                <div style={{
                  padding: '12px',
                  background: criteriaCheck.met
                    ? 'rgba(76, 175, 80, 0.2)'
                    : 'rgba(244, 67, 54, 0.2)',
                  borderRadius: '12px',
                  border: `1px solid ${criteriaCheck.met ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'}`,
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: criteriaCheck.issues.length > 0 ? '8px' : 0,
                    color: criteriaCheck.met ? '#4caf50' : '#f44336',
                  }}>
                    {criteriaCheck.met ? '✅ 모든 기준 충족' : '⚠️ 기준 미충족'}
                  </div>
                  {criteriaCheck.issues.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.75rem', color: '#f44336' }}>
                      {criteriaCheck.issues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* 기상 조건 입력/표시 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { key: 'windSpeed', label: '풍속', unit: 'm/s', icon: '💨', min: 0, max: 30 },
                  { key: 'windDirection', label: '풍향', unit: '°', icon: '🧭', min: 0, max: 360 },
                  { key: 'precipitation', label: '강수량', unit: 'mm', icon: '🌧️', min: 0, max: 20, step: 0.1 },
                  { key: 'cloudCover', label: '구름량', unit: '%', icon: '☁️', min: 0, max: 100 },
                  { key: 'temperature', label: '기온', unit: '°C', icon: '🌡️', min: -20, max: 50 },
                  { key: 'humidity', label: '습도', unit: '%', icon: '💧', min: 0, max: 100 },
                  { key: 'pressure', label: '기압', unit: 'hPa', icon: '📊', min: 950, max: 1050 },
                  { key: 'crosswind', label: '횡풍', unit: 'm/s', icon: '🌬️', min: 0, max: 20 },
                ].map(field => {
                  const value = useManualWeather
                    ? manualWeather[field.key as keyof CurrentWeather]
                    : activeWeather?.[field.key as keyof CurrentWeather] ?? 0;

                  return (
                    <div key={field.key} style={{ ...cardStyle, padding: '10px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '4px' }}>
                        {field.icon} {field.label}
                      </div>
                      {useManualWeather ? (
                        <input
                          type="number"
                          value={value}
                          min={field.min}
                          max={field.max}
                          step={field.step || 1}
                          onChange={(e) => setManualWeather({
                            ...manualWeather,
                            [field.key]: parseFloat(e.target.value) || 0,
                          })}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            background: 'rgba(255,255,255,0.1)',
                            fontSize: '0.9rem',
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                          {value.toFixed(field.step ? 1 : 0)} {field.unit}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!useManualWeather && center && (
                <button
                  onClick={fetchCurrentWeather}
                  disabled={isLoadingWeather}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(102, 126, 234, 0.2)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: '#667eea',
                  }}
                >
                  🔄 기상 데이터 새로고침
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 48시간 타임라인 탭 */}
      {activeTab === 'timeline' && (
        <div>
          <div style={{ marginBottom: '16px', ...cardStyle, padding: '16px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '1rem' }}>📅 48시간 발사 윈도우 타임라인</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '16px' }}>
              향후 48시간 동안의 기상 조건을 분석하여 발사 가능 시간대를 시각화합니다.
            </p>
            
            {isLoadingForecast ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                기상 예보 데이터를 불러오는 중...
              </div>
            ) : weatherForecast.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                {center ? '기상 예보 데이터를 불러올 수 없습니다.' : '지도를 클릭하여 위치를 선택하세요.'}
              </div>
            ) : (
              <>
                {/* 타임라인 차트 */}
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>발사 가능성 타임라인</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={weatherForecast.map((f) => {
                      const time = new Date(f.time);
                      const hour = time.getHours();
                      const dateStr = `${time.getMonth() + 1}/${time.getDate()} ${hour}시`;
                      
                      // 발사 가능성 점수 계산
                      const conditions = f.conditions;
                      let feasibilityScore = 100;
                      
                      if (conditions.windSpeed < criteria.minWindSpeed || conditions.windSpeed > criteria.maxWindSpeed) {
                        feasibilityScore -= 30;
                      }
                      if (conditions.precipitation > criteria.maxPrecipitation) {
                        feasibilityScore -= 40;
                      }
                      if (conditions.cloudCover > criteria.maxCloudCover) {
                        feasibilityScore -= 20;
                      }
                      if (conditions.crosswind > criteria.maxCrosswind) {
                        feasibilityScore -= 25;
                      }
                      if (conditions.temperature < criteria.minTemperature || conditions.temperature > criteria.maxTemperature) {
                        feasibilityScore -= 15;
                      }
                      
                      feasibilityScore = Math.max(0, feasibilityScore);
                      
                      return {
                        time: dateStr,
                        hour: hour,
                        feasibility: feasibilityScore,
                        windSpeed: conditions.windSpeed,
                        precipitation: conditions.precipitation,
                        cloudCover: conditions.cloudCover,
                        temperature: conditions.temperature,
                        isLaunchWindow: feasibilityScore >= minOverallScore,
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis 
                        dataKey="time" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        fontSize={10}
                      />
                      <YAxis 
                        label={{ value: '발사 가능성 (%)', angle: -90, position: 'insideLeft' }}
                        domain={[0, 100]}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #ccc',
                          borderRadius: '8px'
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'feasibility') return [`${value.toFixed(0)}%`, '발사 가능성'];
                          if (name === 'windSpeed') return [`${value.toFixed(1)} m/s`, '풍속'];
                          if (name === 'precipitation') return [`${value.toFixed(1)} mm`, '강수량'];
                          if (name === 'cloudCover') return [`${value.toFixed(0)}%`, '구름량'];
                          if (name === 'temperature') return [`${value.toFixed(1)}°C`, '기온'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="feasibility" 
                        stroke="#667eea" 
                        fill="#667eea" 
                        fillOpacity={0.6}
                        name="발사 가능성"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="windSpeed" 
                        stroke="#f093fb" 
                        strokeWidth={2}
                        name="풍속 (m/s)"
                        yAxisId={1}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="precipitation" 
                        stroke="#764ba2" 
                        strokeWidth={2}
                        name="강수량 (mm)"
                        yAxisId={2}
                      />
                      <YAxis 
                        yAxisId={1}
                        orientation="right"
                        domain={[0, 30]}
                        label={{ value: '풍속/강수량', angle: 90, position: 'insideRight' }}
                      />
                      <YAxis 
                        yAxisId={2}
                        orientation="right"
                        domain={[0, 50]}
                        hide
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 발사 가능 시간대 목록 */}
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>발사 가능 시간대</h4>
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    display: 'grid',
                    gap: '8px'
                  }}>
                    {weatherForecast.map((f, idx) => {
                      const time = new Date(f.time);
                      const dateStr = `${time.getMonth() + 1}/${time.getDate()} ${time.getHours()}시`;
                      const conditions = f.conditions;
                      
                      let feasibilityScore = 100;
                      if (conditions.windSpeed < criteria.minWindSpeed || conditions.windSpeed > criteria.maxWindSpeed) {
                        feasibilityScore -= 30;
                      }
                      if (conditions.precipitation > criteria.maxPrecipitation) {
                        feasibilityScore -= 40;
                      }
                      if (conditions.cloudCover > criteria.maxCloudCover) {
                        feasibilityScore -= 20;
                      }
                      if (conditions.crosswind > criteria.maxCrosswind) {
                        feasibilityScore -= 25;
                      }
                      feasibilityScore = Math.max(0, feasibilityScore);
                      
                      const isLaunchWindow = feasibilityScore >= minOverallScore;
                      
                      if (!isLaunchWindow) return null;
                      
                      return (
                        <div
                          key={idx}
                          style={{
                            padding: '12px',
                            background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                            ✅ {dateStr} - 발사 가능 ({feasibilityScore.toFixed(0)}점)
                          </div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                            풍속: {conditions.windSpeed.toFixed(1)}m/s | 
                            강수: {conditions.precipitation.toFixed(1)}mm | 
                            구름: {conditions.cloudCover.toFixed(0)}% | 
                            기온: {conditions.temperature.toFixed(1)}°C
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                    
                    {weatherForecast.filter((f) => {
                      const conditions = f.conditions;
                      let feasibilityScore = 100;
                      if (conditions.windSpeed < criteria.minWindSpeed || conditions.windSpeed > criteria.maxWindSpeed) {
                        feasibilityScore -= 30;
                      }
                      if (conditions.precipitation > criteria.maxPrecipitation) {
                        feasibilityScore -= 40;
                      }
                      if (conditions.cloudCover > criteria.maxCloudCover) {
                        feasibilityScore -= 20;
                      }
                      if (conditions.crosswind > criteria.maxCrosswind) {
                        feasibilityScore -= 25;
                      }
                      feasibilityScore = Math.max(0, feasibilityScore);
                      return feasibilityScore >= minOverallScore;
                    }).length === 0 && (
                      <div style={{ 
                        padding: '16px', 
                        textAlign: 'center', 
                        color: '#666',
                        background: '#f5f5f5',
                        borderRadius: '8px'
                      }}>
                        향후 48시간 동안 발사 가능한 시간대가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 분석 결과 탭 */}
      {activeTab === 'results' && (
        <div>
          {currentAnalysis && (
            <div style={{
              padding: '16px',
              ...cardStyle,
              marginBottom: '16px',
              border: `2px solid ${getFeasibilityColor(currentAnalysis.launchFeasibility)}`,
            }}>
              <div style={{
                padding: '16px',
                background: `linear-gradient(135deg, ${getFeasibilityColor(currentAnalysis.launchFeasibility)} 0%, ${getFeasibilityColor(currentAnalysis.launchFeasibility)}dd 100%)`,
                borderRadius: '8px',
                color: 'white',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                  {currentAnalysis.overallScore.toFixed(0)}점
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                  발사 가능성: {getFeasibilityLabel(currentAnalysis.launchFeasibility)}
                </div>
              </div>

              {/* 세부 점수 차트 */}
              <div style={{ marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart 
                    data={[
                      { 
                        name: '기상', 
                        score: currentAnalysis.details.weatherScore || 0,
                      },
                      { 
                        name: '위험', 
                        score: currentAnalysis.details.riskScore || 0,
                      },
                      { 
                        name: '환경', 
                        score: currentAnalysis.details.environmentScore || 0,
                      },
                    ]} 
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={40} />
                    <Tooltip 
                      formatter={(value: any) => {
                        const numValue = typeof value === 'number' ? value : parseFloat(value) || 0;
                        return `${numValue.toFixed(1)}점`;
                      }}
                    />
                    <Bar 
                      dataKey="score" 
                      radius={[0, 4, 4, 0]}
                      shape={(props: any) => {
                        const { payload, x, y, width, height } = props;
                        let fillColor = '#667eea';
                        
                        if (payload.name === '기상') {
                          fillColor = '#2196f3';
                        } else if (payload.name === '위험') {
                          const riskScore = payload.score || 0;
                          fillColor = riskScore >= 80 ? '#4caf50' : riskScore >= 60 ? '#ff9800' : '#f44336';
                        } else if (payload.name === '환경') {
                          fillColor = '#9c27b0';
                        }
                        
                        return (
                          <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={fillColor}
                            rx={4}
                            ry={4}
                          />
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px', textAlign: 'center' }}>
                  위험 점수: {currentAnalysis.details.riskScore?.toFixed(1) || '0.0'}점
                  {currentAnalysis.details.riskScore !== undefined && (
                    <span style={{ marginLeft: '8px', color: currentAnalysis.details.riskScore >= 80 ? '#4caf50' : currentAnalysis.details.riskScore >= 60 ? '#ff9800' : '#f44336' }}>
                      ({currentAnalysis.details.riskScore >= 80 ? '양호' : currentAnalysis.details.riskScore >= 60 ? '보통' : '위험'})
                    </span>
                  )}
                </div>
              </div>

              {/* 위험도 요약 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                {[
                  { label: '침수', value: currentAnalysis.risks.floodRisk },
                  { label: '산사태', value: currentAnalysis.risks.landslideRisk },
                  { label: '폭염', value: currentAnalysis.risks.heatRisk },
                  { label: '대기질', value: currentAnalysis.risks.airQuality },
                ].map(risk => (
                  <div key={risk.label} style={{
                    padding: '8px',
                    background: risk.value === 'high' || risk.value === 'poor'
                      ? 'rgba(244,67,54,0.2)'
                      : risk.value === 'medium' || risk.value === 'moderate'
                        ? 'rgba(255,152,0,0.2)'
                        : 'rgba(76,175,80,0.2)',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span>{risk.label}</span>
                    <span style={{
                      fontWeight: 600,
                      color: risk.value === 'high' || risk.value === 'poor'
                        ? '#f44336'
                        : risk.value === 'medium' || risk.value === 'moderate'
                          ? '#ff9800'
                          : '#4caf50',
                    }}>
                      {risk.value === 'high' || risk.value === 'poor' ? '위험' :
                        risk.value === 'medium' || risk.value === 'moderate' ? '주의' : '양호'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {launchWindows.length > 0 && (
            <div>
              <h4 style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                발견된 발사 윈도우: {launchWindows.length}개
              </h4>

              {/* 차트 */}
              <div style={{ marginBottom: '16px' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="종합점수" stroke="#667eea" strokeWidth={2} />
                    <Line type="monotone" dataKey="기상점수" stroke="#4caf50" />
                    <Line type="monotone" dataKey="환경점수" stroke="#2196f3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 윈도우 목록 */}
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {launchWindows.slice(0, 5).map((window, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedWindow(window);
                      setCurrentAnalysis(window.analysis);
                    }}
                    style={{
                      padding: '12px',
                      ...cardStyle,
                      marginBottom: '8px',
                      cursor: 'pointer',
                      border: selectedWindow === window
                        ? '2px solid #667eea'
                        : '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {index === 0 && '⭐ '}
                          {new Date(window.startTime).toLocaleString('ko-KR')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                          종합 {window.overallScore.toFixed(0)}점
                        </div>
                      </div>
                      <div style={{
                        fontSize: '1.2rem',
                        color: getFeasibilityColor(window.launchFeasibility),
                      }}>
                        {window.overallScore >= 85 ? '🟢' :
                          window.overallScore >= 70 ? '🟡' :
                            window.overallScore >= 55 ? '🟠' : '🔴'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 횡풍 시뮬레이터 토글 */}
      {center && (
        <div style={{ marginTop: '16px', ...cardStyle, padding: '12px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}>
            <input
              type="checkbox"
              checked={showTrajectory}
              onChange={(e) => {
                const checked = e.target.checked;
                setShowTrajectory(checked);
                const event = new CustomEvent('toggleCrosswindSimulator', { 
                  detail: checked,
                  bubbles: true 
                });
                window.dispatchEvent(event);
              }}
            />
            <span>🚀 지도에 발사 궤적 표시</span>
          </label>
          {showTrajectory && (
            <div style={{ marginTop: '0.75rem', marginLeft: '24px' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="trajectoryMode"
                    checked={localTrajectoryMode === 'azimuth'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalTrajectoryMode('azimuth');
                        const event = new CustomEvent('setTrajectoryMode', { detail: 'azimuth', bubbles: true });
                        window.dispatchEvent(event);
                      }
                    }}
                  />
                  <span>방위각 기반 궤적</span>
                </label>
                <label style={{ fontSize: '0.85rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="trajectoryMode"
                    checked={localTrajectoryMode === 'markers'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setLocalTrajectoryMode('markers');
                        const event = new CustomEvent('setTrajectoryMode', { detail: 'markers', bubbles: true });
                        window.dispatchEvent(event);
                      }
                    }}
                  />
                  <span>마커 경로 기반 궤적</span>
                </label>
              </div>
              <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
                발사 방위각: {launchAzimuth}° (0°=북, 90°=동, 180°=남, 270°=서)
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={launchAzimuth}
                onChange={(e) => {
                  const azimuth = parseInt(e.target.value, 10);
                  setLaunchAzimuth(azimuth);
                  // 방위각 변경 시 궤적 업데이트를 위해 이벤트 재발송
                  if (showTrajectory) {
                    const event = new CustomEvent('updateLaunchAzimuth', { 
                      detail: azimuth,
                      bubbles: true 
                    });
                    window.dispatchEvent(event);
                  }
                }}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                <span>0°</span>
                <span>90°</span>
                <span>180°</span>
                <span>270°</span>
                <span>360°</span>
              </div>
              {localTrajectoryMode === 'markers' && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#e3f2fd', borderRadius: '6px', fontSize: '0.85rem', border: '2px solid #2196f3' }}>
                  <div style={{ marginBottom: '0.5rem', fontWeight: '600', color: '#1976d2' }}>📍 마커 경로 설정</div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                    지도를 클릭하여 궤적 경로의 마커를 추가하세요. 마커를 순서대로 찍으면 그 경로가 궤적으로 표시됩니다.
                  </div>
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#1976d2', fontWeight: '600' }}>
                    💡 현재 마커 모드: 지도 클릭 시 마커가 추가됩니다
                  </div>
                  <button
                    onClick={() => {
                      const event = new CustomEvent('clearTrajectoryMarkers', { bubbles: true });
                      window.dispatchEvent(event);
                    }}
                    style={{
                      padding: '0.5rem',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      width: '100%',
                    }}
                  >
                    🗑️ 마커 경로 초기화
                  </button>
                </div>
              )}
            </div>
          )}
          <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', marginLeft: '24px' }}>
            발사 경로와 고도별 횡풍 영향을 시각화합니다.
          </p>
        </div>
      )}

      {/* 분석 버튼 */}
      <div style={{ display: 'grid', gap: '8px', marginTop: '16px' }}>
        <button
          onClick={analyzeCurrentEnvironment}
          disabled={!center || isAnalyzing}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #4caf50, #8bc34a)',
            border: 'none',
            borderRadius: '8px',
            cursor: center && !isAnalyzing ? 'pointer' : 'not-allowed',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.9rem',
            opacity: !center || isAnalyzing ? 0.6 : 1,
          }}
        >
          {isAnalyzing ? '분석 중...' : '🔍 현재 환경 종합 분석'}
        </button>
        <button
          onClick={analyzeLaunchWindows}
          disabled={!center || isAnalyzing}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            border: 'none',
            borderRadius: '8px',
            cursor: center && !isAnalyzing ? 'pointer' : 'not-allowed',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.9rem',
            opacity: !center || isAnalyzing ? 0.6 : 1,
          }}
        >
          {isAnalyzing ? '분석 중...' : '🚀 48시간 발사 윈도우 예측'}
        </button>
      </div>
    </div>
  );
}
