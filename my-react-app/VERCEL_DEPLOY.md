# Vercel 배포 가이드

## 1. Vercel CLI 설치 및 로그인

```bash
npm i -g vercel
vercel login
```

## 2. 프로젝트 배포

프로젝트 루트 디렉토리에서:

```bash
vercel
```

또는 프로덕션 배포:

```bash
vercel --prod
```

## 3. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정해야 합니다:

### 필수 환경 변수

- `VITE_KMA_API_KEY`: 기상청 공공데이터 API 키 (data.go.kr에서 발급)
- `VITE_GROQ_API_KEY`: Groq AI API 키 (선택사항, https://console.groq.com 에서 발급)
- `VITE_API_KEY`: 경기기후플랫폼 API 키 (선택사항, 기본값 사용 가능)

### Vercel 대시보드에서 설정하는 방법

1. Vercel 대시보드 접속
2. 프로젝트 선택
3. Settings → Environment Variables
4. 각 환경 변수 추가:
   - Key: `VITE_KMA_API_KEY`
   - Value: (실제 API 키)
   - Environment: Production, Preview, Development 모두 선택

## 4. 빌드 설정 확인

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Framework Preset**: Vite

## 5. 배포 후 확인사항

1. 환경 변수가 제대로 설정되었는지 확인
2. API 호출이 정상 작동하는지 확인
3. CORS 오류가 없는지 확인 (경기기후플랫폼 API가 CORS를 허용해야 함)

## 6. 트러블슈팅

### 빌드 실패 시

```bash
# 로컬에서 빌드 테스트
npm run build

# 빌드 결과 확인
npm run preview
```

### 환경 변수 오류 시

- Vercel 대시보드에서 환경 변수 확인
- 환경 변수 이름이 `VITE_`로 시작하는지 확인
- 재배포 필요 (환경 변수 변경 후 자동 재배포 또는 수동 재배포)

### CORS 오류 시

- 경기기후플랫폼 API 서버가 CORS를 허용해야 함
- 또는 Vercel의 Edge Functions를 사용하여 프록시 설정

## 7. 자동 배포 설정

GitHub/GitLab/Bitbucket과 연결하면:
- `main` 브랜치에 push 시 자동으로 프로덕션 배포
- 다른 브랜치에 push 시 Preview 배포

## 8. 커스텀 도메인 설정

1. Vercel 대시보드 → 프로젝트 → Settings → Domains
2. 원하는 도메인 추가
3. DNS 설정 안내에 따라 DNS 레코드 추가

