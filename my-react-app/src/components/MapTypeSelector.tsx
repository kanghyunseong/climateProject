export type MapType = 'osm' | 'kakao' | 'vworld';

interface MapTypeSelectorProps {
  onMapTypeChange: (mapType: MapType) => void;
  currentMapType: MapType;
}

const MAP_TYPES: Array<{ value: MapType; label: string; icon: string; description: string }> = [
  {
    value: 'osm',
    label: 'OpenStreetMap',
    icon: '🌍',
    description: '기본 지도 (가장 안정적)'
  },
  {
    value: 'kakao',
    label: '지형도',
    icon: '🏔️',
    description: '지형/등고선 표시'
  },
  {
    value: 'vworld',
    label: '심플 지도',
    icon: '🗺️',
    description: '깔끔한 밝은 스타일'
  },
];

export default function MapTypeSelector({ onMapTypeChange, currentMapType }: MapTypeSelectorProps) {
  return (
    <div className="map-type-selector">
      <h3>🗺️ 지도 타입 선택</h3>
      <div className="map-type-buttons">
        {MAP_TYPES.map((mapType) => (
          <button
            key={mapType.value}
            onClick={() => onMapTypeChange(mapType.value)}
            className={currentMapType === mapType.value ? 'active' : ''}
            title={mapType.description}
          >
            <span className="map-type-icon">{mapType.icon}</span>
            <div className="map-type-info">
              <span className="map-type-label">{mapType.label}</span>
              <span className="map-type-desc">{mapType.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

