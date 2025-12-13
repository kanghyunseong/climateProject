// 로컬스토리지 서비스 (데이터베이스 대체)

const STORAGE_KEYS = {
  BOOKMARKS: 'climate_bookmarks',
  COMPARISONS: 'climate_comparisons',
  SETTINGS: 'climate_settings',
  HISTORY: 'climate_history',
};

export interface Bookmark {
  id: string;
  name: string;
  lat: number;
  lng: number;
  layer?: string;
  createdAt: string;
  data?: any;
}

export interface Comparison {
  id: string;
  locations: Array<{
    name: string;
    lat: number;
    lng: number;
    data?: any;
  }>;
  createdAt: string;
}

export interface Settings {
  defaultLayer?: string;
  defaultZoom?: number;
  showHeatmap?: boolean;
  theme?: 'light' | 'dark';
}

// 북마크 관리
export const bookmarkService = {
  getAll: (): Bookmark[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  add: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>): Bookmark => {
    const bookmarks = bookmarkService.getAll();
    const newBookmark: Bookmark = {
      ...bookmark,
      id: `bookmark_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      createdAt: new Date().toISOString(),
    };
    bookmarks.push(newBookmark);
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    return newBookmark;
  },

  remove: (id: string): boolean => {
    const bookmarks = bookmarkService.getAll();
    const filtered = bookmarks.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(filtered));
    return filtered.length < bookmarks.length;
  },

  update: (id: string, updates: Partial<Bookmark>): Bookmark | null => {
    const bookmarks = bookmarkService.getAll();
    const index = bookmarks.findIndex(b => b.id === id);
    if (index === -1) return null;
    
    bookmarks[index] = { ...bookmarks[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    return bookmarks[index];
  },
};

// 비교 데이터 관리
export const comparisonService = {
  getAll: (): Comparison[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COMPARISONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  save: (comparison: Omit<Comparison, 'id' | 'createdAt'>): Comparison => {
    const comparisons = comparisonService.getAll();
    const newComparison: Comparison = {
      ...comparison,
      id: `comparison_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      createdAt: new Date().toISOString(),
    };
    comparisons.push(newComparison);
    // 최대 10개만 저장
    if (comparisons.length > 10) {
      comparisons.shift();
    }
    localStorage.setItem(STORAGE_KEYS.COMPARISONS, JSON.stringify(comparisons));
    return newComparison;
  },

  remove: (id: string): boolean => {
    const comparisons = comparisonService.getAll();
    const filtered = comparisons.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COMPARISONS, JSON.stringify(filtered));
    return filtered.length < comparisons.length;
  },
};

// 설정 관리
export const settingsService = {
  get: (): Settings => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  set: (settings: Partial<Settings>): void => {
    const current = settingsService.get();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  },
};

// 검색 히스토리
export const historyService = {
  getAll: (): string[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  add: (query: string): void => {
    const history = historyService.getAll();
    const filtered = history.filter(h => h !== query);
    filtered.unshift(query);
    // 최대 20개만 저장
    const limited = filtered.slice(0, 20);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(limited));
  },

  clear: (): void => {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  },
};

