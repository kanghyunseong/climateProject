// 경로 횡풍 시뮬레이터 컴포넌트
// 발사 궤적과 고도별 횡풍 벡터를 시각화

import { useState, useEffect } from 'react';
import { Circle, Polyline, Popup } from 'react-leaflet';
import { getWeatherForecast } from '../services/weatherApi';

interface LaunchTrajectory {
  lat: number;
  lng: number;
  altitude: number; // 고도 (m)
  crosswind: number; // 횡풍 (m/s)
  windDirection: number; // 풍향 (도)
  time: number; // 발사 후 경과 시간 (초)
}

interface CrosswindSimulatorProps {
  center?: { lat: number; lng: number };
  enabled: boolean;
  launchAzimuth?: number; // 발사 방위각 (도, 기본값: 북쪽 0도)
  maxAltitude?: number; // 최대 고도 (m, 기본값: 10000m)
  customTrajectory?: Array<{ lat: number; lng: number }>; // 사용자 정의 궤적 경로 (마커 경로)
}

export default function CrosswindSimulator({
  center,
  enabled,
  launchAzimuth = 0,
  maxAltitude = 10000,
  customTrajectory,
}: CrosswindSimulatorProps) {
  const [trajectory, setTrajectory] = useState<LaunchTrajectory[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setTrajectory([]);
      return;
    }

    // 사용자 정의 궤적 경로가 있으면 사용
    if (customTrajectory && customTrajectory.length > 0) {
      console.log(`[발사궤적] 사용자 정의 경로 감지: ${customTrajectory.length}개 마커`);
      const calculateCustomTrajectory = async () => {
        setIsCalculating(true);
        try {
          const trajectoryPoints: LaunchTrajectory[] = [];
          const totalMarkers = customTrajectory.length;
          
          // 기상 데이터 가져오기 (첫 번째 마커 위치 기준)
          let baseConditions;
          try {
            const forecast = await getWeatherForecast(customTrajectory[0].lat, customTrajectory[0].lng);
            baseConditions = forecast.length > 0 ? forecast[0].conditions : {
              windSpeed: 5,
              windDirection: 0,
              precipitation: 0,
              cloudCover: 30,
              temperature: 20,
              humidity: 60,
              pressure: 1013,
              crosswind: 3,
            };
          } catch (error) {
            console.debug('기상 데이터 가져오기 실패, 기본값 사용:', error);
            baseConditions = {
              windSpeed: 5,
              windDirection: 0,
              precipitation: 0,
              cloudCover: 30,
              temperature: 20,
              humidity: 60,
              pressure: 1013,
              crosswind: 3,
            };
          }
          
          // 마커 사이를 보간하여 부드러운 궤적 생성
          for (let i = 0; i < totalMarkers; i++) {
            const startPoint = customTrajectory[i];
            const endPoint = customTrajectory[i + 1];
            
            if (!endPoint) {
              // 마지막 마커
              const progress = i / Math.max(1, totalMarkers - 1);
              const altitude = progress * maxAltitude;
              
              trajectoryPoints.push({
                lat: startPoint.lat,
                lng: startPoint.lng,
                altitude,
                crosswind: baseConditions.crosswind,
                windDirection: baseConditions.windDirection,
                time: i * 20,
              });
              break;
            }
            
            // 두 마커 사이의 거리 계산
            const latDiff = endPoint.lat - startPoint.lat;
            const lngDiff = endPoint.lng - startPoint.lng;
            const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // 대략적인 km
            
            // 구간당 보간 포인트 수 (거리에 비례, 최소 5개, 최대 20개)
            const interpolatedPoints = Math.max(5, Math.min(20, Math.ceil(distance * 10)));
            
            // 구간 방향 계산
            const segmentAzimuth = (Math.atan2(lngDiff, latDiff) * 180) / Math.PI;
            const windAngle = baseConditions.windDirection - segmentAzimuth;
            const crosswindComponent = Math.abs(Math.sin((windAngle * Math.PI) / 180)) * baseConditions.windSpeed;
            
            // 보간 포인트 생성
            for (let j = 0; j <= interpolatedPoints; j++) {
              const segmentProgress = j / interpolatedPoints;
              const globalProgress = (i + segmentProgress) / Math.max(1, totalMarkers - 1);
              
              // 보간된 위치
              const interpolatedLat = startPoint.lat + latDiff * segmentProgress;
              const interpolatedLng = startPoint.lng + lngDiff * segmentProgress;
              
              // 고도 계산 (전체 경로에 대한 진행률)
              const altitude = globalProgress * maxAltitude;
              
              trajectoryPoints.push({
                lat: interpolatedLat,
                lng: interpolatedLng,
                altitude,
                crosswind: crosswindComponent,
                windDirection: baseConditions.windDirection,
                time: (i * 20) + (j * (20 / interpolatedPoints)),
              });
            }
          }
          
          setTrajectory(trajectoryPoints);
          console.log(`[발사궤적] 사용자 정의 경로 계산 완료: ${trajectoryPoints.length}개 포인트 (${totalMarkers}개 마커에서 보간)`);
        } catch (error) {
          console.error('사용자 정의 궤적 계산 실패:', error);
          // 오류 발생 시에도 기본 궤적 생성
          const fallbackTrajectory: LaunchTrajectory[] = [];
          for (let i = 0; i < customTrajectory.length; i++) {
            const point = customTrajectory[i];
            const progress = i / Math.max(1, customTrajectory.length - 1);
            const altitude = progress * maxAltitude;
            
            // 마커 사이 보간
            if (i < customTrajectory.length - 1) {
              const nextPoint = customTrajectory[i + 1];
              const latDiff = nextPoint.lat - point.lat;
              const lngDiff = nextPoint.lng - point.lng;
              const interpolatedPoints = 10;
              
              for (let j = 0; j <= interpolatedPoints; j++) {
                const segmentProgress = j / interpolatedPoints;
                const globalProgress = (i + segmentProgress) / Math.max(1, customTrajectory.length - 1);
                
                fallbackTrajectory.push({
                  lat: point.lat + latDiff * segmentProgress,
                  lng: point.lng + lngDiff * segmentProgress,
                  altitude: globalProgress * maxAltitude,
                  crosswind: 5,
                  windDirection: 0,
                  time: (i * 20) + (j * 2),
                });
              }
            } else {
              fallbackTrajectory.push({
                lat: point.lat,
                lng: point.lng,
                altitude,
                crosswind: 5,
                windDirection: 0,
                time: i * 20,
              });
            }
          }
          setTrajectory(fallbackTrajectory);
          console.log(`[발사궤적] 폴백 궤적 생성: ${fallbackTrajectory.length}개 포인트`);
        } finally {
          setIsCalculating(false);
        }
      };
      
      calculateCustomTrajectory();
      return;
    }

    // 기존 로직 (center 기반)
    if (!center) {
      setTrajectory([]);
      return;
    }

    const calculateTrajectory = async () => {
      setIsCalculating(true);
      try {
        // 기상 예보 데이터 가져오기
        const forecast = await getWeatherForecast(center.lat, center.lng);
        
        if (forecast.length === 0) {
          console.warn('기상 예보 데이터가 없어 기본 궤적을 사용합니다.');
          // 기본 궤적 생성 (데이터 없을 때도 표시)
          const defaultTrajectory: LaunchTrajectory[] = [];
          const timeStep = 1;
          const totalTime = 300;
          let currentLat = center.lat;
          let currentLng = center.lng;
          let currentAltitude = 0;
          let velocity = 0;
          
          for (let t = 0; t <= totalTime; t += timeStep) {
            const gravity = 9.81;
            const thrust = t < 60 ? 200 : 0;
            const drag = 0.1 * velocity * velocity;
            
            velocity += (thrust - gravity - drag) * timeStep;
            currentAltitude += velocity * timeStep;
            
            if (currentAltitude < 0) currentAltitude = 0;
            if (currentAltitude > maxAltitude) currentAltitude = maxAltitude;
            
            // 발사 방위각에 따른 전진 방향
            const forwardSpeed = Math.max(0, velocity * 0.1);
            const forwardDistance = forwardSpeed * timeStep;
            const forwardLat = forwardDistance / 111000;
            const forwardLng = forwardDistance / (111000 * Math.cos((currentLat * Math.PI) / 180));
            
            const azimuthRad = (launchAzimuth * Math.PI) / 180;
            currentLat += forwardLat * Math.cos(azimuthRad);
            currentLng += forwardLng * Math.sin(azimuthRad);
            
            // 기본 횡풍 (5 m/s)
            const crosswindComponent = 5 * (1 + (currentAltitude / maxAltitude) * 0.5);
            const driftDistance = crosswindComponent * timeStep;
            const driftLat = driftDistance / 111000;
            const driftLng = driftDistance / (111000 * Math.cos((currentLat * Math.PI) / 180));
            
            const perpendicularAzimuth = (launchAzimuth + 90) * Math.PI / 180;
            currentLng += driftLng * Math.cos(perpendicularAzimuth);
            currentLat += driftLat * Math.sin(perpendicularAzimuth);
            
            defaultTrajectory.push({
              lat: currentLat,
              lng: currentLng,
              altitude: currentAltitude,
              crosswind: crosswindComponent,
              windDirection: launchAzimuth + 90,
              time: t,
            });
          }
          
          setTrajectory(defaultTrajectory);
          setIsCalculating(false);
          return;
        }

        // 현재 조건 사용
        const currentConditions = forecast[0].conditions;
        
        // 궤적 계산 (간단한 물리 시뮬레이션)
        const trajectoryPoints: LaunchTrajectory[] = [];
        const timeStep = 1; // 1초 간격
        const totalTime = 300; // 5분 (300초)
        
        let currentLat = center.lat;
        let currentLng = center.lng;
        let currentAltitude = 0;
        let velocity = 0; // 초기 속도 0

        for (let t = 0; t <= totalTime; t += timeStep) {
          // 고도 계산 (간단한 중력 모델)
          const gravity = 9.81; // m/s²
          const thrust = t < 60 ? 200 : 0; // 처음 60초 동안 추력
          const drag = 0.1 * velocity * velocity; // 공기 저항
          
          velocity += (thrust - gravity - drag) * timeStep;
          currentAltitude += velocity * timeStep;
          
          if (currentAltitude < 0) currentAltitude = 0;
          if (currentAltitude > maxAltitude) currentAltitude = maxAltitude;

          // 발사 방위각에 따른 전진 방향 (주요 이동)
          const forwardSpeed = Math.max(0, velocity * 0.1); // 전진 속도 (m/s)
          const forwardDistance = forwardSpeed * timeStep; // 전진 거리 (미터)
          const forwardLat = forwardDistance / 111000; // 위도 변화
          const forwardLng = forwardDistance / (111000 * Math.cos((currentLat * Math.PI) / 180)); // 경도 변화
          
          // 발사 방위각을 라디안으로 변환
          const azimuthRad = (launchAzimuth * Math.PI) / 180;
          currentLat += forwardLat * Math.cos(azimuthRad);
          currentLng += forwardLng * Math.sin(azimuthRad);

          // 횡풍 영향 계산 (고도에 따라 풍속 변화)
          const altitudeFactor = 1 + (currentAltitude / maxAltitude) * 0.5; // 고도가 높을수록 풍속 증가
          const crosswindAtAltitude = currentConditions.crosswind * altitudeFactor;
          
          // 풍향에 따른 횡풍 성분 계산
          const windAngle = currentConditions.windDirection - launchAzimuth;
          const crosswindComponent = Math.abs(Math.sin((windAngle * Math.PI) / 180)) * crosswindAtAltitude;

          // 횡풍에 의한 편향 (발사 방향에 수직)
          const driftDistance = crosswindComponent * timeStep; // 미터
          const driftLat = driftDistance / 111000;
          const driftLng = driftDistance / (111000 * Math.cos((currentLat * Math.PI) / 180));
          
          // 횡풍 방향 (발사 방위각에 수직, 90도 회전)
          const perpendicularAzimuth = (launchAzimuth + 90) * Math.PI / 180;
          const windDirectionRad = (currentConditions.windDirection * Math.PI) / 180;
          
          // 횡풍이 어느 방향으로 불어오는지에 따라 편향 방향 결정
          const driftSign = Math.sin(windDirectionRad - azimuthRad) > 0 ? 1 : -1;
          currentLng += driftLng * Math.cos(perpendicularAzimuth) * driftSign;
          currentLat += driftLat * Math.sin(perpendicularAzimuth) * driftSign;

          trajectoryPoints.push({
            lat: currentLat,
            lng: currentLng,
            altitude: currentAltitude,
            crosswind: crosswindComponent,
            windDirection: currentConditions.windDirection,
            time: t,
          });
        }

        setTrajectory(trajectoryPoints);
        console.log(`[발사궤적] 궤적 계산 완료: ${trajectoryPoints.length}개 포인트`);
      } catch (error) {
        console.error('궤적 계산 실패, 기본 궤적 사용:', error);
        // 오류 발생 시에도 기본 궤적 생성
        const defaultTrajectory: LaunchTrajectory[] = [];
        const timeStep = 1;
        const totalTime = 300;
        let currentLat = center.lat;
        let currentLng = center.lng;
        let currentAltitude = 0;
        let velocity = 0;
        
        for (let t = 0; t <= totalTime; t += timeStep) {
          const gravity = 9.81;
          const thrust = t < 60 ? 200 : 0;
          const drag = 0.1 * velocity * velocity;
          
          velocity += (thrust - gravity - drag) * timeStep;
          currentAltitude += velocity * timeStep;
          
          if (currentAltitude < 0) currentAltitude = 0;
          if (currentAltitude > maxAltitude) currentAltitude = maxAltitude;
          
          // 발사 방위각에 따른 전진 방향
          const forwardSpeed = Math.max(0, velocity * 0.1);
          const forwardDistance = forwardSpeed * timeStep;
          const forwardLat = forwardDistance / 111000;
          const forwardLng = forwardDistance / (111000 * Math.cos((currentLat * Math.PI) / 180));
          
          const azimuthRad = (launchAzimuth * Math.PI) / 180;
          currentLat += forwardLat * Math.cos(azimuthRad);
          currentLng += forwardLng * Math.sin(azimuthRad);
          
          const crosswindComponent = 5 * (1 + (currentAltitude / maxAltitude) * 0.5);
          const driftDistance = crosswindComponent * timeStep;
          const driftLat = driftDistance / 111000;
          const driftLng = driftDistance / (111000 * Math.cos((currentLat * Math.PI) / 180));
          
          const perpendicularAzimuth = (launchAzimuth + 90) * Math.PI / 180;
          currentLng += driftLng * Math.cos(perpendicularAzimuth);
          currentLat += driftLat * Math.sin(perpendicularAzimuth);
          
          defaultTrajectory.push({
            lat: currentLat,
            lng: currentLng,
            altitude: currentAltitude,
            crosswind: crosswindComponent,
            windDirection: launchAzimuth + 90,
            time: t,
          });
        }
        
        setTrajectory(defaultTrajectory);
      } finally {
        setIsCalculating(false);
      }
    };

    calculateTrajectory();
  }, [enabled, center, launchAzimuth, maxAltitude, customTrajectory]);

  if (!enabled) {
    return null;
  }
  
  // 궤적이 없으면 로딩 표시
  if (trajectory.length === 0) {
    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'rgba(255,255,255,0.9)',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        fontSize: '0.85rem',
      }}>
        {isCalculating ? '궤적 계산 중...' : '궤적 데이터 준비 중...'}
      </div>
    );
  }

  // 궤적 좌표 추출
  const trajectoryCoords = trajectory.map((point) => [point.lat, point.lng] as [number, number]);

  // 고도별 색상 (고도가 높을수록 진한 색)
  const getAltitudeColor = (altitude: number): string => {
    const ratio = altitude / maxAltitude;
    if (ratio < 0.25) return '#4caf50'; // 낮은 고도: 녹색
    if (ratio < 0.5) return '#ff9800'; // 중간 고도: 주황색
    if (ratio < 0.75) return '#ff5722'; // 높은 고도: 빨간색
    return '#9c27b0'; // 매우 높은 고도: 보라색
  };

  return (
    <>
      {/* 궤적 선 */}
      <Polyline
        positions={trajectoryCoords}
        pathOptions={{
          color: '#667eea',
          weight: 5,
          opacity: 0.9,
        }}
      />

      {/* 고도별 원 표시 - 마커 경로를 따라 생성 */}
      {trajectory.filter((_, index) => {
        // 마커 경로 모드일 때는 더 촘촘하게 원 표시 (경로 추적)
        if (customTrajectory && customTrajectory.length > 0) {
          return index % 5 === 0; // 5개마다 원 표시 (더 부드러운 경로 추적)
        }
        // 방위각 모드일 때는 기존대로
        return index % 20 === 0;
      }).map((point, index) => {
        const color = getAltitudeColor(point.altitude);
        // 고도에 따라 원 크기 결정 (더 명확하게 보이도록)
        const radius = 400 + (point.altitude / maxAltitude) * 1600; // 400m ~ 2000m

        return (
          <Circle
            key={`trajectory-circle-${index}`}
            center={[point.lat, point.lng]}
            radius={radius}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.35, // 약간 더 진하게
              weight: 3, // 테두리 두께 증가
              opacity: 0.7, // 테두리 투명도 증가
            }}
          >
            <Popup>
              <div style={{ padding: '10px', minWidth: '180px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                <div style={{ fontWeight: '600', marginBottom: '8px', color: '#333' }}>
                  발사 궤적 정보
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>고도:</span> {point.altitude.toFixed(0)}m
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>횡풍:</span> {point.crosswind.toFixed(1)} m/s
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>경과 시간:</span> {Math.floor(point.time / 60)}분 {point.time % 60}초
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                  <div>풍향: {point.windDirection.toFixed(0)}°</div>
                  <div>위치: {point.lat.toFixed(4)}, {point.lng.toFixed(4)}</div>
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}

      {isCalculating && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.9)',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          fontSize: '0.85rem',
        }}>
          궤적 계산 중...
        </div>
      )}
    </>
  );
}

