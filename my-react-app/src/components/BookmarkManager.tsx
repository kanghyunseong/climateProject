import { useState, useEffect, useMemo } from 'react';
import { bookmarkService, type Bookmark } from '../services/localStorageService';

interface BookmarkManagerProps {
  onBookmarkSelect: (bookmark: { lat: number; lng: number; name: string }) => void;
  currentLocation?: { lat: number; lng: number; name?: string };
  currentLayer?: string | null;
}

export default function BookmarkManager({ 
  onBookmarkSelect, 
  currentLocation,
  currentLayer 
}: BookmarkManagerProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'layer'>('date');

  useEffect(() => {
    // 로컬스토리지에서 북마크 로드
    setBookmarks(bookmarkService.getAll());
  }, []);

  // 검색 및 정렬된 북마크
  const filteredBookmarks = useMemo(() => {
    let filtered = [...bookmarks];

    // 검색 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bookmark =>
        bookmark.name.toLowerCase().includes(query) ||
        bookmark.lat.toString().includes(query) ||
        bookmark.lng.toString().includes(query) ||
        (bookmark.layer && bookmark.layer.toLowerCase().includes(query))
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'layer':
          return (a.layer || '').localeCompare(b.layer || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [bookmarks, searchQuery, sortBy]);

  const addBookmark = () => {
    if (!currentLocation) {
      alert('현재 위치가 없습니다. 지도를 클릭하여 위치를 선택하세요.');
      return;
    }

    const name = prompt('북마크 이름을 입력하세요:', currentLocation.name || '새 북마크');
    if (!name) return;

    bookmarkService.add({
      name,
      lat: currentLocation.lat,
      lng: currentLocation.lng,
      layer: currentLayer || undefined,
      data: (currentLocation as any).data,
    });

    setBookmarks(bookmarkService.getAll());
    alert('북마크가 추가되었습니다.');
  };

  const removeBookmark = (id: string) => {
    if (confirm('북마크를 삭제하시겠습니까?')) {
      bookmarkService.remove(id);
      setBookmarks(bookmarkService.getAll());
    }
  };

  const handleBookmarkClick = (bookmark: Bookmark) => {
    onBookmarkSelect({
      lat: bookmark.lat,
      lng: bookmark.lng,
      name: bookmark.name,
    });
  };

  return (
    <div className="bookmark-manager">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>⭐ 북마크 ({bookmarks.length}개)</h3>
        {currentLocation && (
          <button
            onClick={addBookmark}
            className="action-btn primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            ➕ 추가
          </button>
        )}
      </div>

      {bookmarks.length > 0 && (
        <>
          <div style={{ marginBottom: '0.75rem' }}>
            <input
              type="text"
              placeholder="🔍 북마크 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '0.85rem',
              }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'layer')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                fontSize: '0.85rem',
                background: 'white',
              }}
            >
              <option value="date">최신순</option>
              <option value="name">이름순</option>
              <option value="layer">레이어순</option>
            </select>
          </div>
        </>
      )}

      {bookmarks.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
          저장된 북마크가 없습니다.
          {currentLocation && (
            <>
              <br />
              <span style={{ fontSize: '0.85rem' }}>
                현재 위치를 북마크에 추가하세요.
              </span>
            </>
          )}
        </p>
      ) : filteredBookmarks.length === 0 ? (
        <p style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', padding: '2rem' }}>
          검색 결과가 없습니다.
        </p>
      ) : (
        <div className="bookmark-list">
          {filteredBookmarks.map((bookmark) => (
            <div key={bookmark.id} className="bookmark-item">
              <div
                onClick={() => handleBookmarkClick(bookmark)}
                style={{ flex: 1, cursor: 'pointer' }}
              >
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  {bookmark.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {bookmark.lat.toFixed(4)}, {bookmark.lng.toFixed(4)}
                </div>
                {bookmark.layer && (
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                    레이어: {bookmark.layer.split(':')[1] || bookmark.layer}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
                  {new Date(bookmark.createdAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <button
                onClick={() => removeBookmark(bookmark.id)}
                className="remove-button"
                style={{ marginLeft: '0.5rem' }}
                title="삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
