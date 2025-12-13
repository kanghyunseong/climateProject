import { useState, useEffect } from 'react';
import { getAirQualityData } from '../services/weatherApi';
import { loadUserPreferences, saveUserPreferences, type UserPreferences } from '../services/userPreferencesService';

interface AirQuality {
  pm25: number;
  pm10: number;
  ozone: number;
  temperature: number;
  feelsLike: number;
}

interface IndoorFacility {
  name: string;
  type: string;
  distance: number;
  airQuality: 'good' | 'moderate' | 'poor';
  address: string;
}

interface AirVibeProps {
  center?: { lat: number; lng: number };
}

export default function AirVibe({ center }: AirVibeProps) {
  const [airQuality, setAirQuality] = useState<AirQuality | null>(null);
  const [activityScore, setActivityScore] = useState<number | null>(null);
  const [indoorFacilities, setIndoorFacilities] = useState<IndoorFacility[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 사용자 건강 정보 (localStorage에서 불러오기)
  const [userPrefs, setUserPrefs] = useState<UserPreferences>(() => loadUserPreferences());
  const [showPreferences, setShowPreferences] = useState(false);
  const [showAirQualityMap, setShowAirQualityMap] = useState(false);

  // 사용자 설정 저장
  useEffect(() => {
    saveUserPreferences(userPrefs);
  }, [userPrefs]);

  // 활동 적합도 지수 계산 (0-100점) - 사용자 건강 정보 반영
  const calculateActivityScore = (aq: AirQuality): number => {
    let score = 100;
    const sensitivity = userPrefs.sensitivityLevel || 'medium';

    // 민감도에 따른 가중치 조정
    const sensitivityMultiplier = sensitivity === 'high' ? 1.5 : sensitivity === 'medium' ? 1.2 : 1.0;

    // PM2.5 점수 (0-15 좋음, 15-35 보통, 35-75 나쁨, 75+ 매우나쁨)
    if (aq.pm25 > 75) score -= 40 * sensitivityMultiplier;
    else if (aq.pm25 > 35) score -= 25 * sensitivityMultiplier;
    else if (aq.pm25 > 15) score -= 10 * sensitivityMultiplier;
    
    // 천식 환자일 경우 추가 감점
    if (userPrefs.hasAsthma && aq.pm25 > 15) {
      score -= 15;
    }

    // PM10 점수
    if (aq.pm10 > 150) score -= 30 * sensitivityMultiplier;
    else if (aq.pm10 > 80) score -= 20 * sensitivityMultiplier;
    else if (aq.pm10 > 30) score -= 10 * sensitivityMultiplier;

    // 오존 점수
    if (aq.ozone > 0.12) score -= 20 * sensitivityMultiplier;
    else if (aq.ozone > 0.09) score -= 10 * sensitivityMultiplier;
    
    // 알레르기 환자일 경우 오존에 더 민감
    if (userPrefs.hasAllergies && aq.ozone > 0.09) {
      score -= 10;
    }

    // 체감 온도 점수 (15-25도가 이상적)
    if (aq.feelsLike < 0 || aq.feelsLike > 35) score -= 30;
    else if (aq.feelsLike < 5 || aq.feelsLike > 30) score -= 20;
    else if (aq.feelsLike < 10 || aq.feelsLike > 25) score -= 10;

    return Math.max(0, Math.min(100, score));
  };

  // 대기질 데이터 가져오기 및 분석
  const analyzeAirQuality = async () => {
    if (!center) {
      alert('지도를 클릭하여 위치를 선택하세요.');
      return;
    }

    setIsLoading(true);
    try {
      // 실제 API에서 대기질 데이터 가져오기 (실패 시 목업 데이터 자동 사용)
      const airData = await getAirQualityData(center.lat, center.lng);

      if (!airData) {
        // 목업 데이터도 실패한 경우에만 오류 표시
        alert('대기질 데이터를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
        setIsLoading(false);
        return;
      }

      const airQuality: AirQuality = {
        pm25: airData.pm25,
        pm10: airData.pm10,
        ozone: airData.ozone,
        temperature: airData.temperature,
        feelsLike: airData.feelsLike,
      };

      setAirQuality(airQuality);
      const score = calculateActivityScore(airQuality);
      setActivityScore(score);

      // 실내 시설 추천 (점수가 낮을 때)
      if (score < 60) {
        const facilities: IndoorFacility[] = [
          { name: '경기도청 도서관', type: '도서관', distance: 1.2, airQuality: 'good', address: '수원시 영통구' },
          { name: '수원시청 체육관', type: '체육관', distance: 2.5, airQuality: 'good', address: '수원시 팔달구' },
          { name: '성남시 문화센터', type: '문화시설', distance: 3.8, airQuality: 'moderate', address: '성남시 분당구' },
          { name: '용인시 실내수영장', type: '수영장', distance: 5.2, airQuality: 'good', address: '용인시 기흥구' },
        ];
        setIndoorFacilities(facilities);
      } else {
        setIndoorFacilities([]);
      }
    } catch (error) {
      console.error('대기질 분석 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return '적합';
    if (score >= 60) return '보통';
    return '부적합';
  };

  const getHealthImpact = (score: number): string => {
    if (score >= 80) return '야외 활동에 적합합니다.';
    if (score >= 60) return '민감한 분들은 주의가 필요합니다.';
    return '야외 활동을 피하고 실내 활동을 권장합니다.';
  };

  return (
    <div className="air-vibe">
      <h3>💨 미세먼지 기반 실내 활동 최적화 (AirVibe)</h3>

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
          ⚠️ 지도를 클릭하여 위치를 선택하세요.
        </div>
      )}

      {/* 개인 맞춤 설정 */}
      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={() => setShowPreferences(!showPreferences)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: showPreferences ? 'rgba(102, 126, 234, 0.3)' : 'rgba(30, 41, 59, 0.6)',
            color: showPreferences ? '#a78bfa' : '#f1f5f9',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: '600',
            marginBottom: showPreferences ? '0.75rem' : '0',
          }}
        >
          {showPreferences ? '✕ 설정 닫기' : '⚙️ 개인 맞춤 설정'}
        </button>

        {showPreferences && (
          <div style={{
            padding: '1rem',
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#f1f5f9',
          }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={userPrefs.hasAsthma || false}
                  onChange={(e) => setUserPrefs({ ...userPrefs, hasAsthma: e.target.checked })}
                />
                <span>천식 환자</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={userPrefs.hasAllergies || false}
                  onChange={(e) => setUserPrefs({ ...userPrefs, hasAllergies: e.target.checked })}
                />
                <span>알레르기 환자</span>
              </label>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                민감도 수준:
              </label>
              <select
                value={userPrefs.sensitivityLevel || 'medium'}
                onChange={(e) => setUserPrefs({ ...userPrefs, sensitivityLevel: e.target.value as 'low' | 'medium' | 'high' })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '0.85rem',
                }}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                선호 활동:
              </label>
              <select
                value={userPrefs.preferredActivity || 'both'}
                onChange={(e) => setUserPrefs({ ...userPrefs, preferredActivity: e.target.value as 'outdoor' | 'indoor' | 'both' })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '0.85rem',
                }}
              >
                <option value="both">실내/야외 모두</option>
                <option value="outdoor">야외 활동 선호</option>
                <option value="indoor">실내 활동 선호</option>
              </select>
            </div>

            <div style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              background: 'rgba(96, 165, 250, 0.15)',
              border: '1px solid rgba(96, 165, 250, 0.3)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#60a5fa',
            }}>
              💡 설정은 자동으로 저장되며, 다음 방문 시에도 유지됩니다.
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={analyzeAirQuality}
          disabled={!center || isLoading}
          className="action-btn primary"
          style={{ width: '100%' }}
        >
          {isLoading ? '분석 중...' : '활동 적합도 분석'}
        </button>

        {/* 공기질 지도 표시 토글 */}
        {center && (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem',
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: '#f1f5f9',
          }}>
            <input
              type="checkbox"
              checked={showAirQualityMap}
              onChange={(e) => {
                setShowAirQualityMap(e.target.checked);
                // 부모 컴포넌트에 상태 전달 (App.tsx에서 관리)
                const event = new CustomEvent('toggleAirQualityMap', { detail: e.target.checked });
                window.dispatchEvent(event);
              }}
            />
            <span>🗺️ 지도에 공기질 표시</span>
          </label>
        )}
      </div>

      {/* 활동 적합도 지수 */}
      {activityScore !== null && airQuality && (
        <div>
          <div style={{
            padding: '1.5rem',
            background: `linear-gradient(135deg, ${getScoreColor(activityScore)} 0%, ${getScoreColor(activityScore)}dd 100%)`,
            borderRadius: '12px',
            color: 'white',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {activityScore.toFixed(0)}점
            </div>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>
              {getScoreLabel(activityScore)}
            </div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
              {getHealthImpact(activityScore)}
            </div>
          </div>

          {/* 대기질 상세 정보 */}
          <div style={{
            padding: '1rem',
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#f1f5f9' }}>대기질 상세 정보</h4>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>PM2.5:</span>
                <span style={{ fontWeight: '600', color: '#f1f5f9' }}>{airQuality.pm25.toFixed(1)} ㎍/㎥</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>PM10:</span>
                <span style={{ fontWeight: '600', color: '#f1f5f9' }}>{airQuality.pm10.toFixed(1)} ㎍/㎥</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>오존:</span>
                <span style={{ fontWeight: '600', color: '#f1f5f9' }}>{airQuality.ozone.toFixed(3)} ppm</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>체감 온도:</span>
                <span style={{ fontWeight: '600', color: '#f1f5f9' }}>{airQuality.feelsLike.toFixed(1)}°C</span>
              </div>
            </div>
          </div>

          {/* 실내 시설 추천 */}
          {indoorFacilities.length > 0 && (
            <div>
              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', color: '#f1f5f9' }}>
                🏢 추천 실내 시설 ({indoorFacilities.length}개)
              </h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {indoorFacilities.map((facility, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '0.75rem',
                      background: 'rgba(30, 41, 59, 0.6)',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#f1f5f9' }}>
                      {facility.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {facility.type} | 거리: {facility.distance.toFixed(1)}km
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                      {facility.address}
                    </div>
                    <div style={{
                      display: 'inline-block',
                      padding: '0.25rem 0.5rem',
                      background: facility.airQuality === 'good' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                      border: `1px solid ${facility.airQuality === 'good' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      marginTop: '0.25rem',
                      color: facility.airQuality === 'good' ? '#4ade80' : '#fbbf24',
                    }}>
                      공기질: {facility.airQuality === 'good' ? '좋음' : '보통'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

