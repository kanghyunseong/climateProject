# 🌍 기후 스마트 라이프 가이드

경기도 기후위성데이터와 공간정보를 활용한 창의적이고 실용적인 웹 서비스

## 📋 프로젝트 소개

**기후 스마트 라이프 가이드**는 경기기후플랫폼의 API를 활용하여 지역별 기후 데이터를 시각화하고, 사용자 목적에 맞는 최적의 지역을 추천하는 서비스입니다.

### 주요 기능

1. **📍 지역별 기후 데이터 실시간 시각화**
   - WMS(Web Map Service)를 통한 지도 기반 데이터 시각화
   - 기온, 강수량, 습도, 토양 등 다양한 레이어 제공

2. **🎯 목적별 최적 지역 추천**
   - 거주, 농업, 관광, 투자 등 목적별 맞춤 추천
   - 기후 데이터 기반 스마트 분석

3. **🗺️ 인터랙티브 지도**
   - 지도 클릭을 통한 지역별 상세 정보 확인
   - WFS(Web Feature Service)를 통한 공간 데이터 조회

4. **📊 실시간 데이터 조회**
   - 특정 좌표의 기후 정보 실시간 조회
   - JSON 형식의 상세 데이터 제공

## 🚀 시작하기

### 필수 요구사항

- Node.js 18 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

## 📦 배포

이 프로젝트는 **프론트엔드만으로 동작**하며, 서버 없이 정적 파일로 배포할 수 있습니다.

### 빠른 배포 (Vercel 권장)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

또는 GitHub에 푸시 후 [Vercel](https://vercel.com)에서 Import Project

### 다른 배포 옵션

- **Netlify**: `netlify deploy --prod`
- **GitHub Pages**: `npm run deploy` (설정 필요)
- **기타**: `dist` 폴더를 정적 호스팅 서비스에 업로드

자세한 배포 가이드는 [DEPLOY.md](./DEPLOY.md)를 참고하세요.

## 🛠️ 기술 스택

- **Frontend**: React 19.2.0 + TypeScript
- **빌드 도구**: Vite 7.2.4
- **지도 라이브러리**: Leaflet + React-Leaflet
- **HTTP 클라이언트**: Axios
- **스타일링**: CSS3

## 📁 프로젝트 구조

```
my-react-app/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── ClimateMap.tsx   # 지도 컴포넌트
│   │   ├── LayerSelector.tsx # 레이어 선택 컴포넌트
│   │   ├── ClimateInfo.tsx  # 기후 정보 표시 컴포넌트
│   │   └── RegionRecommendation.tsx # 지역 추천 컴포넌트
│   ├── services/            # API 서비스
│   │   └── climateApi.ts    # 기후 API 호출 함수
│   ├── config/              # 설정 파일
│   │   └── api.ts           # API 설정 및 상수
│   ├── App.tsx              # 메인 앱 컴포넌트
│   └── main.tsx             # 진입점
├── public/                  # 정적 파일
└── package.json
```

## 🔌 API 사용

### 경기기후플랫폼 API

이 프로젝트는 [경기기후플랫폼 API](https://climate.gg.go.kr/ols/data/api)를 사용합니다.

#### 지원하는 서비스

- **WMS (Web Map Service)**: 지도 이미지 제공
- **WFS (Web Feature Service)**: 공간 데이터 제공
- **WMTS (Web Map Tile Service)**: 타일 지도 제공

#### API 키

프로젝트에 기본 API 키가 포함되어 있습니다. 실제 운영 환경에서는 환경 변수로 관리하는 것을 권장합니다.

## 💡 주요 아이디어 및 특징

### 1. 종합적인 데이터 활용
- 92종의 레이어 데이터를 통합 활용
- WMS, WFS, WMTS 모든 서비스 지원

### 2. 사용자 친화적 인터페이스
- 직관적인 레이어 선택 UI
- 실시간 지도 인터랙션
- 반응형 디자인 지원

### 3. 실용적인 기능
- 목적별 지역 추천 알고리즘
- 클릭 한 번으로 상세 정보 확인
- 다양한 기후 데이터 시각화

## 🎨 UI/UX 특징

- 모던한 그라데이션 디자인
- 부드러운 애니메이션 효과
- 직관적인 아이콘 사용
- 반응형 레이아웃

## 📝 개발 노트

### 향후 개선 사항

1. **기후 변화 타임라인**: 과거-현재-미래 예측 데이터 시각화
2. **고급 필터링**: 다중 조건 검색 기능
3. **데이터 내보내기**: 분석 결과 다운로드
4. **비교 기능**: 여러 지역 동시 비교
5. **알림 기능**: 기후 변화 알림

## 📄 라이선스

이 프로젝트는 해커톤을 위한 프로토타입입니다.

**해커톤 주제**: 경기기후위성데이터와 공간정보(지도 등)를 활용한 창의적 실용적 서비스 개발
