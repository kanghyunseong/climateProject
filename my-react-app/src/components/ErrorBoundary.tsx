import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="error-boundary">
      <div className="error-boundary-content">
        <div className="error-icon">⚠️</div>
        <h2>오류가 발생했습니다</h2>
        <p className="error-message">{error.message || '알 수 없는 오류가 발생했습니다.'}</p>
        <div className="error-actions">
          <button onClick={resetErrorBoundary} className="retry-button">
            다시 시도
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="reload-button"
          >
            페이지 새로고침
          </button>
        </div>
        <details className="error-details">
          <summary>상세 오류 정보</summary>
          <pre>{error.stack}</pre>
        </details>
      </div>
    </div>
  );
}

interface AppErrorBoundaryProps {
  children: ReactNode;
}

export default function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('Error caught by boundary:', error, errorInfo);
        // 여기에 에러 리포팅 서비스 연동 가능
      }}
      onReset={() => {
        // 에러 리셋 시 실행할 로직
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

