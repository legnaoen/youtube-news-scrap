import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 로깅 유틸리티 함수
function log(message: string, data?: unknown) {
  console.log(`[Subtitles API] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

export async function POST(request: Request) {
  try {
    log('Handling POST request');
    const { url } = await request.json();
    
    if (!url) {
      log('Error: URL not provided');
      return NextResponse.json(
        { error: '유튜브 URL이 필요합니다.' },
        { status: 400 }
      );
    }

    // 비디오 ID 추출
    const videoId = url.match(/(?:v=|\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!videoId) {
      log('Error: Invalid YouTube URL');
      return NextResponse.json(
        { error: '올바른 유튜브 URL이 아닙니다.' },
        { status: 400 }
      );
    }

    log(`Processing video ID: ${videoId}`);

    // data 디렉토리 생성
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    try {
      // 영상 제목 가져오기
      log('Fetching video title');
      const titleCommand = `yt-dlp --get-title "${url}"`;
      const videoTitle = execSync(titleCommand, { encoding: 'utf-8' }).trim();

      log(`Video title: ${videoTitle}`);

      // 간단한 파일명 생성 (timestamp_videoId.md)
      const timestamp = Date.now();
      const filename = `${timestamp}_${videoId}.md`;
      const subtitleFile = path.join(dataDir, filename);

      log('Downloading subtitles');
      // youtube-dl 명령어 실행
      const command = `yt-dlp --write-sub --write-auto-sub --sub-lang ko --skip-download --sub-format vtt "${url}"`;
      execSync(command, { cwd: dataDir });

      // .vtt 파일을 찾아서 .md 파일로 변환
      const vttFile = fs.readdirSync(dataDir)
        .find(file => file.includes(videoId) && file.endsWith('.vtt'));

      if (!vttFile) {
        throw new Error('자막 파일을 찾을 수 없습니다.');
      }

      log('Converting VTT to text');
      // .vtt 파일 읽기
      const vttContent = fs.readFileSync(path.join(dataDir, vttFile), 'utf-8');
      
      // .vtt를 텍스트로 변환
      const lines = vttContent.split('\n');
      const subtitles: string[] = []; // 자막을 배열로 저장
      let currentSubtitle = '';
      let previousText = '';

      // 자막 추출 및 정리
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // 메타데이터 및 타임스탬프 라인 건너뛰기
        if (line === 'WEBVTT' || 
            line === '' || 
            line.includes('-->') || 
            line.match(/^\d+$/) ||
            line.startsWith('Kind:') ||
            line.startsWith('Language:')) {
          if (currentSubtitle) {
            // 타임스탬프 제거
            const cleanSubtitle = currentSubtitle
              .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '') // <00:00:00.000> 형식 제거
              .replace(/\s+/g, ' ') // 연속된 공백을 하나로
              .trim();
            
            if (cleanSubtitle && cleanSubtitle !== previousText) {
              // 이전 자막과 현재 자막이 연속되는 경우를 처리
              if (previousText && (
                  cleanSubtitle.startsWith(previousText) || 
                  previousText.startsWith(cleanSubtitle)
              )) {
                // 더 긴 버전을 유지
                subtitles[subtitles.length - 1] = cleanSubtitle.length > previousText.length 
                  ? cleanSubtitle 
                  : previousText;
              } else {
                subtitles.push(cleanSubtitle);
                previousText = cleanSubtitle;
              }
            }
            currentSubtitle = '';
          }
          continue;
        }

        // 자막 텍스트 누적
        currentSubtitle += (currentSubtitle ? ' ' : '') + line;
      }

      // 마지막 자막 처리
      if (currentSubtitle) {
        const cleanSubtitle = currentSubtitle
          .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanSubtitle && cleanSubtitle !== previousText) {
          if (previousText && (
              cleanSubtitle.startsWith(previousText) || 
              previousText.startsWith(cleanSubtitle)
          )) {
            subtitles[subtitles.length - 1] = cleanSubtitle.length > previousText.length 
              ? cleanSubtitle 
              : previousText;
          } else {
            subtitles.push(cleanSubtitle);
          }
        }
      }

      // 최종 텍스트 생성
      const textContent = subtitles
        .filter((subtitle, index, array) => 
          // 완전히 동일한 연속된 자막 제거
          subtitle !== array[index - 1])
        .join('\n\n');

      log('Creating metadata');
      // 메타데이터 생성
      const metadata = {
        title: videoTitle,
        url,
        videoId,
        timestamp,
        type: 'youtube'
      };

      // 메타데이터와 함께 저장
      const content = `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${textContent}`;
      fs.writeFileSync(subtitleFile, content);
      log('File saved successfully');

      // 임시 .vtt 파일 삭제
      fs.unlinkSync(path.join(dataDir, vttFile));
      log('Temporary VTT file removed');

      return NextResponse.json({ 
        success: true,
        filename,
        title: metadata.title
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '자막 추출에 실패했습니다.';
      log(`Error processing subtitles: ${errorMessage}`);
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '서버 오류가 발생했습니다.';
    log(`Unexpected error: ${errorMessage}`);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    log('Handling GET request');
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      log('Error: Filename not provided');
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    log(`Reading file: ${filename}`);
    const filePath = path.join(process.cwd(), 'data', filename);
    
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf-8');
      log('File read successfully');
      
      // Parse metadata and content
      const [, metadataStr, ...contentParts] = fileContent.split('---\n');
      const metadata = JSON.parse(metadataStr);
      const content = contentParts.join('---\n').trim();
      
      return NextResponse.json({
        content,
        ...metadata
      });
    } catch (error) {
      log(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return NextResponse.json(
        { error: 'File not found or cannot be read' },
        { status: 404 }
      );
    }
  } catch (error) {
    log(`Unexpected error in GET: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 