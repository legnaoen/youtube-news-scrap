# YouTube Subtitle & Web Content Manager

YouTube 자막과 웹 콘텐츠를 효율적으로 관리하고 편집할 수 있는 웹 애플리케이션입니다.

자세한 프로젝트 문서는 [SSOT.md](./SSOT.md)를 참고해주세요.

## 빠른 시작

### 필수 요구사항
- Node.js 18.0.0 이상
- yt-dlp

### 설치 및 실행
```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

개발 서버가 시작되면 [http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 주요 기능

- YouTube 자막 자동 추출 및 관리
- 웹 페이지 콘텐츠 추출 및 마크다운 변환
- 날짜별 히스토리 관리 (오늘/어제/지난 7일/이전)
- 자동 정리 기능 (최대 50개 항목 유지)
- 콘텐츠 복사 및 공유

## 기술 스택

- **프레임워크**: Next.js 15.1.8
- **언어**: TypeScript
- **스타일링**: TailwindCSS
- **주요 라이브러리**:
  - yt-dlp: YouTube 자막 추출
  - cheerio: 웹 스크래핑
  - turndown: HTML to Markdown 변환

## 환경 설정

1. Node.js 18.0.0 이상 설치
2. yt-dlp 설치 (YouTube 자막 추출용)
3. `.env` 파일 설정 (필요한 경우)

## 사용 방법

## Deploy on Vercel

## 라이선스

MIT License
