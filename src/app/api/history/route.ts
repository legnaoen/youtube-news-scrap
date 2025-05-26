import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MAX_HISTORY_ITEMS = 50;

// 오래된 파일 정리 함수
async function cleanupOldFiles(dataDir: string, currentFiles: string[]) {
  if (currentFiles.length > MAX_HISTORY_ITEMS) {
    // 파일들을 수정 시간 기준으로 정렬
    const sortedFiles = currentFiles.sort((a, b) => {
      const statA = fs.statSync(path.join(dataDir, a));
      const statB = fs.statSync(path.join(dataDir, b));
      return statB.mtime.getTime() - statA.mtime.getTime();
    });

    // 50개를 초과하는 가장 오래된 파일들을 삭제
    const filesToDelete = sortedFiles.slice(MAX_HISTORY_ITEMS);
    filesToDelete.forEach(file => {
      try {
        fs.unlinkSync(path.join(dataDir, file));
        console.log(`Deleted old history file: ${file}`);
      } catch (error) {
        console.error(`Failed to delete file ${file}:`, error);
      }
    });
  }
}

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    // data 디렉토리가 없으면 생성
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
      return NextResponse.json({ files: [] });
    }

    // .md 파일만 필터링
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.md'));

    // 오래된 파일 정리
    await cleanupOldFiles(dataDir, files);

    // 정리된 후의 파일 목록을 다시 가져와서 정렬
    const updatedFiles = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.md'))
      .sort((a, b) => {
        const statA = fs.statSync(path.join(dataDir, a));
        const statB = fs.statSync(path.join(dataDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    return NextResponse.json({ files: updatedFiles });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '히스토리를 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: '파일 이름이 필요합니다.' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'data', filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: '파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: '파일 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
} 