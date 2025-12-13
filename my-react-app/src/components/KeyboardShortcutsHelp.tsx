import { useState, useEffect } from 'react';

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="shortcuts-modal" onClick={() => setIsOpen(false)}>
      <div className="shortcuts-content" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-header">
          <h2>⌨️ 키보드 단축키</h2>
          <button className="close-button" onClick={() => setIsOpen(false)}>
            ✕
          </button>
        </div>
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>K</kbd>
            <span>검색창 포커스</span>
          </div>
          <div className="shortcut-item">
            <kbd>Esc</kbd>
            <span>선택 해제</span>
          </div>
          <div className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>E</kbd>
            <span>데이터 내보내기</span>
          </div>
          <div className="shortcut-item">
            <kbd>Ctrl</kbd> + <kbd>C</kbd>
            <span>비교 모드 토글</span>
          </div>
          <div className="shortcut-item">
            <kbd>?</kbd>
            <span>도움말 보기</span>
          </div>
        </div>
      </div>
    </div>
  );
}

