// 기후 위험 종합 인텔리전스 대시보드
// 모든 기후 데이터를 통합하여 실시간 위험도를 분석하고 AI 기반 예측을 제공

import { useState, useEffect } from 'react';
import {
  analyzeClimateRisk,
  type ClimateRiskAnalysis,
} from '../services/climateRiskService';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';

interface ClimateRiskDashboardProps {
  center?: { lat: number; lng: number };
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(30, 41, 59, 0.9)',
  backdropFilter: 'blur(12px)',
  borderRadius: '16px',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(148, 163, 184, 0.2)',
};

// 다크모드에서 잘 보이는 밝은 색상
const COLORS = {
  safe: '#60a5fa',
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#fb923c',
  critical: '#f87171',
};

// 차트 공통 스타일
const chartAxisStyle = {
  stroke: '#94a3b8',
  tick: { fill: '#94a3b8' },
  fontSize: 12,
};

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(30, 41, 59, 0.95)',
    border: '1px solid rgba(148, 163, 184, 0.3)',
    borderRadius: '8px',
    color: '#f1f5f9',
  },
};

export default function ClimateRiskDashboard({ center }: ClimateRiskDashboardProps) {
  const [analysis, setAnalysis] = useState<ClimateRiskAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!center) {
      setAnalysis(null);
      return;
    }

    const loadAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await analyzeClimateRisk(center.lat, center.lng);
        setAnalysis(result);
      } catch (err: any) {
        console.error('기후 위험 분석 실패:', err);
        setError(err.message || '데이터를 불러올 수 없습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalysis();
  }, [center]);

  if (!center) {
    return (
      <div style={{ ...cardStyle, padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📍</div>
        <p style={{ color: '#f1f5f9' }}>지도를 클릭하여 위치를 선택하세요</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ ...cardStyle, padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🔄</div>
        <p style={{ color: '#f1f5f9' }}>기후 위험 분석 중...</p>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px' }}>
          모든 기후 데이터를 종합 분석하고 있습니다
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...cardStyle, padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⚠️</div>
        <p style={{ color: '#f87171' }}>오류 발생</p>
        <p style={{ fontSize: '0.85rem', marginTop: '8px', color: '#94a3b8' }}>{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  // 차트 데이터 준비
  const riskChartData = [
    { name: '침수', value: analysis.scores.flood, color: COLORS[analysis.details.flood.risk] || COLORS.medium },
    { name: '산사태', value: analysis.scores.landslide, color: COLORS[analysis.details.landslide.risk] || COLORS.medium },
    { name: '폭염', value: analysis.scores.heatwave, color: COLORS[analysis.details.heatwave.risk] || COLORS.medium },
    { name: '대기질', value: analysis.scores.airQuality, color: COLORS.medium },
    { name: '토양', value: analysis.scores.soil, color: COLORS.medium },
    { name: '식생', value: analysis.scores.vegetation, color: COLORS.medium },
  ];

  const predictionData = [
    { name: '현재', ...analysis.scores },
    { name: '24시간 후', ...analysis.predictions.next24h },
    { name: '7일 후', ...analysis.predictions.next7d },
  ];


  return (
    <div style={{ ...cardStyle, padding: '24px', minHeight: '400px', overflowY: 'auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 'bold', color: '#f1f5f9' }}>
          🛡️ 기후 위험 종합 대시보드
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
          실시간 종합 위험도 분석 및 AI 예측
        </p>
      </div>

      {/* 종합 위험도 카드 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${analysis.riskLevel.color}20 0%, ${analysis.riskLevel.color}10 100%)`,
          border: `2px solid ${analysis.riskLevel.color}`,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3.5rem', marginBottom: '8px', color: '#f1f5f9', fontWeight: 'bold' }}>
          {analysis.scores.overall}
        </div>
        <div
          style={{
            fontSize: '1.3rem',
            fontWeight: 'bold',
            color: analysis.riskLevel.color,
            marginBottom: '8px',
          }}
        >
          {analysis.riskLevel.label}
        </div>
        <div style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
          종합 위험도 점수
        </div>
      </div>

      {/* AI 인사이트 */}
      <div
        style={{
          background: 'rgba(37, 99, 235, 0.1)',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          borderLeft: '4px solid #60a5fa',
        }}
      >
        <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: '#f1f5f9' }}>
          🤖 AI 기반 인사이트
        </div>
        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
          {analysis.aiInsights}
        </div>
      </div>

      {/* 위험도별 점수 차트 */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>
          📊 위험도별 점수
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={riskChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="name" {...chartAxisStyle} />
            <YAxis domain={[0, 100]} {...chartAxisStyle} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="value" fill="#60a5fa" radius={[8, 8, 0, 0]}>
              {riskChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 미래 예측 차트 */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>
          📈 위험도 예측 (24시간 / 7일)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={predictionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
            <XAxis dataKey="name" {...chartAxisStyle} />
            <YAxis domain={[0, 100]} {...chartAxisStyle} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ color: '#f1f5f9' }} />
            <Line type="monotone" dataKey="overall" stroke="#a78bfa" strokeWidth={2} name="종합" dot={{ fill: '#a78bfa' }} />
            <Line type="monotone" dataKey="flood" stroke="#60a5fa" strokeWidth={2} name="침수" dot={{ fill: '#60a5fa' }} />
            <Line type="monotone" dataKey="heatwave" stroke="#fb923c" strokeWidth={2} name="폭염" dot={{ fill: '#fb923c' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 상세 정보 */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>
          🔍 상세 위험 정보
        </h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {/* 침수 */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${COLORS[analysis.details.flood.risk] || COLORS.medium}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: '#f1f5f9' }}>🌊 침수 위험</span>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: COLORS[analysis.details.flood.risk] || COLORS.medium,
                  fontWeight: '600',
                }}
              >
                {analysis.details.flood.risk.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              {analysis.details.flood.factors.length > 0
                ? analysis.details.flood.factors.join(', ')
                : '위험 요소 없음'}
            </div>
            {analysis.details.flood.nearbyFacilities > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                취약시설 {analysis.details.flood.nearbyFacilities}개 근접
              </div>
            )}
          </div>

          {/* 산사태 */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${COLORS[analysis.details.landslide.risk] || COLORS.medium}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: '#f1f5f9' }}>⛰️ 산사태 위험</span>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: COLORS[analysis.details.landslide.risk] || COLORS.medium,
                  fontWeight: '600',
                }}
              >
                {analysis.details.landslide.risk.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              {analysis.details.landslide.factors.length > 0
                ? analysis.details.landslide.factors.join(', ')
                : '위험 요소 없음'}
            </div>
            {analysis.details.landslide.historyCount > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                과거 발생 이력 {analysis.details.landslide.historyCount}건
              </div>
            )}
          </div>

          {/* 폭염 */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${COLORS[analysis.details.heatwave.risk] || COLORS.medium}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: '#f1f5f9' }}>🔥 폭염 위험</span>
              <span
                style={{
                  fontSize: '0.85rem',
                  color: COLORS[analysis.details.heatwave.risk] || COLORS.medium,
                  fontWeight: '600',
                }}
              >
                {analysis.details.heatwave.risk.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              현재 온도: {analysis.details.heatwave.currentTemp.toFixed(1)}°C
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              체감온도: {analysis.details.heatwave.heatIndex.toFixed(1)}°C
            </div>
            {analysis.details.heatwave.shelters > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                무더위쉼터 {analysis.details.heatwave.shelters}개 근접
              </div>
            )}
          </div>

          {/* 대기질 */}
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.6)',
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${
                analysis.details.airQuality.risk === 'poor'
                  ? COLORS.critical
                  : analysis.details.airQuality.risk === 'moderate'
                  ? COLORS.medium
                  : COLORS.low
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: '600', color: '#f1f5f9' }}>💨 대기질</span>
              <span
                style={{
                  fontSize: '0.85rem',
                  color:
                    analysis.details.airQuality.risk === 'poor'
                      ? COLORS.critical
                      : analysis.details.airQuality.risk === 'moderate'
                      ? COLORS.medium
                      : COLORS.low,
                  fontWeight: '600',
                }}
              >
                {analysis.details.airQuality.risk.toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              PM2.5: {analysis.details.airQuality.pm25.toFixed(1)}μg/m³
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
              PM10: {analysis.details.airQuality.pm10.toFixed(1)}μg/m³
            </div>
          </div>
        </div>
      </div>

      {/* 권장사항 */}
      <div>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#f1f5f9' }}>
          📋 권장사항
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.8' }}>
          {analysis.recommendations.map((rec, index) => (
            <li key={index}>{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

