import { useState, useEffect, useRef, useCallback } from 'react';
import ClimateMap from './components/ClimateMap';
import LayerSelector from './components/LayerSelector';
import ClimateInfo from './components/ClimateInfo';
import RegionRecommendation from './components/RegionRecommendation';
import ClimateShiftAnalyzer from './components/ClimateShiftAnalyzer';
import SearchBar from './components/SearchBar';
import DataVisualization from './components/DataVisualization';
import ComparisonPanel from './components/ComparisonPanel';
import StatisticsDashboard from './components/StatisticsDashboard';
import BookmarkManager from './components/BookmarkManager';
import ExportData from './components/ExportData';
import DarkModeToggle from './components/DarkModeToggle';
import KeyboardShortcutsHelp from './components/KeyboardShortcutsHelp';
import UserGuide from './components/UserGuide';
import { useKeyboardShortcuts, SHORTCUTS } from './hooks/useKeyboardShortcuts';
import { getClimateDataAtPoint, getHeatmapData, type HeatmapPoint } from './services/climateApi';
import { type LayerInfo } from './config/layers';
import LaunchWindowPredictor from './components/LaunchWindowPredictor';
import FloodGuard from './components/FloodGuard';
import AirVibe from './components/AirVibe';
import ClimateThemeController from './components/ClimateThemeController';
import ClimateRiskDashboard from './components/ClimateRiskDashboard';
import './App.css';

interface Location {
  lat: number;
  lng: number;
  name?: string;
  data?: any;
}

