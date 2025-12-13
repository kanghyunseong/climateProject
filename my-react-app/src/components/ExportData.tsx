import { format } from 'date-fns';
import { jsPDF } from 'jspdf';

interface ExportDataProps {
  data: any;
  locationName?: string;
  coordinates?: { lat: number; lng: number };
}

export default function ExportData({ data, locationName, coordinates }: ExportDataProps) {
  const exportJSON = () => {
    const exportData = {
      location: locationName || 'Unknown',
      coordinates: coordinates || null,
      timestamp: new Date().toISOString(),
      data: data,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate-data-${locationName || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!data || !data.features || data.features.length === 0) {
      alert('내보낼 데이터가 없습니다.');
      return;
    }

    // CSV 헤더
    const headers = ['Index', 'Latitude', 'Longitude', 'Properties'];
    const rows = data.features.map((feature: any, index: number) => {
      const coords = feature.geometry?.coordinates || [];
      const props = JSON.stringify(feature.properties || {});
      return [index + 1, coords[1] || '', coords[0] || '', props];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row: (string | number)[]) => row.map((cell: string | number) => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate-data-${locationName || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // 제목
      doc.setFontSize(18);
      doc.text('기후 데이터 보고서', 14, 20);
      
      // 위치 정보
      doc.setFontSize(12);
      if (locationName) {
        doc.text(`위치: ${locationName}`, 14, 35);
      }
      if (coordinates) {
        doc.text(`좌표: ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`, 14, 42);
      }
      doc.text(`생성일: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, 14, 49);
      
      // 데이터 요약
      let yPos = 60;
      if (data && data.features && data.features.length > 0) {
        doc.setFontSize(14);
        doc.text('데이터 요약', 14, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        doc.text(`총 피처 수: ${data.features.length}개`, 14, yPos);
        yPos += 7;
        
        // 첫 번째 피처의 속성 표시
        const firstFeature = data.features[0];
        if (firstFeature.properties) {
          doc.text('주요 속성:', 14, yPos);
          yPos += 7;
          
          const props = firstFeature.properties;
          let propCount = 0;
          for (const key in props) {
            if (propCount >= 5) break; // 최대 5개만 표시
            const value = props[key];
            if (typeof value === 'string' || typeof value === 'number') {
              doc.text(`  ${key}: ${value}`, 14, yPos);
              yPos += 6;
              propCount++;
            }
          }
        }
      }
      
      // 데이터 상세 (새 페이지)
      if (data && data.features && data.features.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('데이터 상세', 14, 20);
        
        doc.setFontSize(8);
        let currentY = 30;
        const pageHeight = doc.internal.pageSize.height;
        
        data.features.slice(0, 20).forEach((feature: any, index: number) => {
          if (currentY > pageHeight - 20) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.text(`피처 ${index + 1}:`, 14, currentY);
          currentY += 5;
          
          if (feature.geometry?.coordinates) {
            const coords = feature.geometry.coordinates;
            doc.text(`  좌표: [${coords[0]?.toFixed(4) || 'N/A'}, ${coords[1]?.toFixed(4) || 'N/A'}]`, 14, currentY);
            currentY += 5;
          }
          
          if (feature.properties) {
            const props = feature.properties;
            let propShown = 0;
            for (const key in props) {
              if (propShown >= 3) break;
              const value = props[key];
              if (typeof value === 'string' || typeof value === 'number') {
                const text = `  ${key}: ${String(value).substring(0, 30)}`;
                doc.text(text, 14, currentY);
                currentY += 5;
                propShown++;
              }
            }
          }
          
          currentY += 3;
        });
      }
      
      doc.save(`climate-data-${locationName || 'export'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('PDF 내보내기 실패:', error);
      alert('PDF 내보내기에 실패했습니다. 브라우저 콘솔을 확인하세요.');
    }
  };

  const shareLink = () => {
    if (!coordinates) {
      alert('공유할 위치가 없습니다.');
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('lat', coordinates.lat.toString());
    url.searchParams.set('lng', coordinates.lng.toString());
    if (locationName) {
      url.searchParams.set('name', locationName);
    }

    navigator.clipboard.writeText(url.toString()).then(() => {
      alert('링크가 클립보드에 복사되었습니다!');
    }).catch(() => {
      prompt('링크를 복사하세요:', url.toString());
    });
  };

  if (!data) {
    return (
      <div className="export-data">
        <h3>💾 데이터 내보내기</h3>
        <p style={{ color: '#999', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
          데이터를 선택하면 내보내기가 가능합니다
        </p>
      </div>
    );
  }

  return (
    <div className="export-data">
      <h3>💾 데이터 내보내기</h3>
      <div className="export-buttons">
        <button className="export-btn" onClick={exportJSON}>
          📄 JSON 다운로드
        </button>
        <button className="export-btn" onClick={exportCSV}>
          📊 CSV 다운로드
        </button>
        <button className="export-btn" onClick={exportPDF}>
          📑 PDF 다운로드
        </button>
        <button className="export-btn" onClick={shareLink}>
          🔗 링크 공유
        </button>
      </div>
      {locationName && (
        <p style={{ 
          marginTop: '0.75rem', 
          fontSize: '0.85rem', 
          color: '#666',
          textAlign: 'center'
        }}>
          {locationName} 데이터
        </p>
      )}
    </div>
  );
}

