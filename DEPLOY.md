# 배포 가이드

## 버전 관리 및 마이그레이션
이 버전(v2)은 기존 버전과 동시에 실행될 수 있도록 설계되었습니다.
- 기본 포트: 3001 (기존 버전: 3000)
- 컨테이너 이름: youtube-subtitle-manager-v2

### 기존 버전에서 마이그레이션
1. 데이터 백업
```bash
# 기존 데이터 백업
cp -r ./data ./data_backup_v1
```

2. 새 버전 설치 및 실행 (기존 버전 유지하며)
```bash
git clone [your-repository-url]
cd youtube-subtitle-manager
docker-compose up -d --build
```

3. 동작 확인 후 기존 버전 제거
```bash
# 새 버전 정상 동작 확인 후
docker stop [기존-컨테이너-이름]
docker rm [기존-컨테이너-이름]
```

## 새로운 설치 (기존 설치 없는 경우)

### 사전 요구사항
- Docker
- Docker Compose

### 배포 단계

1. 프로젝트 디렉토리로 이동
```bash
cd youtube-subtitle-manager
```

2. Docker 이미지 빌드 및 실행
```bash
docker-compose up -d --build
```

3. 서비스 확인
```bash
docker-compose ps
```

4. 로그 확인
```bash
docker-compose logs -f
```

### 데이터 관리
- 모든 데이터는 `./data` 디렉토리에 저장됩니다
- 컨테이너가 재시작되어도 데이터는 유지됩니다

### 서비스 관리
```bash
# 서비스 중지
docker-compose down

# 서비스 재시작
docker-compose restart

# 로그 확인
docker-compose logs -f
```

### 문제 해결
1. 권한 문제 발생 시
```bash
sudo chown -R 1000:1000 ./data
```

2. 포트 충돌 시 (3001 포트가 사용 중인 경우)
- `docker-compose.yml`에서 포트 매핑 수정
```yaml
ports:
  - "3002:3000"  # 또는 다른 사용 가능한 포트
```

### 버전 확인
```bash
# 컨테이너 버전 확인
docker inspect youtube-subtitle-manager-v2 | grep VERSION
``` 