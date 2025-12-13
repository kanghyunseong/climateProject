import { useState, useMemo, useEffect, useCallback } from 'react';
import { ALL_LAYERS, getLayersByCategory, type LayerInfo, searchLayers } from '../config/layers';
import { getWFSData } from '../services/climateApi';

interface LayerSelectorProps {
  selectedLayer: string | null;
  onLayerChange: (layer: string | null, layerInfo?: LayerInfo) => void;
  onDataUpdate?: (data: any) => void;
  enableRealtime?: boolean;
  pollingInterval?: number;
}

interface LayerStatus {
  [key: string]: 'loading' | 'success' | 'error' | 'raster' | 'unknown';
}

export default function LayerSelector({
  selectedLayer,
  onLayerChange,
  onDataUpdate,
  enableRealtime = false,
  pollingInterval = 30000,
}: LayerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [layerStatuses, setLayerStatuses] = useState<LayerStatus>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // 레이어 타입별로 상태 초기화
  useEffect(() => {
    const initialStatuses: LayerStatus = {};
    ALL_LAYERS.forEach(layer => {
      if (layer.type === 'raster') {
        initialStatuses[layer.wmsName] = 'raster';
      }
    });
    setLayerStatuses(prev => ({ ...prev, ...initialStatuses }));
  }, []);

  // 레이어 데이터 가져오기
  const fetchLayerData = useCallback(async (layerName: string) => {
    const layer = ALL_LAYERS.find(l => l.wmsName === layerName);
    if (!layer || layer.type === 'raster' || !layer.wfsName) {
      return null;
    }

    try {
      setLayerStatuses(prev => ({ ...prev, [layerName]: 'loading' }));
      const bbox = '36.8,126.3,38.3,127.9';
      const data = await getWFSData({
        typeName: layer.wfsName,
        bbox,
        maxFeatures: 100,
      });

      if (data && data.features) {
        setLayerStatuses(prev => ({ ...prev, [layerName]: 'success' }));
        setLastUpdate(new Date());
        return data;
      } else {
        setLayerStatuses(prev => ({ ...prev, [layerName]: 'error' }));
        return null;
      }
    } catch (error) {
      console.warn(`레이어 ${layerName} 데이터 가져오기 실패:`, error);
      setLayerStatuses(prev => ({ ...prev, [layerName]: 'error' }));
      return null;
    }
  }, []);

  // 실시간 폴링
  useEffect(() => {
    if (!enableRealtime || !selectedLayer) return;

    const layer = ALL_LAYERS.find(l => l.wmsName === selectedLayer);
    if (!layer || layer.type === 'raster') return;

    const poll = async () => {
      setIsPolling(true);
      const data = await fetchLayerData(selectedLayer);
      if (data && onDataUpdate) {
        onDataUpdate(data);
      }
      setIsPolling(false);
    };

    poll();
    const interval = setInterval(poll, pollingInterval);

    return () => clearInterval(interval);
  }, [selectedLayer, enableRealtime, pollingInterval, fetchLayerData, onDataUpdate]);

  const displayLayers = useMemo(() => {
    if (searchQuery.trim()) {
      return searchLayers(searchQuery);
    }
    return ALL_LAYERS;
  }, [searchQuery]);

  const groupedLayers = useMemo(() => {
    if (searchQuery.trim()) {
      return null;
    }
    return getLayersByCategory();
  }, [searchQuery]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubcategory = (key: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSubcategories(newExpanded);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      '그린인프라': '🌿',
      '기후위기': '🌡️',
      '도시생태현황지도': '🗺️',
      '탄소공간': '🌱',
      '태양광': '☀️',
      '행정구역': '🏛️',
    };
    return icons[category] || '📊';
  };

  const getTypeIcon = (type: 'vector' | 'raster'): string => {
    return type === 'vector' ? '📍' : '🖼️';
  };

  const getStatusStyle = (layerName: string): React.CSSProperties => {
    const status = layerStatuses[layerName];
    const baseStyle: React.CSSProperties = {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      flexShrink: 0,
    };

    switch (status) {
      case 'loading':
        return { ...baseStyle, background: 'linear-gradient(135deg, #ffd93d, #ff6b6b)', animation: 'pulse 1s infinite' };
      case 'success':
        return { ...baseStyle, background: 'linear-gradient(135deg, #6bcb77, #4ade80)' };
      case 'raster':
        return { ...baseStyle, background: 'linear-gradient(135deg, #4facfe, #00f2fe)' };
      case 'error':
        return { ...baseStyle, background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)' };
      default:
        return { ...baseStyle, background: 'rgba(255,255,255,0.3)' };
    }
  };

  const handleLayerClick = async (layer: LayerInfo) => {
    onLayerChange(layer.wmsName, layer);

    if (layer.type === 'vector' && layer.wfsName && onDataUpdate) {
      const data = await fetchLayerData(layer.wmsName);
      if (data) {
        onDataUpdate(data);
      }
    }
  };

  // 글래스모피즘 스타일
  const glassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
  };

  const categoryStyle: React.CSSProperties = {
    ...glassStyle,
    padding: '12px 16px',
    marginBottom: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    color: '#1a1a2e',
    fontWeight: 600,
  };

  const subcategoryStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '10px 14px',
    marginBottom: '6px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.3s ease',
    fontSize: '0.9rem',
    color: '#333',
  };

  const layerItemStyle = (isSelected: boolean): React.CSSProperties => ({
    background: isSelected
      ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%)'
      : 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: isSelected
      ? '1px solid rgba(102, 126, 234, 0.5)'
      : '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '10px 12px',
    marginBottom: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontSize: '0.85rem',
    color: isSelected ? '#667eea' : '#444',
    fontWeight: isSelected ? 600 : 400,
    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
    boxShadow: isSelected
      ? '0 4px 20px rgba(102, 126, 234, 0.2)'
      : 'none',
  });

  return (
    <div
      className="layer-selector"
      style={{
        ...glassStyle,
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
      }}
    >
      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div>
          <h3 style={{
            margin: 0,
            fontSize: '1.1rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            데이터 레이어
          </h3>
          <span style={{
            fontSize: '0.75rem',
            color: '#666',
            marginTop: '4px',
            display: 'block',
          }}>
            {ALL_LAYERS.length}개 레이어 사용 가능
          </span>
        </div>

        {enableRealtime && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: isPolling
              ? 'linear-gradient(135deg, rgba(255,193,7,0.2) 0%, rgba(255,152,0,0.2) 100%)'
              : 'linear-gradient(135deg, rgba(76,175,80,0.2) 0%, rgba(139,195,74,0.2) 100%)',
            borderRadius: '20px',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: isPolling ? '#ff9800' : '#4caf50',
              animation: isPolling ? 'pulse 1s infinite' : 'none',
            }} />
            {isPolling ? '업데이트 중' : '실시간'}
          </div>
        )}
      </div>

      {/* 검색창 */}
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <input
          type="text"
          placeholder="레이어 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px 12px 40px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            fontSize: '0.9rem',
            color: '#333',
            outline: 'none',
            transition: 'all 0.3s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <span style={{
          position: 'absolute',
          left: '14px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '1rem',
          opacity: 0.5,
        }}>
          🔍
        </span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9rem',
              opacity: 0.5,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 상태 범례 */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '16px',
        padding: '10px 14px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        fontSize: '0.7rem',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ ...getStatusStyle('__success'), background: 'linear-gradient(135deg, #6bcb77, #4ade80)' }} />
          <span>벡터 (WFS)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ ...getStatusStyle('__raster'), background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }} />
          <span>래스터 (WMS)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ ...getStatusStyle('__error'), background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)' }} />
          <span>오류</span>
        </div>
      </div>

      {/* 마지막 업데이트 시간 */}
      {lastUpdate && (
        <div style={{
          fontSize: '0.7rem',
          color: '#888',
          marginBottom: '12px',
          textAlign: 'right',
        }}>
          마지막 업데이트: {lastUpdate.toLocaleTimeString('ko-KR')}
        </div>
      )}

      {/* 레이어 목록 */}
      <div style={{
        maxHeight: '450px',
        overflowY: 'auto',
        paddingRight: '4px',
      }}>
        {searchQuery ? (
          // 검색 결과
          <div>
            <div style={{
              fontSize: '0.8rem',
              color: '#666',
              marginBottom: '12px',
              padding: '8px 12px',
              background: 'rgba(102, 126, 234, 0.1)',
              borderRadius: '8px',
            }}>
              {displayLayers.length}개 검색 결과
            </div>
            {displayLayers.map((layer, index) => (
              <div
                key={`${layer.category}-${layer.subcategory}-${layer.wmsName}-${index}`}
                onClick={() => handleLayerClick(layer)}
                style={layerItemStyle(selectedLayer === layer.wmsName)}
                onMouseEnter={(e) => {
                  if (selectedLayer !== layer.wmsName) {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedLayer !== layer.wmsName) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                  <span style={{ fontSize: '1rem' }}>{getTypeIcon(layer.type)}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{layer.name}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '2px' }}>
                      {layer.category} › {layer.subcategory}
                    </div>
                  </div>
                </div>
                <div style={getStatusStyle(layer.wmsName)} />
              </div>
            ))}
          </div>
        ) : (
          // 카테고리별 표시
          groupedLayers && Object.entries(groupedLayers).map(([category, subcategories]) => (
            <div key={category} style={{ marginBottom: '8px' }}>
              <div
                onClick={() => toggleCategory(category)}
                style={categoryStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{getCategoryIcon(category)}</span>
                  <span>{category}</span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    background: 'rgba(102, 126, 234, 0.2)',
                    borderRadius: '10px',
                    color: '#667eea',
                  }}>
                    {Object.values(subcategories).flat().length}
                  </span>
                </div>
                <span style={{
                  transition: 'transform 0.3s ease',
                  transform: expandedCategories.has(category) ? 'rotate(180deg)' : 'rotate(0deg)',
                  fontSize: '0.8rem',
                  opacity: 0.6,
                }}>
                  ▼
                </span>
              </div>

              {expandedCategories.has(category) && (
                <div style={{ paddingLeft: '16px', marginTop: '4px' }}>
                  {Object.entries(subcategories).map(([subcategory, layers]) => {
                    const key = `${category}-${subcategory}`;
                    return (
                      <div key={key} style={{ marginBottom: '4px' }}>
                        <div
                          onClick={() => toggleSubcategory(key)}
                          style={subcategoryStyle}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{subcategory}</span>
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '2px 6px',
                              background: 'rgba(0,0,0,0.1)',
                              borderRadius: '8px',
                            }}>
                              {layers.length}
                            </span>
                          </div>
                          <span style={{
                            transition: 'transform 0.3s ease',
                            transform: expandedSubcategories.has(key) ? 'rotate(180deg)' : 'rotate(0deg)',
                            fontSize: '0.7rem',
                            opacity: 0.5,
                          }}>
                            ▼
                          </span>
                        </div>

                        {expandedSubcategories.has(key) && (
                          <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                            {layers.map((layer, layerIndex) => (
                              <div
                                key={`${layer.category}-${layer.subcategory}-${layer.wmsName}-${layerIndex}`}
                                onClick={() => handleLayerClick(layer)}
                                style={layerItemStyle(selectedLayer === layer.wmsName)}
                                onMouseEnter={(e) => {
                                  if (selectedLayer !== layer.wmsName) {
                                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)';
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedLayer !== layer.wmsName) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                  }
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                  <span style={{ fontSize: '0.9rem' }}>{getTypeIcon(layer.type)}</span>
                                  <span>{layer.name}</span>
                                </div>
                                <div style={getStatusStyle(layer.wmsName)} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 레이어 초기화 버튼 */}
      {selectedLayer && (
        <button
          onClick={() => onLayerChange(null)}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '12px',
            background: 'linear-gradient(135deg, rgba(255,107,107,0.2) 0%, rgba(238,90,90,0.2) 100%)',
            border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#ff6b6b',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,107,107,0.3) 0%, rgba(238,90,90,0.3) 100%)';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,107,107,0.2) 0%, rgba(238,90,90,0.2) 100%)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span>✕</span>
          레이어 선택 해제
        </button>
      )}

      {/* 선택된 레이어 정보 */}
      {selectedLayer && (
        <div style={{
          marginTop: '12px',
          padding: '14px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(102, 126, 234, 0.2)',
        }}>
          <div style={{
            fontSize: '0.7rem',
            color: '#667eea',
            fontWeight: 600,
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            선택된 레이어
          </div>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#1a1a2e',
            marginBottom: '8px',
          }}>
            {ALL_LAYERS.find(l => l.wmsName === selectedLayer)?.name || selectedLayer}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: '#666',
          }}>
            <div style={getStatusStyle(selectedLayer)} />
            <span>
              {layerStatuses[selectedLayer] === 'raster' && '래스터 레이어 (지도 표시만 가능)'}
              {layerStatuses[selectedLayer] === 'success' && '벡터 레이어 (데이터 조회 가능)'}
              {layerStatuses[selectedLayer] === 'loading' && '데이터 로딩 중...'}
              {layerStatuses[selectedLayer] === 'error' && '데이터 조회 실패'}
              {!layerStatuses[selectedLayer] && '상태 확인 중...'}
            </span>
          </div>
        </div>
      )}

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .layer-selector::-webkit-scrollbar {
          width: 6px;
        }

        .layer-selector::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .layer-selector::-webkit-scrollbar-thumb {
          background: rgba(102, 126, 234, 0.3);
          border-radius: 3px;
        }

        .layer-selector::-webkit-scrollbar-thumb:hover {
          background: rgba(102, 126, 234, 0.5);
        }
      `}</style>
    </div>
  );
}
