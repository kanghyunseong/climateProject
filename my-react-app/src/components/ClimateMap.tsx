import { useEffect, useRef, useState, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, Circle, useMapEvents } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import { GYEONGGI_CENTER, API_CONFIG } from '../config/api';
import type { HeatmapPoint } from '../services/climateApi';
import AirQualityMap from './AirQualityMap';
import CrosswindSimulator from './CrosswindSimulator';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet 마커 아이콘 설정 (기본 아이콘 경로 문제 해결)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 아이콘 생성 함수 (각 마커마다 새 인스턴스 생성)
const createDefaultIcon = () => new L.Icon.Default();

const createTrajectoryIcon = () => L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Location {
  lat: number;
  lng: number;
  name?: string;
}

interface ClimateMapProps {
  selectedLayer?: string;
  onMapClick?: (lat: number, lng: number) => void;
  markers?: Location[];
  center?: [number, number];
  zoom?: number;
  showHeatmap?: boolean;
  heatmapData?: HeatmapPoint[];
  isLoadingHeatmap?: boolean;
  showAirQualityMap?: boolean;
  airQualityCenter?: { lat: number; lng: number };
  showCrosswindSimulator?: boolean;
  crosswindCenter?: { lat: number; lng: number };
  launchAzimuth?: number;
  customTrajectory?: Array<{ lat: number; lng: number }>; // 사용자 정의 궤적 경로
}

// 강도에 따른 색상 계산
function getHeatmapColor(intensity: number): string {
  if (intensity < 0.25) {
    return `rgba(0, 0, 255, ${0.4 + intensity * 2})`;
  } else if (intensity < 0.5) {
    return `rgba(0, 255, 0, ${0.5 + intensity})`;
  } else if (intensity < 0.75) {
    return `rgba(255, 255, 0, ${0.6 + intensity * 0.4})`;
  } else {
    return `rgba(255, 0, 0, ${0.7 + intensity * 0.3})`;
  }
}

// 지도 클릭 이벤트 핸들러
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// 지도 중심 및 줌 업데이트 컴포넌트
function MapUpdater({ center, zoom }: { center?: [number, number]; zoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView([center[0], center[1]], zoom || map.getZoom());
    }
  }, [center, zoom, map]);
  
  return null;
}

// WMS 레이어 오버레이 컴포넌트
function WMSLayer({ selectedLayer, mapLoaded }: { selectedLayer?: string; mapLoaded: boolean }) {
  const map = useMap();
  const overlayRef = useRef<L.ImageOverlay | null>(null);
  const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mapLoaded || !selectedLayer) {
      // 기존 오버레이 제거
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
      return;
    }

    const updateWMSLayer = () => {
      if (!map) return;

      const bounds = map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      
      // WMS 이미지 URL 생성 (EPSG:4326 형식: ymin,xmin,ymax,xmax)
      const bbox = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
      const wmsUrl = `${API_CONFIG.BASE_URL}/wms?apiKey=${API_CONFIG.API_KEY}&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${selectedLayer}&STYLES=&BBOX=${bbox}&WIDTH=1024&HEIGHT=768&FORMAT=image/png&TRANSPARENT=TRUE&CRS=EPSG:4326`;

      // 기존 오버레이 제거
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
      }

      // 새로운 오버레이 생성
      const imageBounds = new LatLngBounds(
        [sw.lat, sw.lng],
        [ne.lat, ne.lng]
      );

      const overlay = L.imageOverlay(wmsUrl, imageBounds, {
        opacity: 0.7,
        interactive: false,
      });

      overlay.addTo(map);
      overlayRef.current = overlay;
    };

    // 초기 로드
    updateWMSLayer();

    // 지도 이동/줌 변경 시 업데이트 (디바운스 적용)
    const debouncedUpdate = () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(updateWMSLayer, 300);
    };

    map.on('moveend', debouncedUpdate);
    map.on('zoomend', debouncedUpdate);
    map.on('resize', debouncedUpdate);

    return () => {
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      map.off('moveend', debouncedUpdate);
      map.off('zoomend', debouncedUpdate);
      map.off('resize', debouncedUpdate);
    };
  }, [selectedLayer, mapLoaded, map]);

  return null;
}

