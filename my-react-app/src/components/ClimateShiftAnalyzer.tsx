// 인터랙티브 기후 변화 시점 분석기
// 과거 데이터 비교, 극단 기상 이벤트 탐지, 이상 기후 패턴 분석, 미래 트렌드 예측

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
} from 'recharts';
import {
  generateHistoricalWeatherData,
  generateYearlySummary,
  detectExtremeEvents,
  predictFutureTrend,
  type HistoricalWeatherData,
  type YearlySummary,
} from '../services/historicalWeatherService';

interface ClimateShiftAnalyzerProps {
  center?: { lat: number; lng: number };
}

type TabType = 'comparison' | 'extreme' | 'pattern' | 'trend';

export default function ClimateShiftAnalyzer({ center }: ClimateShiftAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('comparison');
  const [baseYear, setBaseYear] = useState(2014); // 10년 전
  const [compareYear, setCompareYear] = useState(2023); // 최근 1년
  const [historicalData, setHistoricalData] = useState<HistoricalWeatherData[]>([]);
  const [yearlySummary, setYearlySummary] = useState<YearlySummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 극단 기상 이벤트 설정
  const [extremeThresholds, setExtremeThresholds] = useState({
    maxTemperature: 35,
    minTemperature: -15,
    maxPrecipitation: 50,
    maxWindSpeed: 15,
  });

  // 데이터 로드
  useEffect(() => {
    if (!center) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        // 과거 데이터 생성 (2014-2023, 10년치)
        const data = generateHistoricalWeatherData(2014, 2023, center.lat, center.lng);
        setHistoricalData(data);
        
        // 연도별 요약 생성
        const summary = generateYearlySummary(data);
        setYearlySummary(summary);
      } catch (error) {
        console.error('기후 데이터 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [center]);

  // CSA-01: 과거 데이터 비교
  const comparisonData = useMemo(() => {
    if (historicalData.length === 0) return [];

    const baseData = historicalData.filter(
      (d) => new Date(d.date).getFullYear() === baseYear
    );
    const compareData = historicalData.filter(
      (d) => new Date(d.date).getFullYear() === compareYear
    );

    // 월별 평균 계산
    const monthlyBase = new Map<number, { temp: number[]; precip: number[] }>();
    const monthlyCompare = new Map<number, { temp: number[]; precip: number[] }>();

    baseData.forEach((d) => {
      const month = new Date(d.date).getMonth();
      if (!monthlyBase.has(month)) {
        monthlyBase.set(month, { temp: [], precip: [] });
      }
      monthlyBase.get(month)!.temp.push(d.temperature);
      monthlyBase.get(month)!.precip.push(d.precipitation);
    });

    compareData.forEach((d) => {
      const month = new Date(d.date).getMonth();
      if (!monthlyCompare.has(month)) {
        monthlyCompare.set(month, { temp: [], precip: [] });
      }
      monthlyCompare.get(month)!.temp.push(d.temperature);
      monthlyCompare.get(month)!.precip.push(d.precipitation);
    });

    const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    
    return months.map((name, month) => {
      const base = monthlyBase.get(month);
      const compare = monthlyCompare.get(month);
      
      return {
        month: name,
        [`${baseYear}년 평균 기온`]: base
          ? base.temp.reduce((a, b) => a + b, 0) / base.temp.length
          : 0,
        [`${compareYear}년 평균 기온`]: compare
          ? compare.temp.reduce((a, b) => a + b, 0) / compare.temp.length
          : 0,
        [`${baseYear}년 강수량`]: base
          ? base.precip.reduce((a, b) => a + b, 0)
          : 0,
        [`${compareYear}년 강수량`]: compare
          ? compare.precip.reduce((a, b) => a + b, 0)
          : 0,
      };
    });
  }, [historicalData, baseYear, compareYear]);

  // CSA-02: 극단 기상 이벤트 탐지
  const extremeEvents = useMemo(() => {
    if (historicalData.length === 0) return [];
    return detectExtremeEvents(historicalData, extremeThresholds);
  }, [historicalData, extremeThresholds]);

  const extremeEventFrequency = useMemo(() => {
    const frequency = new Map<number, { heat: number; cold: number; rain: number; wind: number }>();
    
    extremeEvents.forEach((event) => {
      const year = new Date(event.date).getFullYear();
      if (!frequency.has(year)) {
        frequency.set(year, { heat: 0, cold: 0, rain: 0, wind: 0 });
      }
      const freq = frequency.get(year)!;
      if (event.type === 'heat') freq.heat++;
      else if (event.type === 'cold') freq.cold++;
      else if (event.type === 'heavyRain') freq.rain++;
      else if (event.type === 'highWind') freq.wind++;
    });

    return Array.from(frequency.entries())
      .map(([year, freq]) => ({ year, ...freq }))
      .sort((a, b) => a.year - b.year);
  }, [extremeEvents]);

  // CSA-03: 이상 기후 패턴 분석 (산점도)
  const scatterData = useMemo(() => {
    if (historicalData.length === 0) return [];
    
    // 평년값 계산 (전체 기간 평균)
    const avgTemp = historicalData.reduce((sum, d) => sum + d.temperature, 0) / historicalData.length;
    const avgPrecip = historicalData.reduce((sum, d) => sum + d.precipitation, 0) / historicalData.length;
    
    // 이상치 탐지 (평년 대비 ±2 표준편차)
    const tempStd = Math.sqrt(
      historicalData.reduce((sum, d) => sum + Math.pow(d.temperature - avgTemp, 2), 0) / historicalData.length
    );
    const precipStd = Math.sqrt(
      historicalData.reduce((sum, d) => sum + Math.pow(d.precipitation - avgPrecip, 2), 0) / historicalData.length
    );

    return historicalData
      .filter((_, index) => index % 10 === 0) // 샘플링 (데이터가 많으면)
      .map((d) => {
        const isOutlier = 
          Math.abs(d.temperature - avgTemp) > 2 * tempStd ||
          d.precipitation > avgPrecip + 2 * precipStd;
        
        return {
          temperature: d.temperature,
          precipitation: d.precipitation,
          date: d.date,
          isOutlier,
          type: isOutlier
            ? (d.temperature > avgTemp + 2 * tempStd ? 'heat' : d.precipitation > avgPrecip + 2 * precipStd ? 'rain' : 'normal')
            : 'normal',
        };
      });
  }, [historicalData]);

  // CSA-04: 미래 트렌드 예측
  const trendPrediction = useMemo(() => {
    if (yearlySummary.length < 2) return [];
    return predictFutureTrend(yearlySummary, 5);
  }, [yearlySummary]);

  const trendChartData = useMemo(() => {
    const historical = yearlySummary.map(s => ({
      year: s.year,
      temperature: s.avgTemperature,
      type: '실제',
    }));
    
    const predicted = trendPrediction.map(p => ({
      year: p.year,
      temperature: p.predictedTemperature,
      type: '예측',
    }));
    
    return [...historical, ...predicted];
  }, [yearlySummary, trendPrediction]);

  if (!center) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
        지도를 클릭하여 위치를 선택하세요.
      </div>
    );
  }

  return (
    <div className="climate-shift-analyzer" style={{ padding: '1rem' }}>
      <h3>📊 인터랙티브 기후 변화 시점 분석기</h3>

      {/* 탭 메뉴 */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('comparison')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'comparison' ? '#667eea' : '#f8f9fa',
            color: activeTab === 'comparison' ? 'white' : '#333',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          📈 기간 비교
        </button>
        <button
          onClick={() => setActiveTab('extreme')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'extreme' ? '#667eea' : '#f8f9fa',
            color: activeTab === 'extreme' ? 'white' : '#333',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          ⚠️ 극단 이벤트
        </button>
        <button
          onClick={() => setActiveTab('pattern')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'pattern' ? '#667eea' : '#f8f9fa',
            color: activeTab === 'pattern' ? 'white' : '#333',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          🔍 이상 패턴
        </button>
        <button
          onClick={() => setActiveTab('trend')}
          style={{
            padding: '0.5rem 1rem',
            background: activeTab === 'trend' ? '#667eea' : '#f8f9fa',
            color: activeTab === 'trend' ? 'white' : '#333',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          🔮 미래 예측
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
          데이터를 불러오는 중...
        </div>
      ) : (
        <>
          {/* CSA-01: 과거 데이터 비교 */}
          {activeTab === 'comparison' && (
            <div>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                    기준 연도:
                  </label>
                  <input
                    type="number"
                    value={baseYear}
                    onChange={(e) => setBaseYear(parseInt(e.target.value, 10))}
                    min={2014}
                    max={2023}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', width: '100px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                    비교 연도:
                  </label>
                  <input
                    type="number"
                    value={compareYear}
                    onChange={(e) => setCompareYear(parseInt(e.target.value, 10))}
                    min={2014}
                    max={2023}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', width: '100px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>평균 기온 비교</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: '기온 (°C)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={`${baseYear}년 평균 기온`}
                      stroke="#8884d8"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey={`${compareYear}년 평균 기온`}
                      stroke="#82ca9d"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>강수량 비교</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: '강수량 (mm)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={`${baseYear}년 강수량`} fill="#8884d8" />
                    <Bar dataKey={`${compareYear}년 강수량`} fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* CSA-02: 극단 기상 이벤트 탐지 */}
          {activeTab === 'extreme' && (
            <div>
              <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>극단 기준 설정</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                      최고 기온 임계값 (°C):
                    </label>
                    <input
                      type="number"
                      value={extremeThresholds.maxTemperature}
                      onChange={(e) =>
                        setExtremeThresholds({
                          ...extremeThresholds,
                          maxTemperature: parseFloat(e.target.value),
                        })
                      }
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                      최저 기온 임계값 (°C):
                    </label>
                    <input
                      type="number"
                      value={extremeThresholds.minTemperature}
                      onChange={(e) =>
                        setExtremeThresholds({
                          ...extremeThresholds,
                          minTemperature: parseFloat(e.target.value),
                        })
                      }
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                      최대 강수량 임계값 (mm):
                    </label>
                    <input
                      type="number"
                      value={extremeThresholds.maxPrecipitation}
                      onChange={(e) =>
                        setExtremeThresholds({
                          ...extremeThresholds,
                          maxPrecipitation: parseFloat(e.target.value),
                        })
                      }
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                      최대 풍속 임계값 (m/s):
                    </label>
                    <input
                      type="number"
                      value={extremeThresholds.maxWindSpeed}
                      onChange={(e) =>
                        setExtremeThresholds({
                          ...extremeThresholds,
                          maxWindSpeed: parseFloat(e.target.value),
                        })
                      }
                      style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #ddd', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                  연도별 극단 이벤트 발생 빈도
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={extremeEventFrequency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis label={{ value: '발생 횟수', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="heat" stackId="a" fill="#ff5722" name="폭염" />
                    <Bar dataKey="cold" stackId="a" fill="#2196f3" name="한파" />
                    <Bar dataKey="rain" stackId="a" fill="#00bcd4" name="호우" />
                    <Bar dataKey="wind" stackId="a" fill="#9e9e9e" name="강풍" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
                총 {extremeEvents.length}개의 극단 이벤트가 탐지되었습니다.
              </div>
            </div>
          )}

          {/* CSA-03: 이상 기후 패턴 분석 */}
          {activeTab === 'pattern' && (
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                온도 vs 강수량 산점도 (이상치 강조)
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={scatterData}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="temperature"
                    name="기온"
                    label={{ value: '기온 (°C)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="precipitation"
                    name="강수량"
                    label={{ value: '강수량 (mm)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div
                            style={{
                              background: 'white',
                              padding: '0.5rem',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                            }}
                          >
                            <p style={{ margin: 0, fontWeight: '600' }}>{data.date}</p>
                            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                              기온: {data.temperature}°C
                            </p>
                            <p style={{ margin: '0.25rem 0', fontSize: '0.85rem' }}>
                              강수량: {data.precipitation}mm
                            </p>
                            {data.isOutlier && (
                              <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: '#f44336' }}>
                                ⚠️ 이상치
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Scatter
                    name="정상"
                    data={scatterData.filter((d) => !d.isOutlier)}
                    fill="#8884d8"
                  />
                  <Scatter
                    name="이상치"
                    data={scatterData.filter((d) => d.isOutlier)}
                    fill="#f44336"
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#666' }}>
                빨간색 점은 평년 대비 이상치(±2 표준편차 이상)를 나타냅니다.
              </div>
            </div>
          )}

          {/* CSA-04: 미래 트렌드 예측 */}
          {activeTab === 'trend' && (
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                평균 기온 트렌드 예측 (선형 회귀)
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis label={{ value: '기온 (°C)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine
                    x={yearlySummary[yearlySummary.length - 1]?.year}
                    stroke="#999"
                    strokeDasharray="3 3"
                    label="현재"
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="기온"
                    data={trendChartData.filter((d) => d.type === '실제')}
                  />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4 }}
                    name="예측"
                    data={trendChartData.filter((d) => d.type === '예측')}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>예측 결과</h4>
                <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem' }}>
                  {trendPrediction.map((pred, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{pred.year}년:</span>
                      <span>
                        예상 평균 기온: <strong>{pred.predictedTemperature}°C</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

