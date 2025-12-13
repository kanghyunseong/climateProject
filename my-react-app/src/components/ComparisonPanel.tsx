import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Location {
  name?: string;
  lat: number;
  lng: number;
  data?: any;
}

interface ComparisonPanelProps {
  locations: Location[];
  onRemove: (index: number) => void;
  onClear: () => void;
}

// 데이터에서 기후 값 추출
function extractClimateValue(data: any, key: string): number | null {
  if (!data || !data.features || data.features.length === 0) return null;
  
  const feature = data.features[0];
  const props = feature.properties || {};
  
  const possibleKeys = [
    key.toLowerCase(),
    key,
    key.toUpperCase(),
    `temp_${key}`,
    `value_${key}`,
  ];
  
  for (const k of possibleKeys) {
    if (props[k] !== undefined && props[k] !== null) {
      const value = parseFloat(props[k]);
      if (!isNaN(value)) return value;
    }
  }
  
  return null;
}

export default function ComparisonPanel({ locations, onRemove, onClear }: ComparisonPanelProps) {
  // 비교 차트 데이터 생성
  const comparisonChartData = useMemo(() => {
    if (locations.length < 2) return [];

    return locations.map((location, index) => {
      const temp = location.data ? extractClimateValue(location.data, 'temperature') : null;
      const precip = location.data ? extractClimateValue(location.data, 'precipitation') : null;
      const humidity = location.data ? extractClimateValue(location.data, 'humidity') : null;

      return {
        name: location.name || `위치 ${index + 1}`,
        기온: temp !== null ? Math.round(temp * 10) / 10 : 0,
        강수량: precip !== null ? Math.round(precip * 10) / 10 : 0,
        습도: humidity !== null ? Math.round(humidity * 10) / 10 : 0,
      };
    });
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="comparison-panel">
        <h3>⚖️ 지역 비교</h3>
        <p style={{ color: '#999', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
          지도를 클릭하여 비교할 지역을 추가하세요 (최대 3개)
        </p>
      </div>
    );
  }

  return (
    <div className="comparison-panel">
      <div className="comparison-header">
        <h3>⚖️ 지역 비교 ({locations.length}/3)</h3>
        {locations.length > 0 && (
          <button className="clear-comparison" onClick={onClear}>
            모두 지우기
          </button>
        )}
      </div>
      
      <div className="comparison-list">
        {locations.map((location, index) => {
          const temp = location.data ? extractClimateValue(location.data, 'temperature') : null;
          const precip = location.data ? extractClimateValue(location.data, 'precipitation') : null;
          const humidity = location.data ? extractClimateValue(location.data, 'humidity') : null;

          return (
            <div key={index} className="comparison-item">
              <div className="comparison-item-header">
                <span className="comparison-number">{index + 1}</span>
                <span className="comparison-name">{location.name || `위치 ${index + 1}`}</span>
                <button
                  className="remove-button"
                  onClick={() => onRemove(index)}
                  title="제거"
                >
                  ✕
                </button>
              </div>
              <div className="comparison-details">
                <div className="detail-row">
                  <span className="detail-label">좌표:</span>
                  <span className="detail-value">
                    {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                  </span>
                </div>
                {location.data && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">데이터:</span>
                      <span className="detail-value">✓ 로드됨</span>
                    </div>
                    {temp !== null && (
                      <div className="detail-row">
                        <span className="detail-label">🌡️ 기온:</span>
                        <span className="detail-value">{temp.toFixed(1)}°C</span>
                      </div>
                    )}
                    {precip !== null && (
                      <div className="detail-row">
                        <span className="detail-label">🌧️ 강수량:</span>
                        <span className="detail-value">{precip.toFixed(1)}mm</span>
                      </div>
                    )}
                    {humidity !== null && (
                      <div className="detail-row">
                        <span className="detail-label">💧 습도:</span>
                        <span className="detail-value">{humidity.toFixed(1)}%</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {locations.length >= 2 && comparisonChartData.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>📊 비교 차트</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="기온" fill="#667eea" />
              <Bar dataKey="강수량" fill="#764ba2" />
              <Bar dataKey="습도" fill="#f093fb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {locations.length >= 3 && (
        <div className="comparison-limit">
          최대 3개 지역까지 비교할 수 있습니다
        </div>
      )}
    </div>
  );
}

