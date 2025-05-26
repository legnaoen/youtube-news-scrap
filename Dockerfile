# 빌드 스테이지
FROM node:18-alpine AS builder

# 필요한 시스템 패키지 설치
RUN apk add --no-cache python3 ffmpeg wget

# yt-dlp 설치
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 설치를 위한 파일만 먼저 복사 (캐시 활용)
COPY package*.json ./
RUN npm ci

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 실행 스테이지
FROM node:18-alpine AS runner

# 필요한 시스템 패키지만 설치
RUN apk add --no-cache python3 ffmpeg wget

# yt-dlp 설치
RUN wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# 프로덕션 의존성만 설치
COPY package*.json ./
RUN npm ci --only=production

# 빌드 결과물 복사
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

# 데이터 디렉토리 생성
RUN mkdir -p /app/data && chown -R node:node /app/data

# 비root 유저로 실행
USER node

# 환경변수 설정
ENV NODE_ENV=production
ENV PORT=3000

# 포트 설정
EXPOSE 3000

# 실행 명령
CMD ["npm", "start"] 