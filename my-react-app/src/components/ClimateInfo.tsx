import { useEffect, useState } from 'react';
import { getClimateDataAtPoint } from '../services/climateApi';

interface ClimateInfoProps {
  lat: number | null;
  lng: number | null;
}

export default function ClimateInfo({ lat, lng }: ClimateInfoProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lat && lng) {
      setLoading(true);
      setError(null);
      setData(null);
      
      // 약간의 딜레이로 UX 개선
      const timer = setTimeout(() => {
        getClimateDataAtPoint(lng, lat)
          .then((result) => {
            setData(result);
            setLoading(false);
          })
          .catch((err) => {
            console.error('데이터 로딩 오류:', err);
            setError('데이터를 불러올 수 없습니다. 다른 위치를 선택해주세요.');
            setLoading(false);
          });
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setData(null);
      setError(null);
    }
  }, [lat, lng]);

  if (!lat || !lng) {
    return (
      <div className="climate-info">
        <h3>📍 위치 정보</h3>
        <p style={{ color: '#999', fontStyle: 'italic' }}>
          지도를 클릭하여 해당 위치의 기후 정보를 확인하세요.
        </p>
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eaf6 100%)',
          borderRadius: '12px',
          fontSize: '0.85rem',
          color: '#667eea',
          lineHeight: '1.6'
        }}>
          💡 <strong>사용 팁:</strong> 왼쪽에서 데이터 레이어를 선택한 후 지도를 클릭하면 더 자세한 정보를 확인할 수 있습니다.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="climate-info">
        <h3>📍 위치 정보</h3>
        <div className="loading">
          <div className="loading-spinner"></div>
          <span>데이터를 불러오는 중...</span>
        </div>
        <p style={{ marginTop: '1rem', color: '#999', fontSize: '0.85rem' }}>
          좌표: {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="climate-info">
        <h3>📍 위치 정보</h3>
        <p style={{ marginBottom: '0.5rem' }}>
          <strong>좌표:</strong> {lat.toFixed(4)}, {lng.toFixed(4)}
        </p>
        <div className="error">{error}</div>
        <p style={{ marginTop: '1rem', color: '#999', fontSize: '0.85rem' }}>
          다른 위치를 선택하거나 나중에 다시 시도해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="climate-info">
      <h3>📍 선택한 위치 정보</h3>
      <p>
        <strong>좌표:</strong> {lat.toFixed(4)}, {lng.toFixed(4)}
      </p>
      
      {data && (
        <div className="data-preview">
          <p style={{ marginBottom: '0.75rem', fontWeight: '600', color: '#667eea' }}>
            ✅ 데이터 로드 완료
          </p>
          {data.features && data.features.length > 0 ? (
            <div>
              <p style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                <strong>발견된 피처:</strong> {data.features.length}개
              </p>
              <details style={{ marginTop: '0.5rem' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  color: '#667eea', 
                  fontWeight: '500',
                  fontSize: '0.85rem'
                }}>
                  상세 데이터 보기
                </summary>
                <pre style={{ marginTop: '0.5rem' }}>
                  {JSON.stringify(data, null, 2).substring(0, 1000)}
                  {JSON.stringify(data, null, 2).length > 1000 ? '...' : ''}
                </pre>
              </details>
            </div>
          ) : (
            <pre>{JSON.stringify(data, null, 2).substring(0, 500)}...</pre>
          )}
        </div>
      )}
    </div>
  );
}
