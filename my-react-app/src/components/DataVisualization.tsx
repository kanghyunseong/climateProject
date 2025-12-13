import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getWeatherDataForLaunch } from '../services/weatherApi';

interface DataVisualizationProps {
  data: any;
  locationName?: string;
  location?: { lat: number; lng: number }; // 위치 정보 추가
}

// 다크모드에서 잘 보이는 밝은 색상 팔레트
const CHART_COLORS = {
  temperature: '#f87171', // 기온 - 밝은 빨강
  precipitation: '#60a5fa', // 강수량 - 밝은 파랑
  humidity: '#4ade80', // 습도 - 밝은 초록
  chart: ['#f87171', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#22d3ee'],
};

interface ChartDataPoint {
  name: string;
  기온: number;
  강수량: number;
  습도: number;
  [key: string]: string | number;
}

// 실제 API 데이터에서 값 추출 (위치별로 다른 값 반환)
const extractValueFromFeature = (feature: any, propertyName: string, _lat?: number, _lng?: number): number => {
  if (!feature || !feature.properties) return 0;
  
  const props = feature.properties;
  
  // 1. 정확한 키 이름 매칭 (우선순위)
  const exactMatchKeys = [
    propertyName.toLowerCase(),
    propertyName,
    propertyName.toUpperCase(),
  ];
  
  for (const key of exactMatchKeys) {
    if (props[key] !== undefined && props[key] !== null && props[key] !== '') {
      const value = parseFloat(String(props[key]));
      if (!isNaN(value) && isFinite(value)) {
        return value;
      }
    }
  }
  
  // 2. 부분 매칭 (키 이름에 포함된 경우)
  const partialMatchKeys = Object.keys(props).filter(k => 
    k.toLowerCase().includes(propertyName.toLowerCase()) ||
    propertyName.toLowerCase().includes(k.toLowerCase())
  );
  
  for (const key of partialMatchKeys) {
    if (props[key] !== undefined && props[key] !== null && props[key] !== '') {
      const value = parseFloat(String(props[key]));
      if (!isNaN(value) && isFinite(value)) {
        return value;
      }
    }
  }
  
  // 3. 기상청 API 키 이름 매칭 (T1H, WSD, RN1, REH 등)
  const kmaKeys: Record<string, string[]> = {
    'temperature': ['T1H', 'TMP', 'temp', '기온'],
    'precipitation': ['RN1', 'PCP', 'precip', '강수량'],
    'humidity': ['REH', 'HUMIDITY', '습도'],
    'windSpeed': ['WSD', 'WIND_SPEED', '풍속'],
    'windDirection': ['VEC', 'WIND_DIR', '풍향'],
  };
  
  if (kmaKeys[propertyName]) {
    for (const kmaKey of kmaKeys[propertyName]) {
      if (props[kmaKey] !== undefined && props[kmaKey] !== null && props[kmaKey] !== '') {
        const value = parseFloat(String(props[kmaKey]));
        if (!isNaN(value) && isFinite(value)) {
          return value;
        }
      }
    }
  }
  
  // 숫자 속성 찾기는 제거 (위치별로 다른 값이 나오지 않음)
  // 대신 null 반환하여 실제 데이터가 없음을 알림
  return 0;
};

// 실제 GeoJSON 데이터 파싱 (위치별로 다른 데이터)
const parseGeoJSONData = (data: any, lat?: number, lng?: number): ChartDataPoint[] => {
  if (!data || !data.features || data.features.length === 0) {
    return [];
  }

  return data.features.map((feature: any, index: number): ChartDataPoint => {
    const props = feature.properties || {};
    
    // 위치 정보 추출 (feature의 geometry에서)
    let featureLat = lat;
    let featureLng = lng;
    if (feature.geometry?.coordinates) {
      const coords = feature.geometry.coordinates;
      if (feature.geometry.type === 'Point') {
        featureLng = coords[0];
        featureLat = coords[1];
      }
    }
    
    // 실제 속성에서 값 추출 (여러 패턴 시도)
    let temperature = extractValueFromFeature(feature, 'temperature', featureLat, featureLng);
    if (temperature === 0) {
      temperature = extractValueFromFeature(feature, 'temp', featureLat, featureLng);
    }
    if (temperature === 0) {
      temperature = extractValueFromFeature(feature, '기온', featureLat, featureLng);
    }
    
    let precipitation = extractValueFromFeature(feature, 'precipitation', featureLat, featureLng);
    if (precipitation === 0) {
      precipitation = extractValueFromFeature(feature, 'precip', featureLat, featureLng);
    }
    if (precipitation === 0) {
      precipitation = extractValueFromFeature(feature, '강수량', featureLat, featureLng);
    }
    
    let humidity = extractValueFromFeature(feature, 'humidity', featureLat, featureLng);
    if (humidity === 0) {
      humidity = extractValueFromFeature(feature, '습도', featureLat, featureLng);
    }
    
    // 실제 데이터가 없으면 0으로 표시 (랜덤 값 사용 안 함)
    // 위치별로 다른 데이터를 보여주기 위해

    return {
      name: props.name || props.NAME || props.지역명 || `위치 ${index + 1}${featureLat && featureLng ? ` (${featureLat.toFixed(2)}, ${featureLng.toFixed(2)})` : ''}`,
      기온: temperature > 0 ? Math.round(temperature * 10) / 10 : 0,
      강수량: precipitation > 0 ? Math.round(precipitation * 10) / 10 : 0,
      습도: humidity > 0 ? Math.round(humidity * 10) / 10 : 0,
    };
  });
};

export default function DataVisualization({ data, locationName, location }: DataVisualizationProps) {
  const [selectedDataPoint, setSelectedDataPoint] = useState<ChartDataPoint | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line');
  const [realWeatherData, setRealWeatherData] = useState<any>(null);

  // 위치별 실제 날씨 데이터 가져오기
  useEffect(() => {
    if (location?.lat && location?.lng) {
      getWeatherDataForLaunch(location.lat, location.lng)
        .then(weather => {
          if (weather) {
            setRealWeatherData(weather);
            console.log(`[데이터 시각화] 위치별 날씨 데이터 로드 (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}):`, weather);
          }
        })
        .catch(error => {
          console.debug('[데이터 시각화] 날씨 데이터 로드 실패:', error);
        });
    } else {
      setRealWeatherData(null);
    }
  }, [location?.lat, location?.lng]);

  // 실제 API 데이터 파싱 (위치 정보 포함)
  const chartData = useMemo((): ChartDataPoint[] => {
    // 실제 날씨 API 데이터가 있으면 우선 사용 (위치별로 다른 값)
    if (realWeatherData && location) {
      return [{
        name: locationName || `위치 (${location.lat.toFixed(2)}, ${location.lng.toFixed(2)})`,
        기온: realWeatherData.temperature || 0,
        강수량: realWeatherData.precipitation || 0,
        습도: realWeatherData.humidity || 0,
      }];
    }

    if (!data) {
      return [];
    }

    // GeoJSON 형식 데이터 파싱 (위치 정보 전달)
    if (data.features && Array.isArray(data.features)) {
      const parsed = parseGeoJSONData(data, location?.lat, location?.lng);
      if (parsed.length > 0) {
        return parsed.slice(0, 12); // 최대 12개
      }
    }

    // 다른 형식의 데이터 처리
    if (Array.isArray(data)) {
      return data.slice(0, 12).map((item: any, index: number) => ({
        name: item.name || item.NAME || `데이터 ${index + 1}`,
        기온: item.temperature || item.temp || item.기온 || 0,
        강수량: item.precipitation || item.precip || item.강수량 || 0,
        습도: item.humidity || item.습도 || 0,
      }));
    }

    // 데이터가 없으면 빈 배열 반환 (랜덤 값 사용 안 함, 위치별로 다른 데이터 표시)
    return [];
  }, [data, location, realWeatherData, locationName]);

  const pieData = useMemo(() => {
    if (chartData.length === 0) return [];
    
    const avgTemp = chartData.reduce((sum: number, d: ChartDataPoint) => sum + d.기온, 0) / chartData.length;
    const avgPrecip = chartData.reduce((sum: number, d: ChartDataPoint) => sum + d.강수량, 0) / chartData.length;
    const avgHumidity = chartData.reduce((sum: number, d: ChartDataPoint) => sum + d.습도, 0) / chartData.length;

    return [
      { name: '기온', value: Math.round(avgTemp * 10) / 10 },
      { name: '강수량', value: Math.round(avgPrecip * 10) / 10 },
      { name: '습도', value: Math.round(avgHumidity * 10) / 10 },
    ];
  }, [chartData]);

  if (!data) {
    return (
      <div className="data-visualization">
        <p style={{ color: '#999', textAlign: 'center', padding: '2rem' }}>
          데이터를 선택하면 시각화가 표시됩니다
        </p>
      </div>
    );
  }

  const hasRealData = data.features && data.features.length > 0;

  return (
    <div className="data-visualization">
      <h3>📊 데이터 시각화 {locationName && `- ${locationName}`}</h3>
      
      {hasRealData && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          background: 'rgba(74, 222, 128, 0.15)',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: '#4ade80'
        }}>
          ✅ 실제 API 데이터를 사용 중입니다 ({data.features.length}개 피처)
        </div>
      )}
      
      {selectedDataPoint && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: 'rgba(37, 99, 235, 0.1)',
          border: '1px solid rgba(37, 99, 235, 0.3)',
          color: '#f1f5f9',
          borderRadius: '8px',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>📊 선택된 데이터</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.85rem' }}>
            <div>🌡️ 기온: <strong>{selectedDataPoint.기온}°C</strong></div>
            <div>🌧️ 강수량: <strong>{selectedDataPoint.강수량}mm</strong></div>
            <div>💧 습도: <strong>{selectedDataPoint.습도}%</strong></div>
          </div>
          <button
            onClick={() => setSelectedDataPoint(null)}
            style={{
              marginTop: '0.5rem',
              padding: '0.25rem 0.75rem',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.75rem',
            }}
          >
            닫기
          </button>
        </div>
      )}

      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => setChartType('line')}
          style={{
            flex: 1,
            padding: '0.5rem',
            border: `1px solid ${chartType === 'line' ? '#667eea' : '#e0e0e0'}`,
            borderRadius: '6px',
            background: chartType === 'line' ? '#667eea' : 'white',
            color: chartType === 'line' ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          📈 선 그래프
        </button>
        <button
          onClick={() => setChartType('bar')}
          style={{
            flex: 1,
            padding: '0.5rem',
            border: `1px solid ${chartType === 'bar' ? '#667eea' : '#e0e0e0'}`,
            borderRadius: '6px',
            background: chartType === 'bar' ? '#667eea' : 'white',
            color: chartType === 'bar' ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          📊 막대 그래프
        </button>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h4>기후 데이터 {chartData.length > 0 ? `(${chartData.length}개)` : ''}</h4>
          <ResponsiveContainer width="100%" height={200}>
            {chartType === 'line' ? (
              <LineChart
                data={chartData}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    setSelectedDataPoint(data.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} fontSize={12} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Legend wrapperStyle={{ color: '#f1f5f9' }} />
                <Line 
                  type="monotone" 
                  dataKey="기온" 
                  stroke="#f87171" 
                  strokeWidth={2.5}
                  dot={{ fill: '#f87171', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#f87171' }}
                  connectNulls={true}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="강수량" 
                  stroke="#60a5fa" 
                  strokeWidth={2.5}
                  dot={{ fill: '#60a5fa', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#60a5fa' }}
                  connectNulls={true}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="습도" 
                  stroke="#4ade80" 
                  strokeWidth={2.5}
                  dot={{ fill: '#4ade80', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#4ade80' }}
                  connectNulls={true}
                  isAnimationActive={true}
                />
              </LineChart>
            ) : (
              <BarChart
                data={chartData}
                onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    setSelectedDataPoint(data.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} fontSize={12} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Legend wrapperStyle={{ color: '#f1f5f9' }} />
                <Bar dataKey="기온" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="강수량" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="습도" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
          <p style={{ fontSize: '0.75rem', color: '#999', textAlign: 'center', marginTop: '0.5rem' }}>
            💡 차트를 클릭하면 상세 정보를 확인할 수 있습니다
          </p>
        </div>

        <div className="chart-container">
          <h4>기후 데이터 비교</h4>
          <ResponsiveContainer width="100%" height={240}>
            {chartType === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} fontSize={12} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Legend wrapperStyle={{ color: '#f1f5f9' }} />
                <Line 
                  type="monotone" 
                  dataKey="기온" 
                  stroke="#fb923c" 
                  strokeWidth={2.5}
                  dot={{ fill: '#fb923c', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fb923c' }}
                  connectNulls={true}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="강수량" 
                  stroke="#a78bfa" 
                  strokeWidth={2.5}
                  dot={{ fill: '#a78bfa', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#a78bfa' }}
                  connectNulls={true}
                  isAnimationActive={true}
                />
                <Line 
                  type="monotone" 
                  dataKey="습도" 
                  stroke="#22d3ee" 
                  strokeWidth={2.5}
                  dot={{ fill: '#22d3ee', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#22d3ee' }}
                  connectNulls={true}
                  isAnimationActive={true}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} fontSize={12} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
                <Legend wrapperStyle={{ color: '#f1f5f9' }} />
                <Bar dataKey="기온" fill="#fb923c" radius={[4, 4, 0, 0]} />
                <Bar dataKey="강수량" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="습도" fill="#22d3ee" radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {pieData.length > 0 && (
          <div className="chart-container">
            <h4>평균 기후 데이터</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    name && percent !== undefined ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.chart[index % CHART_COLORS.chart.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'rgba(30, 41, 59, 0.95)',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '8px',
                    color: '#f1f5f9'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
