import { useDarkMode } from '../hooks/useDarkMode';

export default function DarkModeToggle() {
  const { isDark, toggle } = useDarkMode();

  return (
    <button
      className="dark-mode-toggle"
      onClick={toggle}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      aria-label="다크 모드 토글"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}

