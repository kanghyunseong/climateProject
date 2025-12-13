# 🚀 배포 가이드

이 프로젝트는 **프론트엔드만으로 동작**하며, 서버 없이 정적 파일로 배포할 수 있습니다.

## 배포 옵션

### 1. Vercel (권장) ⚡

가장 간단하고 빠른 배포 방법입니다.

#### 배포 단계:

1. **Vercel 계정 생성**
   - [vercel.com](https://vercel.com) 접속
   - GitHub 계정으로 로그인

2. **프로젝트 배포**
   ```bash
   # Vercel CLI 설치 (선택사항)
   npm i -g vercel
   
   # 프로젝트 디렉토리에서 배포
   vercel
   ```
   
   또는 GitHub에 푸시 후 Vercel 대시보드에서 Import Project

3. **자동 배포**
   - GitHub에 푸시할 때마다 자동으로 배포됩니다
   - `vercel.json` 파일이 이미 설정되어 있습니다

#### 장점:
- ✅ 무료 플랜 제공
- ✅ 자동 HTTPS
- ✅ 글로벌 CDN
- ✅ 자동 배포

---

### 2. Netlify 🌐

#### 배포 단계:

1. **Netlify 계정 생성**
   - [netlify.com](https://netlify.com) 접속
   - GitHub 계정으로 로그인

2. **프로젝트 배포**
   ```bash
   # Netlify CLI 설치 (선택사항)
   npm i -g netlify-cli
   
   # 빌드
   npm run build
   
   # 배포
   netlify deploy --prod
   ```
   
   또는 GitHub에 푸시 후 Netlify 대시보드에서 Import Project

3. **설정**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - `netlify.toml` 파일이 이미 설정되어 있습니다

#### 장점:
- ✅ 무료 플랜 제공
- ✅ 자동 HTTPS
- ✅ 폼 처리 기능
- ✅ 서버리스 함수 지원

---

### 3. GitHub Pages 📄

#### 배포 단계:

1. **빌드 스크립트 추가** (`package.json`에 추가)
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

2. **gh-pages 설치**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **배포**
   ```bash
   npm run deploy
   ```

4. **GitHub 설정**
   - Repository Settings → Pages
   - Source: `gh-pages` 브랜치 선택

---

### 4. 기타 옵션

- **Cloudflare Pages**: 빠른 CDN
- **AWS S3 + CloudFront**: 엔터프라이즈급
- **Firebase Hosting**: Google 서비스 통합

---

## 빌드 및 테스트

### 로컬 빌드 테스트

```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview
```

빌드된 파일은 `dist` 폴더에 생성됩니다.

---

## 환경 변수 (선택사항)

API 키를 환경 변수로 관리하려면:

1. `.env` 파일 생성:
   ```
   VITE_API_KEY=your-api-key-here
   ```

2. `src/config/api.ts` 수정:
   ```typescript
   export const API_CONFIG = {
     API_KEY: import.meta.env.VITE_API_KEY || 'default-key',
     // ...
   };
   ```

3. 배포 플랫폼에서 환경 변수 설정

---

## CORS 문제 해결

프론트엔드에서 직접 API를 호출할 때 CORS 문제가 발생할 수 있습니다.

### 해결 방법:

1. **API 서버 측 CORS 허용** (권장)
   - API 서버에서 CORS 헤더 추가
   - `Access-Control-Allow-Origin: *`

2. **프록시 서버 사용**
   - Vercel/Netlify의 서버리스 함수 활용
   - 또는 별도의 프록시 서버 구축

3. **브라우저 확장 프로그램** (개발용)
   - CORS Unblock 등 (프로덕션에서는 사용 불가)

---

## 배포 후 확인사항

- [ ] 지도가 정상적으로 표시되는가?
- [ ] 레이어 선택이 작동하는가?
- [ ] 지도 클릭 시 데이터가 로드되는가?
- [ ] 반응형 디자인이 모바일에서 작동하는가?
- [ ] API 호출이 정상적으로 이루어지는가?

---

## 트러블슈팅

### 문제: 지도가 표시되지 않음
- Leaflet CSS가 제대로 로드되었는지 확인
- 브라우저 콘솔에서 오류 확인

### 문제: API 호출 실패
- CORS 설정 확인
- API 키가 유효한지 확인
- 네트워크 탭에서 요청/응답 확인

### 문제: 빌드 실패
- Node.js 버전 확인 (18 이상 권장)
- `node_modules` 삭제 후 재설치
- TypeScript 오류 확인

---

## 성능 최적화

빌드된 파일 크기 최적화:
- 코드 스플리팅 (이미 설정됨)
- 이미지 최적화
- Gzip 압축 (배포 플랫폼에서 자동 처리)

---

## 지원

문제가 발생하면:
1. 브라우저 콘솔 확인
2. 네트워크 탭 확인
3. GitHub Issues 생성

