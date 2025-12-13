// 공기질 지도 컴포넌트
// 지도에 공기질 데이터를 히트맵/마커로 표시

import { useState, useEffect } from 'react';
import { Circle, Popup } from 'react-leaflet';
import {
  collectAirQualityData,
  getAirQualityPoint,
  getAirQualityColor,
  type AirQualityMapPoint,
} from '../services/airQualityMapService';

interface AirQualityMapProps {
  center?: { lat: number; lng: number };
  enabled: boolean;
  mode: 'single' | 'grid'; // 단일 위치 또는 격자 수집
  radius?: number;
  gridSize?: number;
}

export default function AirQualityMap({
  center,
  enabled,
  mode = 'single',
  radius = 0.1,
  gridSize = 5,
}: AirQualityMapProps) {
  const [airQualityPoints, setAirQualityPoints] = useState<AirQualityMapPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !center) {
      setAirQualityPoints([]);
      return;
    }

    const loadAirQualityData = async () => {
      setIsLoading(true);
      try {
        if (mode === 'single') {
          // 단일 위치
          const point = await getAirQualityPoint(center.lat, center.lng);
          if (point) {
            setAirQualityPoints([point]);
          }
        } else {
          // 격자 수집
          const points = await collectAirQualityData(center.lat, center.lng, radius, gridSize);
          setAirQualityPoints(points);
        }
      } catch (error) {
        console.error('공기질 지도 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAirQualityData();
  }, [enabled, center, mode, radius, gridSize]);

  if (!enabled || airQualityPoints.length === 0) {
    return null;
  }

  return (
    <>
      {airQualityPoints.map((point, index) => {
        const color = getAirQualityColor(point.quality);
        const radiusMeters = 500 + (point.score / 100) * 1500; // 500m ~ 2000m

        return (
          <Circle
            key={`air-quality-${index}`}
            center={[point.lat, point.lng]}
            radius={radiusMeters}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.4,
              weight: 2,
              opacity: 0.8,
            }}
          >
            <Popup>
              <div style={{ padding: '10px', minWidth: '180px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                  공기질 정보
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>등급:</span>{' '}
                  <span style={{ color: color }}>
                    {point.quality === 'good' ? '좋음' :
                     point.quality === 'moderate' ? '보통' :
                     point.quality === 'unhealthy' ? '나쁨' : '매우 나쁨'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>점수:</span> {point.score.toFixed(0)}점
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                  <div>PM2.5: {point.pm25.toFixed(1)} ㎍/㎥</div>
                  <div>PM10: {point.pm10.toFixed(1)} ㎍/㎥</div>
                  <div>오존: {point.ozone.toFixed(3)} ppm</div>
                  <div>체감온도: {point.feelsLike.toFixed(1)}°C</div>
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
      
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.9)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          fontSize: '0.85rem',
        }}>
          공기질 데이터 수집 중...
        </div>
      )}
    </>
  );
}

