import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StatisticsDashboardProps {
  selectedLocations: Array<{ lat: number; lng: number; name?: string; data?: any }>;
  selectedLayer: string | null;
}

// 두 지점 간 거리 계산 (Haversine 공식)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 데이터에서 기후 값 추출
function extractClimateValue(data: any, key: string): number | null {
  if (!data || !data.features || data.features.length === 0) return null;
  
  const feature = data.features[0];
  const props = feature.properties || {};
  
  // 다양한 키 패턴 시도
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

export default function StatisticsDashboard({ selectedLocations, selectedLayer }: StatisticsDashboardProps) {
  const stats = useMemo(() => {
    if (selectedLocations.length === 0) {
      return null;
    }

    const avgLat = selectedLocations.reduce((sum, loc) => sum + loc.lat, 0) / selectedLocations.length;
    const avgLng = selectedLocations.reduce((sum, loc) => sum + loc.lng, 0) / selectedLocations.length;

    // 최대 거리 계산
    let maxDistance = 0;
    if (selectedLocations.length > 1) {
      for (let i = 0; i < selectedLocations.length; i++) {
        for (let j = i + 1; j < selectedLocations.length; j++) {
          const dist = calculateDistance(
            selectedLocations[i].lat,
            selectedLocations[i].lng,
            selectedLocations[j].lat,
            selectedLocations[j].lng
          );
          maxDistance = Math.max(maxDistance, dist);
        }
      }
    }

    // 기후 데이터 통계 계산
    const locationsWithData = selectedLocations.filter(loc => loc.data);
    let avgTemperature: number | null = null;
    let avgPrecipitation: number | null = null;
    let avgHumidity: number | null = null;
    let minTemperature: number | null = null;
    let maxTemperature: number | null = null;
    let minPrecipitation: number | null = null;
    let maxPrecipitation: number | null = null;

    // 지역별 상세 데이터
    const locationData: Array<{
      name: string;
      temperature: number | null;
      precipitation: number | null;
      humidity: number | null;
    }> = [];

    if (locationsWithData.length > 0) {
      const temperatures: number[] = [];
      const precipitations: number[] = [];
      const humidities: number[] = [];

      locationsWithData.forEach(loc => {
        const temp = extractClimateValue(loc.data, 'temperature');
        const precip = extractClimateValue(loc.data, 'precipitation');
        const humidity = extractClimateValue(loc.data, 'humidity');
        
        locationData.push({
          name: loc.name || `위치 ${locationData.length + 1}`,
          temperature: temp,
          precipitation: precip,
          humidity: humidity,
        });
        
        if (temp !== null) temperatures.push(temp);
        if (precip !== null) precipitations.push(precip);
        if (humidity !== null) humidities.push(humidity);
      });

      if (temperatures.length > 0) {
        avgTemperature = temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length;
        minTemperature = Math.min(...temperatures);
        maxTemperature = Math.max(...temperatures);
      }
      if (precipitations.length > 0) {
        avgPrecipitation = precipitations.reduce((sum, p) => sum + p, 0) / precipitations.length;
        minPrecipitation = Math.min(...precipitations);
        maxPrecipitation = Math.max(...precipitations);
      }
      if (humidities.length > 0) {
        avgHumidity = humidities.reduce((sum, h) => sum + h, 0) / humidities.length;
      }
    }

    return {
      totalLocations: selectedLocations.length,
      avgLat: avgLat.toFixed(4),
      avgLng: avgLng.toFixed(4),
      maxDistance: maxDistance > 0 ? maxDistance.toFixed(2) : null,
      dataPoints: locationsWithData.length,
      avgTemperature,
      avgPrecipitation,
      avgHumidity,
      minTemperature,
      maxTemperature,
      minPrecipitation,
      maxPrecipitation,
      locationData,
    };
  }, [selectedLocations]);

  if (!stats || selectedLocations.length === 0) {
    return (
      <div className="statistics-dashboard">
        <h3>📈 통계 대시보드</h3>
        <p style={{ color: '#999', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
          지역을 선택하면 통계가 표시됩니다
        </p>
      </div>
    );
  }

  // 차트 데이터 준비
  const chartData = stats.locationData
    .filter(loc => loc.temperature !== null || loc.precipitation !== null || loc.humidity !== null)
    .map(loc => ({
      name: loc.name.length > 10 ? loc.name.substring(0, 10) + '...' : loc.name,
      fullName: loc.name,
      temperature: loc.temperature ?? 0,
      precipitation: loc.precipitation ?? 0,
      humidity: loc.humidity ?? 0,
    }));

  // 파이 차트 데이터 (데이터 로드율)
  const pieData = [
    { name: '데이터 있음', value: stats.dataPoints, color: '#4caf50' },
    { name: '데이터 없음', value: stats.totalLocations - stats.dataPoints, color: '#e0e0e0' },
  ];

  // 진행 바 계산
  const dataLoadRate = (stats.dataPoints / stats.totalLocations) * 100;

  return (
    <div className="statistics-dashboard" style={{ padding: '1rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>📈 통계 대시보드</h3>
      
      {/* 주요 통계 카드 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
        gap: '0.75rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '1rem',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📍</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {stats.totalLocations}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>선택된 지역</div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          borderRadius: '12px',
          padding: '1rem',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📊</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {stats.dataPoints}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>데이터 로드</div>
        </div>

        <div style={{
          background: selectedLayer 
            ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
            : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          borderRadius: '12px',
          padding: '1rem',
          color: 'white',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>🎯</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            {selectedLayer ? 'ON' : 'OFF'}
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>레이어 활성</div>
        </div>

        {stats.maxDistance && (
          <div style={{
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            borderRadius: '12px',
            padding: '1rem',
            color: 'white',
            textAlign: 'center',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📏</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              {stats.maxDistance}km
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>최대 거리</div>
          </div>
        )}
      </div>

      {/* 데이터 로드율 진행 바 */}
      <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
          <span style={{ fontWeight: '600' }}>데이터 로드율</span>
          <span style={{ color: '#667eea', fontWeight: 'bold' }}>{dataLoadRate.toFixed(0)}%</span>
        </div>
        <div style={{
          width: '100%',
          height: '12px',
          background: '#e0e0e0',
          borderRadius: '6px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${dataLoadRate}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
            transition: 'width 0.5s ease',
            borderRadius: '6px',
          }} />
        </div>
      </div>

      {/* 기후 데이터 통계 */}
      {(stats.avgTemperature !== null || stats.avgPrecipitation !== null || stats.avgHumidity !== null) && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', fontWeight: '600' }}>🌡️ 평균 기후 데이터</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {stats.avgTemperature !== null && (
              <div style={{
                padding: '1rem',
                background: 'white',
                borderRadius: '8px',
                border: '2px solid #ff6b6b',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🌡️</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff6b6b', marginBottom: '0.25rem' }}>
                  {stats.avgTemperature.toFixed(1)}°C
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>평균 기온</div>
                {stats.minTemperature !== null && stats.maxTemperature !== null && (
                  <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.25rem' }}>
                    {stats.minTemperature.toFixed(1)}°C ~ {stats.maxTemperature.toFixed(1)}°C
                  </div>
                )}
              </div>
            )}
            {stats.avgPrecipitation !== null && (
              <div style={{
                padding: '1rem',
                background: 'white',
                borderRadius: '8px',
                border: '2px solid #4facfe',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🌧️</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4facfe', marginBottom: '0.25rem' }}>
                  {stats.avgPrecipitation.toFixed(1)}mm
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>평균 강수량</div>
                {stats.minPrecipitation !== null && stats.maxPrecipitation !== null && (
                  <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '0.25rem' }}>
                    {stats.minPrecipitation.toFixed(1)}mm ~ {stats.maxPrecipitation.toFixed(1)}mm
                  </div>
                )}
              </div>
            )}
            {stats.avgHumidity !== null && (
              <div style={{
                padding: '1rem',
                background: 'white',
                borderRadius: '8px',
                border: '2px solid #43e97b',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💧</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#43e97b', marginBottom: '0.25rem' }}>
                  {stats.avgHumidity.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>평균 습도</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 지역별 비교 차트 */}
      {chartData.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', fontWeight: '600' }}>📊 지역별 기후 비교</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              {stats.avgTemperature !== null && (
                <Bar dataKey="temperature" fill="#ff6b6b" name="기온 (°C)" />
              )}
              {stats.avgPrecipitation !== null && (
                <Bar dataKey="precipitation" fill="#4facfe" name="강수량 (mm)" />
              )}
              {stats.avgHumidity !== null && (
                <Bar dataKey="humidity" fill="#43e97b" name="습도 (%)" />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 데이터 로드율 파이 차트 */}
      {stats.totalLocations > 0 && (
        <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', fontWeight: '600' }}>📈 데이터 로드 현황</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => percent !== undefined ? `${name}: ${(percent * 100).toFixed(0)}%` : name}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 요약 정보 */}
      {selectedLocations.length > 1 && (
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '12px', color: 'white' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', fontWeight: '600' }}>📋 요약 정보</h4>
          <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>평균 좌표:</span>
              <span style={{ fontWeight: '600' }}>({stats.avgLat}, {stats.avgLng})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>데이터 로드율:</span>
              <span style={{ fontWeight: '600' }}>{dataLoadRate.toFixed(0)}%</span>
            </div>
            {stats.maxDistance && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>최대 거리:</span>
                <span style={{ fontWeight: '600' }}>{stats.maxDistance}km</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>활성 레이어:</span>
              <span style={{ fontWeight: '600' }}>{selectedLayer || '없음'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