export default function ClimateMap({
  selectedLayer,
  onMapClick,
  markers = [],
  center,
  zoom = 10,
  showHeatmap = false,
  heatmapData = [],
  isLoadingHeatmap = false,
  showAirQualityMap = false,
  airQualityCenter,
  showCrosswindSimulator = false,
  crosswindCenter,
  launchAzimuth = 0,
  customTrajectory,
}: ClimateMapProps) {
  const [mapLoaded, setMapLoaded] = useState(false);

  // 마커 아이콘을 useMemo로 메모이제이션 (성능 최적화 및 안정성)
  const defaultIcon = useMemo(() => createDefaultIcon(), []);
  const trajectoryIcon = useMemo(() => createTrajectoryIcon(), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapContainer
        center={center || GYEONGGI_CENTER}
        zoom={zoom}
        style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}
        whenReady={() => {
          setMapLoaded(true);
        }}
        scrollWheelZoom={true}
        maxBounds={[[36.8, 126.3], [38.3, 127.9]]} // 경기도 범위 제한
      >
        {/* 기본 타일 레이어 - OpenStreetMap 사용 */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 지도 클릭 이벤트 */}
        <MapClickHandler onMapClick={onMapClick} />
        
        {/* 지도 중심 및 줌 업데이트 */}
        <MapUpdater center={center} zoom={zoom} />
        
        {/* WMS 레이어 오버레이 */}
        <WMSLayer selectedLayer={selectedLayer} mapLoaded={mapLoaded} />
        
        {/* 마커 표시 */}
        {markers.map((markerData, index) => {
          // 궤적 마커인지 확인 (이름에 "경로점"이 포함된 경우)
          const isTrajectoryMarker = markerData.name?.includes('경로점');
          
          // 고유한 key 생성 (위치와 이름 조합)
          const markerKey = markerData.name 
            ? `marker-${markerData.name}-${markerData.lat}-${markerData.lng}`
            : `marker-${markerData.lat}-${markerData.lng}-${index}`;
          
          return (
            <Marker
              key={markerKey}
              position={[markerData.lat, markerData.lng]}
              icon={isTrajectoryMarker ? trajectoryIcon : defaultIcon}
            >
              <Popup>
                <div style={{ padding: '10px', minWidth: '150px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  <strong style={{ color: isTrajectoryMarker ? '#f44336' : '#333' }}>
                    {markerData.name || '위치'}
                  </strong>
                  {isTrajectoryMarker && <span style={{ fontSize: '0.75rem', color: '#f44336', marginLeft: '0.5rem' }}>🚀</span>}
                  <br />
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>위도: {markerData.lat.toFixed(4)}</span><br />
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>경도: {markerData.lng.toFixed(4)}</span>
                </div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* 히트맵 표시 */}
        {showHeatmap && heatmapData.map((point, index) => {
          const color = getHeatmapColor(point.intensity);
          const radius = 1000 + point.intensity * 2000; // 미터 단위
          
          return (
            <Circle
              key={`heatmap-${index}`}
              center={[point.lat, point.lng]}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.3,
                weight: 2,
                opacity: 0.8,
              }}
            >
              <Popup>
                <div style={{ padding: '10px', minWidth: '150px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
                  <strong style={{ color: '#333' }}>{point.name || '데이터 포인트'}</strong><br />
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    기후 지수: {(point.intensity * 100).toFixed(0)}%
                  </span>
                  {point.properties && Object.entries(point.properties).slice(0, 3).map(([k, v]) => (
                    <div key={k} style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                      {k}: {String(v)}
                    </div>
                  ))}
                </div>
              </Popup>
            </Circle>
          );
        })}
        
        {/* 공기질 지도 */}
        {showAirQualityMap && airQualityCenter && (
          <AirQualityMap
            center={airQualityCenter}
            enabled={showAirQualityMap}
            mode="grid"
            radius={0.1}
            gridSize={5}
          />
        )}
        
        {/* 경로 횡풍 시뮬레이터 */}
        {showCrosswindSimulator && (
          <CrosswindSimulator
            center={crosswindCenter}
            enabled={showCrosswindSimulator}
            launchAzimuth={launchAzimuth}
            maxAltitude={10000}
            customTrajectory={customTrajectory}
          />
        )}
      </MapContainer>
      
      {/* 히트맵 로딩 표시 */}
      {isLoadingHeatmap && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.9)',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }}>
          데이터 로딩 중...
        </div>
      )}
    </div>
  );
}
