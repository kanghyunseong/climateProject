export default function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      <div className="skeleton-header"></div>
      <div className="skeleton-content">
        <div className="skeleton-line"></div>
        <div className="skeleton-line short"></div>
        <div className="skeleton-line"></div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card-skeleton">
      <div className="skeleton-title"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text short"></div>
    </div>
  );
}