function App() {
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [selectedLayerInfo, setSelectedLayerInfo] = useState<LayerInfo | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [comparisonLocations, setComparisonLocations] = useState<Location[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);
  const [mapZoom, setMapZoom] = useState<number>(10);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [activeFeature, setActiveFeature] = useState<'launch' | 'flood' | 'air' | 'climateShift' | 'risk' | null>(null);
  const [enableRealtime, setEnableRealtime] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(() => {
    // localStorage에서 갱신 주기 불러오기 (기본값: 30초)
    const saved = localStorage.getItem('refreshInterval');
    return saved ? parseInt(saved, 10) : 30000;
  });
  const [layerData, setLayerData] = useState<any>(null);
  const [enableClimateTheme, setEnableClimateTheme] = useState(() => {
    // localStorage에서 설정 불러오기
    const saved = localStorage.getItem('enableClimateTheme');
    return saved ? JSON.parse(saved) : false; // 기본값: false
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // 이벤트 리스너에서 사용됨
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showAirQualityMap, setShowAirQualityMap] = useState(false);
  // 이벤트 리스너에서 사용됨
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showCrosswindSimulator, setShowCrosswindSimulator] = useState(false);
  const [launchAzimuth, setLaunchAzimuth] = useState(0);
  const [trajectoryMarkers, setTrajectoryMarkers] = useState<Location[]>([]); // 궤적 마커 경로
  const [trajectoryMode, setTrajectoryMode] = useState<'azimuth' | 'markers'>('azimuth'); // 궤적 모드

  // layerData가 업데이트되면 히트맵도 갱신
  useEffect(() => {
    if (layerData?.features && showHeatmap) {
      const heatmapPoints: HeatmapPoint[] = [];
      layerData.features.forEach((feature: any) => {
        if (feature.geometry?.coordinates) {
          const coords = feature.geometry.coordinates;
          if (feature.geometry.type === 'Point') {
            heatmapPoints.push({
              lat: coords[1],
              lng: coords[0],
              intensity: 0.5,
            });
          } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            // 폴리곤 중심점 계산
            const flatCoords = feature.geometry.type === 'Polygon'
              ? coords[0]
              : coords[0][0];
            if (flatCoords?.length > 0) {
              const centerLng = flatCoords.reduce((sum: number, c: number[]) => sum + c[0], 0) / flatCoords.length;
              const centerLat = flatCoords.reduce((sum: number, c: number[]) => sum + c[1], 0) / flatCoords.length;
              heatmapPoints.push({
                lat: centerLat,
                lng: centerLng,
                intensity: 0.5,
              });
            }
          }
        }
      });
      if (heatmapPoints.length > 0) {
        setHeatmapData(heatmapPoints);
      }
    }
  }, [layerData, showHeatmap]);
  const [showUserGuide, setShowUserGuide] = useState(() => {
    // 첫 방문 시에만 가이드 표시
    const hasSeenGuide = localStorage.getItem('has-seen-guide');
    return !hasSeenGuide;
  });

  // URL 파라미터에서 초기 위치 로드
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    const name = params.get('name');

    if (lat && lng) {
      const locationLat = parseFloat(lat);
      const locationLng = parseFloat(lng);
      
      // 유효한 좌표인지 확인
      if (!isNaN(locationLat) && !isNaN(locationLng) && 
          locationLat >= -90 && locationLat <= 90 && 
          locationLng >= -180 && locationLng <= 180) {
        const location: Location = {
          lat: locationLat,
          lng: locationLng,
          name: name || undefined,
        };
        setSelectedLocation(location);
        setMapCenter([location.lat, location.lng]);
        setMapZoom(12);
        
        // URL에서 로드한 위치의 데이터도 가져오기
        const loadLocationData = async () => {
          try {
            const layerName = selectedLayer || 'spggcee:vgmap';
            const data = await getClimateDataAtPoint(location.lng, location.lat, layerName);
            setSelectedLocation({ ...location, data });
          } catch (error) {
            console.warn('[URL 파라미터] 위치 데이터 로드 실패:', error);
            // 데이터 로드 실패해도 위치는 설정됨
          }
        };
        
        // 레이어가 선택되어 있으면 데이터 로드
        if (selectedLayer) {
          loadLocationData();
        }
      } else {
        console.warn('[URL 파라미터] 유효하지 않은 좌표:', lat, lng);
      }
    }
  }, [selectedLayer]); // selectedLayer가 변경되면 URL 위치의 데이터도 다시 로드

  // 히트맵 데이터 로드 함수
  const loadHeatmapData = useCallback(async () => {
    if (showHeatmap && selectedLayer) {
      setIsLoadingHeatmap(true);
      try {
        const data = await getHeatmapData(selectedLayer);
        setHeatmapData(data);
        if (data.length === 0) {
          // WFS를 지원하지 않는 레이어는 정상적인 경우이므로 info 레벨로 변경
          console.info(`[히트맵] ${selectedLayer}: 이 레이어는 WMS만 지원합니다. 히트맵은 WFS 데이터가 필요합니다.`);
        } else {
          console.log(`[히트맵] 데이터 로드 완료: ${data.length}개 포인트`);
        }
      } catch (error: any) {
        // WFS를 지원하지 않는 레이어는 정상적인 경우
        if (error?.message?.includes('WFS_NOT_SUPPORTED')) {
          console.info(`[히트맵] ${selectedLayer}: WMS만 지원하는 레이어입니다. 히트맵은 표시되지 않지만 지도에는 레이어가 표시됩니다.`);
        } else {
          console.error('[히트맵] 데이터 로드 실패:', error);
        }
        setHeatmapData([]);
      } finally {
        setIsLoadingHeatmap(false);
      }
    } else {
      setHeatmapData([]);
    }
  }, [showHeatmap, selectedLayer]);

  // 히트맵 데이터 로드 (선택된 레이어 기반)
  useEffect(() => {
    loadHeatmapData();
  }, [loadHeatmapData]);

  // 실시간 데이터 갱신 (사용자 설정 주기)
  useEffect(() => {
    if (!enableRealtime || !showHeatmap || !selectedLayer) return;

    const interval = setInterval(() => {
      console.log('[실시간 갱신] 데이터 새로고침 중...');
      loadHeatmapData();
      
      // 선택된 위치의 데이터도 갱신 (selectedLocation의 lat/lng만 사용하여 무한 루프 방지)
      if (selectedLocation?.lat && selectedLocation?.lng) {
        const layerName = selectedLayer || 'spggcee:vgmap';
        const currentLat = selectedLocation.lat;
        const currentLng = selectedLocation.lng;
        getClimateDataAtPoint(currentLng, currentLat, layerName)
          .then(data => {
            // 현재 위치와 동일한지 확인 후 업데이트
            setSelectedLocation(prev => {
              if (prev && prev.lat === currentLat && prev.lng === currentLng) {
                return { ...prev, data };
              }
              return prev;
            });
          })
          .catch(error => {
            console.warn('[실시간 갱신] 위치 데이터 갱신 실패:', error.message || error);
          });
      }
    }, refreshInterval); // 사용자 설정 주기로 갱신

    return () => clearInterval(interval);
  }, [enableRealtime, refreshInterval, showHeatmap, selectedLayer, selectedLocation?.lat, selectedLocation?.lng, loadHeatmapData]);

  const handleMapClick = async (lat: number, lng: number) => {
    // 궤적 모드가 'markers'이고 발사 궤적이 활성화된 경우, 그리고 launch 기능이 활성화된 경우에만 마커 추가
    if (trajectoryMode === 'markers' && showCrosswindSimulator && activeFeature === 'launch') {
      const newMarker: Location = { lat, lng, name: `경로점 ${trajectoryMarkers.length + 1}` };
      const updatedMarkers = [...trajectoryMarkers, newMarker];
      setTrajectoryMarkers(updatedMarkers);
      console.log(`[마커 추가] 경로점 ${updatedMarkers.length}: (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      console.log(`[마커 경로] 총 ${updatedMarkers.length}개 마커`);
      console.log(`[궤적 모드] ${trajectoryMode}, 발사 궤적 활성: ${showCrosswindSimulator}, 활성 기능: ${activeFeature}`);
      return;
    }
    
    const newLocation: Location = { lat, lng };
    setSelectedLocation(newLocation);
    
    // 데이터 자동 로드
    try {
      const data = await getClimateDataAtPoint(lng, lat);
      setSelectedLocation({ ...newLocation, data });
    } catch (error) {
      console.error('데이터 로드 실패:', error);
    }
  };

  const handleSearchSelect = (location: { name: string; lat: number; lng: number }) => {
    const newLocation: Location = { ...location };
    setSelectedLocation(newLocation);
    setMapCenter([location.lat, location.lng]);
    setMapZoom(12);
    
    // 선택된 레이어에 따라 데이터 자동 로드
    const layerName = selectedLayer || 'spggcee:vgmap';
    getClimateDataAtPoint(location.lng, location.lat, layerName)
      .then(data => {
        setSelectedLocation({ ...newLocation, data });
      })
      .catch(error => {
        console.error('데이터 로드 실패:', error);
        setSelectedLocation({ ...newLocation, data: null });
      });
  };

  const handleAddToComparison = () => {
    if (!selectedLocation) return;
    if (comparisonLocations.length >= 3) {
      alert('최대 3개 지역까지 비교할 수 있습니다.');
      return;
    }
    if (comparisonLocations.some(loc => 
      loc.lat === selectedLocation.lat && loc.lng === selectedLocation.lng
    )) {
      alert('이미 추가된 지역입니다.');
      return;
    }
    setComparisonLocations([...comparisonLocations, selectedLocation]);
  };

  const handleRemoveComparison = (index: number) => {
    setComparisonLocations(comparisonLocations.filter((_, i) => i !== index));
  };

  const handleClearComparison = () => {
    setComparisonLocations([]);
  };

  const handleBookmarkSelect = (bookmark: { lat: number; lng: number; name: string }) => {
    const location: Location = { ...bookmark };
    setSelectedLocation(location);
    setMapCenter([bookmark.lat, bookmark.lng]);
    setMapZoom(12);
    
    // 선택된 레이어에 따라 데이터 로드
    const layerName = selectedLayer || 'spggcee:vgmap';
    getClimateDataAtPoint(bookmark.lng, bookmark.lat, layerName)
      .then(data => {
        setSelectedLocation({ ...location, data });
      })
      .catch(error => {
        console.error('데이터 로드 실패:', error);
        setSelectedLocation({ ...location, data: null });
      });
  };

  const allMarkers = [
    ...(selectedLocation ? [selectedLocation] : []),
    ...comparisonLocations,
  ];

  const searchInputRef = useRef<HTMLInputElement>(null);

  // 키보드 단축키 설정
  useKeyboardShortcuts([
    {
      ...SHORTCUTS.SEARCH,
      action: () => {
        searchInputRef.current?.focus();
      },
    },
    {
      ...SHORTCUTS.CLEAR,
      action: () => {
        setSelectedLocation(null);
        setComparisonLocations([]);
      },
    },
    {
      ...SHORTCUTS.EXPORT,
      action: () => {
        if (selectedLocation?.data) {
          // ExportData 컴포넌트의 exportJSON 함수 호출
          const event = new KeyboardEvent('keydown', { key: 'e', ctrlKey: true });
          window.dispatchEvent(event);
        }
      },
    },
  ]);

  // 기후 테마 설정 저장
  useEffect(() => {
    localStorage.setItem('enableClimateTheme', JSON.stringify(enableClimateTheme));
  }, [enableClimateTheme]);

  // 실시간 갱신 설정 저장
  useEffect(() => {
    localStorage.setItem('enableRealtime', JSON.stringify(enableRealtime));
  }, [enableRealtime]);

  // 공기질 지도 및 횡풍 시뮬레이터 토글 이벤트 리스너
  useEffect(() => {
    const handleToggleAirQualityMap = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setShowAirQualityMap(customEvent.detail);
    };

    const handleToggleCrosswindSimulator = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setShowCrosswindSimulator(customEvent.detail);
    };

    const handleUpdateLaunchAzimuth = (e: Event) => {
      const customEvent = e as CustomEvent<number>;
      setLaunchAzimuth(customEvent.detail);
    };

    const handleSetTrajectoryMode = (e: Event) => {
      const customEvent = e as CustomEvent<'azimuth' | 'markers'>;
      setTrajectoryMode(customEvent.detail);
    };

    const handleClearTrajectoryMarkers = () => {
      setTrajectoryMarkers([]);
    };

    window.addEventListener('toggleAirQualityMap', handleToggleAirQualityMap);
    window.addEventListener('toggleCrosswindSimulator', handleToggleCrosswindSimulator);
    window.addEventListener('updateLaunchAzimuth', handleUpdateLaunchAzimuth);
    window.addEventListener('setTrajectoryMode', handleSetTrajectoryMode);
    window.addEventListener('clearTrajectoryMarkers', handleClearTrajectoryMarkers);
    
    return () => {
      window.removeEventListener('toggleAirQualityMap', handleToggleAirQualityMap);
      window.removeEventListener('toggleCrosswindSimulator', handleToggleCrosswindSimulator);
      window.removeEventListener('updateLaunchAzimuth', handleUpdateLaunchAzimuth);
      window.removeEventListener('setTrajectoryMode', handleSetTrajectoryMode);
      window.removeEventListener('clearTrajectoryMarkers', handleClearTrajectoryMarkers);
    };
  }, []);

  // 다른 기능으로 전환할 때 마커 경로 초기화
  useEffect(() => {
    if (activeFeature !== 'launch') {
      // launch 기능이 비활성화되면 마커 경로 초기화 및 모드 리셋
      if (trajectoryMode === 'markers') {
        setTrajectoryMode('azimuth');
        setTrajectoryMarkers([]);
        console.log('[마커 경로] 다른 기능으로 전환하여 마커 경로 초기화');
      }
    }
  }, [activeFeature, trajectoryMode]);

  return (
    <div className="app">
      {/* 기후 데이터 기반 동적 테마 */}
      <ClimateThemeController
        lat={selectedLocation?.lat || null}
        lng={selectedLocation?.lng || null}
        enabled={enableClimateTheme}
      />
      
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>🌍 기후 스마트 라이프 가이드</h1>
            <p>경기도 기후위성데이터를 활용한 스마트 지역 분석 서비스</p>
          </div>
          <div className="header-actions">
            <SearchBar onLocationSelect={handleSearchSelect} inputRef={searchInputRef} />
            <DarkModeToggle />
          </div>
        </div>
      </header>
      
      <KeyboardShortcutsHelp />
      
      {showUserGuide && (
        <UserGuide
          onClose={() => {
            setShowUserGuide(false);
            localStorage.setItem('has-seen-guide', 'true');
          }}
        />
      )}

      <div className="app-content">
        <aside className="sidebar">
          <div className="map-type-selector">
            <h3>🗺️ OpenStreetMap (Leaflet)</h3>
            <div style={{ 
              padding: '1rem', 
              background: '#e8f5e9', 
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#2e7d32',
              marginTop: '0.5rem',
              lineHeight: '1.6'
            }}>
              ✅ 오픈소스 지도가 활성화되었습니다<br/>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                {enableRealtime ? `실시간 데이터가 ${refreshInterval / 1000}초마다 자동 갱신됩니다` : '수동 갱신 모드입니다'}
              </span>
            </div>
          </div>
          
          <div className="divider"></div>

          {/* 기후 연동 테마 설정 */}
          <div className="climate-theme-toggle" style={{ marginBottom: '1rem' }}>
            <h3>🎨 기후 연동 테마</h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={enableClimateTheme}
                onChange={(e) => setEnableClimateTheme(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {enableClimateTheme ? '기후 연동 테마 활성화' : '기본 테마 사용'}
              </span>
            </label>
            {enableClimateTheme && (
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.85rem', 
                color: '#999',
                lineHeight: '1.5'
              }}>
                현재 위치의 기후 데이터에 따라 테마 색상과 배경 애니메이션이 자동으로 변경됩니다.
              </p>
            )}
          </div>
          
          <div className="divider"></div>

          <LayerSelector
            selectedLayer={selectedLayer}
            onLayerChange={(layer, layerInfo) => {
              setSelectedLayer(layer);
              setSelectedLayerInfo(layerInfo || null);
              // 레이어 변경 시 현재 선택된 위치의 데이터 다시 로드
              if (selectedLocation && layer && layerInfo?.type === 'vector' && layerInfo?.wfsName) {
                getClimateDataAtPoint(selectedLocation.lng, selectedLocation.lat, layerInfo.wfsName)
                  .then(data => {
                    setSelectedLocation({ ...selectedLocation, data });
                  })
                  .catch(error => {
                    console.warn('[레이어 변경] 데이터 로드 실패:', error.message || error);
                    setSelectedLocation({ ...selectedLocation, data: null });
                  });
              } else if (selectedLocation) {
                // 래스터 레이어이거나 레이어가 없으면 데이터 제거
                setSelectedLocation({ ...selectedLocation, data: null });
              }
            }}
            onDataUpdate={(data) => {
              setLayerData(data);
              console.log('[실시간 업데이트] 레이어 데이터 갱신:', data?.features?.length || 0, '개 피처');
            }}
            enableRealtime={enableRealtime}
            pollingInterval={refreshInterval}
          />
          
          <div className="divider"></div>

          <div className="realtime-toggle" style={{ marginBottom: '1rem' }}>
            <h3>⚡ 실시간 데이터</h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={enableRealtime}
                onChange={(e) => setEnableRealtime(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {enableRealtime ? `${refreshInterval / 1000}초마다 자동 갱신` : '수동 갱신'}
              </span>
            </label>
            {enableRealtime && (
              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.5rem' }}>
                  갱신 주기: {refreshInterval / 1000}초
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="10"
                  value={refreshInterval / 1000}
                  onChange={(e) => {
                    const newInterval = parseInt(e.target.value, 10) * 1000;
                    setRefreshInterval(newInterval);
                    localStorage.setItem('refreshInterval', newInterval.toString());
                  }}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                  <span>10초</span>
                  <span>300초</span>
                </div>
              </div>
            )}
            {selectedLayerInfo && (
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.8rem',
                color: selectedLayerInfo.type === 'vector' ? '#4caf50' : '#2196f3',
                padding: '0.5rem',
                background: selectedLayerInfo.type === 'vector' ? 'rgba(76,175,80,0.1)' : 'rgba(33,150,243,0.1)',
                borderRadius: '6px'
              }}>
                {selectedLayerInfo.type === 'vector'
                  ? '📍 벡터 레이어 - 실시간 데이터 조회 가능'
                  : '🖼️ 래스터 레이어 - 지도 표시만 가능'
                }
              </p>
            )}
          </div>

          <div className="divider"></div>

          <div className="heatmap-toggle">
            <h3>🔥 히트맵 시각화</h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">
                {showHeatmap ? '히트맵 표시 중' : '히트맵 숨김'}
              </span>
            </label>
            {showHeatmap && (
              <p style={{ 
                marginTop: '0.5rem', 
                fontSize: '0.85rem', 
                color: '#999',
                lineHeight: '1.5'
              }}>
                데이터 밀도가 높은 지역이 더 진한 색으로 표시됩니다.
              </p>
            )}
          </div>
          
          <div className="divider"></div>

          {selectedLocation && (
            <>
              <div className="action-buttons">
                <button 
                  className="action-btn primary"
                  onClick={handleAddToComparison}
                  disabled={comparisonLocations.length >= 3}
                >
                  ➕ 비교에 추가
                </button>
              </div>
              <div className="divider"></div>
            </>
          )}
          
          <ClimateInfo
            lat={selectedLocation?.lat || null}
            lng={selectedLocation?.lng || null}
          />

          {selectedLocation?.data && (
            <>
              <div className="divider"></div>
              <DataVisualization 
                data={selectedLocation.data} 
                locationName={selectedLocation.name}
                location={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
              />
            </>
          )}

          {selectedLocation && (
            <>
              <div className="divider"></div>
              <ExportData
                data={selectedLocation.data}
                locationName={selectedLocation.name}
                coordinates={selectedLocation}
              />
            </>
          )}

          <div className="divider"></div>

          <ComparisonPanel
            locations={comparisonLocations}
            onRemove={handleRemoveComparison}
            onClear={handleClearComparison}
          />

          <div className="divider"></div>

          <StatisticsDashboard
            selectedLocations={[
              ...(selectedLocation ? [selectedLocation] : []),
              ...comparisonLocations,
            ]}
            selectedLayer={selectedLayer}
          />

          <div className="divider"></div>

          <BookmarkManager
            onBookmarkSelect={handleBookmarkSelect}
            currentLocation={selectedLocation || undefined}
            currentLayer={selectedLayer}
          />

          <div className="divider"></div>

          <RegionRecommendation
            selectedLayer={selectedLayer}
            onCitySelect={handleSearchSelect}
          />

          <div className="divider"></div>

          <ClimateShiftAnalyzer
            center={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
          />

          <div className="divider"></div>

          {/* 해커톤 핵심 기능 */}
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>🚀 해커톤 핵심 기능</h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveFeature(activeFeature === 'launch' ? null : 'launch')}
                className={activeFeature === 'launch' ? 'active' : ''}
                style={{
                  padding: '0.75rem',
                  background: activeFeature === 'launch' ? 'var(--primary-gradient)' : '#f8f9fa',
                  color: activeFeature === 'launch' ? 'white' : '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                🚀 우주선 발사 윈도우 예측
              </button>
              <button
                onClick={() => setActiveFeature(activeFeature === 'flood' ? null : 'flood')}
                className={activeFeature === 'flood' ? 'active' : ''}
                style={{
                  padding: '0.75rem',
                  background: activeFeature === 'flood' ? 'var(--primary-gradient)' : '#f8f9fa',
                  color: activeFeature === 'flood' ? 'white' : '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                ☔ AI 침수 예보 (FloodGuard)
              </button>
              <button
                onClick={() => setActiveFeature(activeFeature === 'air' ? null : 'air')}
                className={activeFeature === 'air' ? 'active' : ''}
                style={{
                  padding: '0.75rem',
                  background: activeFeature === 'air' ? 'var(--primary-gradient)' : '#f8f9fa',
                  color: activeFeature === 'air' ? 'white' : '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                💨 실내 활동 최적화 (AirVibe)
              </button>
              <button
                onClick={() => setActiveFeature(activeFeature === 'risk' ? null : 'risk')}
                className={activeFeature === 'risk' ? 'active' : ''}
                style={{
                  padding: '0.75rem',
                  background: activeFeature === 'risk' ? 'var(--primary-gradient)' : '#f8f9fa',
                  color: activeFeature === 'risk' ? 'white' : '#333',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginTop: '0.5rem',
                }}
              >
                🛡️ 기후 위험 종합 대시보드
              </button>
            </div>
          </div>

          {activeFeature === 'launch' && (
            <>
              <div className="divider"></div>
              <LaunchWindowPredictor
                center={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
                trajectoryMode={trajectoryMode}
                customTrajectoryMarkers={trajectoryMarkers.map(m => ({ lat: m.lat, lng: m.lng }))}
              />
            </>
          )}

          {activeFeature === 'flood' && (
            <>
              <div className="divider"></div>
              <FloodGuard
                center={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
                onHeatmapDataUpdate={(data) => {
                  // FloodGuard에서 생성한 히트맵 데이터를 지도에 표시
                  setHeatmapData(data.map(d => ({
                    lat: d.lat,
                    lng: d.lng,
                    intensity: d.intensity,
                    name: d.name,
                  })));
                  if (data.length > 0) {
                    setShowHeatmap(true);
                  }
                }}
              />
            </>
          )}

          {activeFeature === 'air' && (
            <>
              <div className="divider"></div>
              <AirVibe
                center={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
              />
            </>
          )}

          {activeFeature === 'risk' && (
            <>
              <div className="divider"></div>
              <ClimateRiskDashboard
                center={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
              />
            </>
          )}

          <div className="divider"></div>

          <div className="info-section">
            <h3>💡 서비스 소개</h3>
            <ul>
              <li>📍 지역별 기후 데이터 실시간 시각화</li>
              <li>🎯 목적별 최적 지역 추천</li>
              <li>📊 데이터 시각화 및 분석</li>
              <li>⚖️ 여러 지역 동시 비교</li>
              <li>⭐ 즐겨찾기 및 북마크</li>
              <li>💾 데이터 내보내기</li>
            </ul>
            <button
              className="guide-button-link"
              onClick={() => setShowUserGuide(true)}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '0.75rem',
                background: 'var(--primary-gradient)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'var(--transition)',
              }}
            >
              📖 사용 가이드 보기
            </button>
          </div>
        </aside>

        <main className="map-container">
                  <ClimateMap
                    selectedLayer={selectedLayer || undefined}
                    onMapClick={handleMapClick}
                    markers={[...allMarkers, ...trajectoryMarkers]}
                    center={mapCenter}
                    zoom={mapZoom}
                    showHeatmap={showHeatmap}
                    heatmapData={heatmapData}
                    isLoadingHeatmap={isLoadingHeatmap}
                    showAirQualityMap={showAirQualityMap && activeFeature === 'air'}
                    airQualityCenter={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
                    showCrosswindSimulator={showCrosswindSimulator}
                    crosswindCenter={selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : undefined}
                    launchAzimuth={launchAzimuth}
                    customTrajectory={trajectoryMode === 'markers' && trajectoryMarkers.length > 0 
                      ? trajectoryMarkers.map(m => ({ lat: m.lat, lng: m.lng }))
                      : undefined}
                  />
        </main>
      </div>
    </div>
  );
}

export default App;
