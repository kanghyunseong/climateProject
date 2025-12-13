import { useState, useEffect } from 'react';
import { getFloodRiskData, getWeatherDataForLaunch } from '../services/weatherApi';
import { predictFloodWithAI, type FloodPredictionInput, type FloodPredictionOutput } from '../services/floodPrediction';

interface FloodRiskPoint {
  lat: number;
  lng: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  precipitation: number;
  elevation: number;
  predictedFlood: number;
}

interface FloodGuardProps {
  center?: { lat: number; lng: number };
  onHeatmapDataUpdate?: (data: Array<{ lat: number; lng: number; intensity: number; name?: string }>) => void;
}

export default function FloodGuard({ center, onHeatmapDataUpdate }: FloodGuardProps) {
  const [floodRisks, setFloodRisks] = useState<FloodRiskPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(70);
  const [alerts, setAlerts] = useState<Array<{ location: string; time: string; risk: number }>>([]);
  const [useAI, setUseAI] = useState(false); // AI 사용 여부 (기본값: false - 규칙 기반만 사용)
  const [aiPrediction, setAiPrediction] = useState<FloodPredictionOutput | null>(null);

  // 침수 위험도 계산
  const calculateFloodRisk = async () => {
    if (!center) {
      alert('지도를 클릭하여 분석할 지역을 선택하세요.');
      return;
    }

    setIsAnalyzing(true);
    setAiPrediction(null);
    
    try {
      // 기상 데이터 가져오기
      const weatherData = await getWeatherDataForLaunch(center.lat, center.lng);
      
      // 기본 기상 데이터 (API에서 가져오지 못한 경우)
      const defaultWeather = {
        precipitation: 0,
        temperature: 20,
        humidity: 60,
        windSpeed: 5,
      };

      // AI를 사용하는 경우
      if (useAI) {
        try {
          // Groq AI 모델 호출 (rate limit 처리 포함)
          const aiInput: FloodPredictionInput = {
            lat: center.lat,
            lng: center.lng,
            precipitation: weatherData?.precipitation || defaultWeather.precipitation,
            elevation: 50, // 기본값 (실제로는 지형 데이터에서 가져와야 함)
            temperature: weatherData?.temperature || defaultWeather.temperature,
            humidity: weatherData?.humidity || defaultWeather.humidity,
            windSpeed: weatherData?.windSpeed || defaultWeather.windSpeed,
          };

          const aiResult = await predictFloodWithAI(aiInput, true);
          setAiPrediction(aiResult);

          // AI 결과를 기반으로 위험 지역 생성
          const aiRisks: FloodRiskPoint[] = [{
            lat: center.lat,
            lng: center.lng,
            riskLevel: aiResult.riskLevel,
            precipitation: aiInput.precipitation,
            elevation: aiInput.elevation,
            predictedFlood: aiResult.predictedFloodDepth,
          }];

          setFloodRisks(aiRisks);

          // 히트맵 데이터 업데이트
          if (onHeatmapDataUpdate) {
            onHeatmapDataUpdate(
              aiRisks.map(r => ({
                lat: r.lat,
                lng: r.lng,
                intensity: r.riskLevel === 'critical' ? 1.0 : r.riskLevel === 'high' ? 0.9 : r.riskLevel === 'medium' ? 0.6 : 0.3,
                name: `AI 침수 예보: ${r.riskLevel === 'critical' ? '매우 높음' : r.riskLevel === 'high' ? '높음' : r.riskLevel === 'medium' ? '보통' : '낮음'} (신뢰도: ${(aiResult.confidence * 100).toFixed(0)}%)`,
              }))
            );
          }

          // 경고 알림 생성
          const riskScore = aiResult.riskLevel === 'critical' ? 95 : aiResult.riskLevel === 'high' ? 90 : aiResult.riskLevel === 'medium' ? 60 : 30;
          if (riskScore >= alertThreshold) {
            const newAlerts = [{
              location: `${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}`,
              time: aiResult.timeToFlood 
                ? new Date(Date.now() + aiResult.timeToFlood * 60 * 1000).toLocaleString('ko-KR')
                : new Date(Date.now() + 60 * 60 * 1000).toLocaleString('ko-KR'),
              risk: riskScore,
            }];
            setAlerts(newAlerts);

            // 브라우저 알림
            if (Notification.permission === 'granted') {
              new Notification('AI 침수 위험 경고', {
                body: `침수 위험이 감지되었습니다. 예상 침수 깊이: ${aiResult.predictedFloodDepth.toFixed(2)}m`,
              });
            }
          } else {
            setAlerts([]);
          }
        } catch (aiError: any) {
          // API 키가 없는 경우 사용자에게 알림
          if (aiError.code === 'GROQ_API_KEY_NOT_SET' || aiError.message?.includes('GROQ_API_KEY')) {
            console.warn('Groq API 키가 설정되지 않았습니다. 기본 방법을 사용합니다.');
            // AI 체크박스 자동 해제하지 않고, 기본 방법으로 폴백
          } else {
            console.error('AI 예보 실패, 기본 방법으로 폴백:', aiError);
          }
          // 아래 기본 로직으로 폴백
        }
      }

      // AI를 사용하지 않거나 AI 실패 시 기본 방법 사용
      if (!useAI || !aiPrediction) {
        const risks = await getFloodRiskData(center.lat, center.lng, 0.2);

        if (risks.length === 0) {
          alert('침수 위험도 데이터를 가져올 수 없습니다.');
          setIsAnalyzing(false);
          return;
        }

        setFloodRisks(risks);

        // 히트맵 데이터 업데이트
        if (onHeatmapDataUpdate) {
          onHeatmapDataUpdate(
            risks.map(r => ({
              lat: r.lat,
              lng: r.lng,
              intensity: (r.riskLevel === 'critical' ? 1.0 : r.riskLevel === 'high' ? 0.9 : r.riskLevel === 'medium' ? 0.6 : 0.3) as number,
              name: `침수 위험도: ${r.riskLevel === 'critical' ? '매우 높음' : r.riskLevel === 'high' ? '높음' : r.riskLevel === 'medium' ? '보통' : '낮음'}`,
            }))
          );
        }

        // 경고 알림 생성
        const newAlerts = risks
          .filter(r => {
            const riskScore = (r.riskLevel === 'critical' ? 95 : r.riskLevel === 'high' ? 90 : r.riskLevel === 'medium' ? 60 : 30) as number;
            return riskScore >= alertThreshold;
          })
          .map(r => ({
            location: `${r.lat.toFixed(2)}, ${r.lng.toFixed(2)}`,
            time: new Date(Date.now() + 60 * 60 * 1000).toLocaleString('ko-KR'),
            risk: r.riskLevel === 'high' ? 90 : r.riskLevel === 'medium' ? 60 : 30,
          }));

        setAlerts(newAlerts);

        // 브라우저 알림
        if (newAlerts.length > 0 && Notification.permission === 'granted') {
          new Notification('침수 위험 경고', {
            body: `${newAlerts.length}개 지역에서 침수 위험이 감지되었습니다.`,
          });
        }
      }
    } catch (error) {
      console.error('침수 위험 분석 실패:', error);
      alert('침수 위험도 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const riskColor = (level: string) => {
    switch (level) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#999';
    }
  };

  const riskLabel = (level: string) => {
    switch (level) {
      case 'critical': return '매우 높음';
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="flood-guard">
      <h3>☔ AI 기반 도시 침수 예보 (FloodGuard)</h3>

      {!center && (
        <div style={{
          padding: '1rem',
          background: 'rgba(251, 191, 36, 0.15)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.85rem',
          color: '#fbbf24'
        }}>
          ⚠️ 지도를 클릭하여 분석할 지역을 선택하세요.
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>🤖 Groq AI 사용</span>
        </label>
        {useAI && (
          <div style={{
            padding: '0.5rem',
            background: import.meta.env.VITE_GROQ_API_KEY ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)',
            border: `1px solid ${import.meta.env.VITE_GROQ_API_KEY ? 'rgba(74, 222, 128, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: import.meta.env.VITE_GROQ_API_KEY ? '#4ade80' : '#fbbf24',
            marginBottom: '0.5rem'
          }}>
            {import.meta.env.VITE_GROQ_API_KEY
              ? '✅ Groq API 키가 설정되었습니다.'
              : '⚠️ Groq API 키가 설정되지 않았습니다. .env 파일에 VITE_GROQ_API_KEY를 추가하세요. API 키가 없으면 기본 방법을 사용합니다.'}
          </div>
        )}
        {!useAI && (
          <div style={{
            padding: '0.5rem',
            background: 'rgba(96, 165, 250, 0.15)',
            border: '1px solid rgba(96, 165, 250, 0.3)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: '#60a5fa',
            marginBottom: '0.5rem'
          }}>
            ✅ 규칙 기반 분석 사용 중 (무료, 정확도 높음). 수문학 공식 기반으로 침수 위험도를 계산합니다.
          </div>
        )}
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
          경고 임계값: {alertThreshold}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={alertThreshold}
          onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      <button
        onClick={calculateFloodRisk}
        disabled={!center || isAnalyzing}
        className="action-btn primary"
        style={{ width: '100%', marginBottom: '1rem' }}
      >
        {isAnalyzing ? '분석 중...' : '침수 위험도 분석'}
      </button>

      {/* 경고 알림 */}
      {alerts.length > 0 && (
        <div style={{
          padding: '1rem',
          background: 'rgba(248, 113, 113, 0.15)',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '2px solid #f87171',
        }}>
          <div style={{ fontWeight: '600', color: '#f87171', marginBottom: '0.5rem' }}>
            🚨 1시간 내 침수 위험 경고 ({alerts.length}개)
          </div>
          <div style={{ fontSize: '0.85rem', maxHeight: '150px', overflowY: 'auto', color: '#f1f5f9' }}>
            {alerts.map((alert, index) => (
              <div key={index} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(248, 113, 113, 0.3)' }}>
                <div>위치: {alert.location}</div>
                <div>예상 시간: {alert.time}</div>
                <div>위험도: {alert.risk}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 예보 결과 */}
      {aiPrediction && useAI && (
        <div style={{
          padding: '1rem',
          background: 'rgba(96, 165, 250, 0.15)',
          borderRadius: '8px',
          marginBottom: '1rem',
          border: '2px solid #60a5fa',
        }}>
          <div style={{ fontWeight: '600', color: '#60a5fa', marginBottom: '0.5rem' }}>
            🤖 AI 예보 결과 (Groq)
          </div>
          <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#f1f5f9' }}>
            <div><strong>위험도:</strong> {riskLabel(aiPrediction.riskLevel)} ({aiPrediction.riskLevel === 'critical' ? 95 : aiPrediction.riskLevel === 'high' ? 90 : aiPrediction.riskLevel === 'medium' ? 60 : 30}%)</div>
            <div><strong>예상 침수 깊이:</strong> {aiPrediction.predictedFloodDepth.toFixed(2)}m</div>
            <div><strong>신뢰도:</strong> {(aiPrediction.confidence * 100).toFixed(0)}%</div>
            {aiPrediction.timeToFlood && (
              <div><strong>침수까지 예상 시간:</strong> {aiPrediction.timeToFlood}분</div>
            )}
            {aiPrediction.recommendations && aiPrediction.recommendations.length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>권장사항:</strong>
                <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem', color: '#cbd5e1' }}>
                  {aiPrediction.recommendations.map((rec, idx) => (
                    <li key={idx} style={{ fontSize: '0.8rem' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 위험 지역 목록 */}
      {floodRisks.length > 0 && (
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            {useAI ? 'AI 분석 결과' : '침수 위험 지역'} ({floodRisks.length}개)
          </h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {floodRisks.map((risk, index) => (
              <div
                key={index}
                style={{
                  padding: '0.75rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  borderLeft: `4px solid ${riskColor(risk.riskLevel)}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <div style={{ fontWeight: '600' }}>
                    {risk.riskLevel === 'critical' ? '🚨' : risk.riskLevel === 'high' ? '🔴' : risk.riskLevel === 'medium' ? '🟡' : '🟢'} 
                    {' '}{riskLabel(risk.riskLevel)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    위험도: {risk.riskLevel === 'critical' ? 95 : risk.riskLevel === 'high' ? 90 : risk.riskLevel === 'medium' ? 60 : 30}%
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>
                  강수량: {risk.precipitation.toFixed(1)}mm | 
                  고도: {risk.elevation}m | 
                  예상 침수: {risk.predictedFlood.toFixed(1)}m
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

