// 사용자 설정 저장 서비스 (localStorage 기반)
// 서버/DB 없이 프론트엔드에서만 작동

export interface UserPreferences {
  // 건강 정보
  hasAsthma?: boolean;
  hasAllergies?: boolean;
  preferredActivity?: 'outdoor' | 'indoor' | 'both';
  sensitivityLevel?: 'low' | 'medium' | 'high';
  
  // 발사 윈도우 설정
  launchCriteria?: {
    minWindSpeed: number;
    maxWindSpeed: number;
    maxPrecipitation: number;
    maxCloudCover: number;
    maxCrosswind: number;
  };
  
  // 테마 설정
  enableClimateTheme?: boolean;
  enableDarkMode?: boolean;
  
  // 실시간 갱신 설정
  enableRealtime?: boolean;
  pollingInterval?: number;
}

const STORAGE_KEY = 'climate-app-preferences';

// 사용자 설정 불러오기
export const loadUserPreferences = (): UserPreferences => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('사용자 설정 불러오기 실패:', error);
  }
  return {};
};

// 사용자 설정 저장
export const saveUserPreferences = (preferences: Partial<UserPreferences>): void => {
  try {
    const current = loadUserPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('사용자 설정 저장 실패:', error);
  }
};

// 특정 설정 가져오기
export const getPreference = <K extends keyof UserPreferences>(
  key: K,
  defaultValue?: UserPreferences[K]
): UserPreferences[K] | undefined => {
  const preferences = loadUserPreferences();
  return preferences[key] !== undefined ? preferences[key] : defaultValue;
};

// 특정 설정 저장
export const setPreference = <K extends keyof UserPreferences>(
  key: K,
  value: UserPreferences[K]
): void => {
  saveUserPreferences({ [key]: value });
};

// 모든 설정 초기화
export const clearUserPreferences = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('사용자 설정 초기화 실패:', error);
  }
};

