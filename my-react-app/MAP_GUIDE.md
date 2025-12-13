# 🗺️ 지도 타입 가이드

이 프로젝트는 여러 지도 타입을 지원합니다. 각 지도의 특징과 사용 방법을 안내합니다.

## 지원하는 지도 타입

### 1. VWorld (기본값) ✅ **권장**

**특징:**
- 국토교통부 공식 지도 서비스
- **무료 사용 가능** (API 키 불필요)
- 한국 지역에 최적화
- 정확한 행정구역 정보
- 공공 데이터와 호환성 우수

**사용 방법:**
- 별도 설정 불필요
- 기본값으로 자동 선택됨

**장점:**
- ✅ 무료
- ✅ 한국 지역 특화
- ✅ 공공 데이터와 호환
- ✅ API 키 불필요

---

### 2. OpenStreetMap (OSM)

**특징:**
- 오픈소스 지도
- 전 세계 커버리지
- 무료 사용 가능
- 한국 지역 정보는 상대적으로 부족

**사용 방법:**
- 지도 타입 선택에서 "OpenStreetMap" 선택

**장점:**
- ✅ 무료
- ✅ API 키 불필요
- ✅ 전 세계 커버리지

**단점:**
- ⚠️ 한국 지역 정보가 상대적으로 부족

---

### 3. 카카오맵 🗺️

**특징:**
- 한국에서 가장 정확한 지도
- 상세한 POI (관심 지점) 정보
- 실시간 교통 정보
- **API 키 필요**

**사용 방법:**
1. [카카오 개발자 센터](https://developers.kakao.com/) 접속
2. 애플리케이션 등록
3. JavaScript 키 발급
4. `src/config/mapConfig.ts`에서 API 키 설정

**장점:**
- ✅ 한국 최고 정확도
- ✅ 상세한 POI 정보
- ✅ 무료 플랜 제공 (일일 호출 제한)

**단점:**
- ⚠️ API 키 필요
- ⚠️ 일일 호출 제한

**API 키 설정 방법:**
```typescript
// src/config/mapConfig.ts
case 'kakao':
  // 카카오맵 JavaScript API 사용 시
  return `https://dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_API_KEY`;
```

---

### 4. 네이버 지도 📍

**특징:**
- 네이버의 지도 서비스
- 한국 지역 상세 정보
- **API 키 필요**

**사용 방법:**
1. [네이버 클라우드 플랫폼](https://www.ncloud.com/) 접속
2. Maps API 신청
3. API 키 발급
4. `src/config/mapConfig.ts`에서 API 키 설정

**장점:**
- ✅ 한국 지역 상세 정보
- ✅ 무료 플랜 제공

**단점:**
- ⚠️ API 키 필요
- ⚠️ 일일 호출 제한

---

## 추천 설정

### 프로덕션 환경 (실제 서비스)

**1순위: VWorld** ✅
- 무료
- 한국 지역 최적화
- 공공 데이터와 호환
- API 키 불필요

**2순위: 카카오맵**
- 더 상세한 정보가 필요한 경우
- API 키 발급 후 사용

### 개발/테스트 환경

**OpenStreetMap** 또는 **VWorld** 사용 권장

---

## 지도 타입 변경 방법

1. 사이드바 상단의 "🗺️ 지도 타입 선택" 섹션 클릭
2. 원하는 지도 타입 선택
3. 지도가 자동으로 변경됨

---

## API 키가 필요한 지도 사용 시

### 카카오맵 API 키 발급

1. [카카오 개발자 센터](https://developers.kakao.com/) 접속
2. 내 애플리케이션 → 애플리케이션 추가하기
3. JavaScript 키 복사
4. 환경 변수 또는 설정 파일에 추가

### 네이버 지도 API 키 발급

1. [네이버 클라우드 플랫폼](https://www.ncloud.com/) 접속
2. Maps API 신청
3. API 키 발급
4. 환경 변수 또는 설정 파일에 추가

---

## 현재 설정 확인

현재 프로젝트는 **VWorld**를 기본값으로 사용합니다. 이는 한국 지역에 최적화되어 있고, API 키 없이 무료로 사용할 수 있습니다.

---

## 문제 해결

### 지도가 표시되지 않는 경우

1. 브라우저 콘솔 확인 (F12)
2. 네트워크 탭에서 타일 로딩 확인
3. CORS 오류 확인
4. 지도 타입 변경 시도

### API 키 오류

- 카카오맵/네이버 지도 사용 시 API 키가 올바르게 설정되었는지 확인
- API 키의 도메인 제한 설정 확인

---

## 참고 자료

- [VWorld API 문서](https://www.vworld.kr/dev/v4api.do)
- [카카오맵 API 문서](https://developers.kakao.com/docs/latest/ko/local/dev-guide)
- [네이버 지도 API 문서](https://guide.ncloud.com/docs/maps-web-overview)
- [OpenStreetMap](https://www.openstreetmap.org/)

