import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// 로깅 유틸리티 함수
function log(message: string, data?: unknown) {
  console.log(`[Content API] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// HTML 정리 및 불필요한 요소 제거
function cleanHtml($: ReturnType<typeof cheerio.load>) {
  log('Cleaning HTML content...');
  // 불필요한 요소 제거
  $('script, style, iframe, nav, footer, header, aside').remove();
  // 광고 관련 요소 제거
  $('[class*="ad"], [class*="advertisement"], [id*="ad-"], [id*="advertisement"]').remove();
  // 소셜 미디어 관련 요소 제거
  $('[class*="social"], [id*="social"]').remove();
  log('HTML cleaning completed');
}

// 메인 콘텐츠 영역 찾기
function findMainContent($: ReturnType<typeof cheerio.load>) {
  log('Finding main content area...');
  // 일반적인 메인 콘텐츠 선택자들
  const contentSelectors = [
    'article',
    '[role="main"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.content-area',
    'main',
    '#main-content'
  ];

  for (const selector of contentSelectors) {
    const content = $(selector);
    if (content.length > 0) {
      log(`Found main content using selector: ${selector}`);
      return content;
    }
  }

  log('Main content not found, falling back to body');
  return $('body');
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
      const fileContent = await readFile(filePath, 'utf-8');
      log('File read successfully');
      
      // 파일 내용이 메타데이터 형식인지 확인
      if (fileContent.startsWith('---\n')) {
        // 메타데이터 형식 파싱
        const [, metadataStr, ...contentParts] = fileContent.split('---\n');
        try {
          const metadata = JSON.parse(metadataStr);
          const content = contentParts.join('---\n').trim();
          return NextResponse.json({
            content,
            ...metadata
          });
        } catch {
          log('Error parsing metadata, falling back to legacy format');
        }
      }
      
      // 레거시 형식 처리 (이전 YouTube 자막 파일)
      const title = filename.replace(/\..*$/, '').replace(/-/g, ' ');
      return NextResponse.json({
        content: fileContent,
        title,
        type: filename.includes('youtube') ? 'youtube' : 'webpage',
        timestamp: 0
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

export async function POST(request: Request) {
  try {
    log('Handling POST request');
    const { url } = await request.json();

    if (!url) {
      log('Error: URL not provided');
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    log(`Processing URL: ${url}`);
    // URL에서 도메인과 경로 추출
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    // URL 경로에서 마지막 부분을 가져와서 정리
    const pathSegment = urlObj.pathname.split('/').filter(Boolean).pop() || 'index';
    const cleanPathSegment = pathSegment.replace(/[^a-z0-9]/gi, '').slice(0, 30);
    
    // 웹페이지 가져오기
    log('Fetching webpage...');
    const response = await fetch(url);
    const html = await response.text();
    log('Webpage fetched successfully');
    
    // Cheerio로 HTML 파싱
    log('Parsing HTML with Cheerio');
    const $ = cheerio.load(html);
    
    // HTML 정리
    cleanHtml($);
    
    // 메인 콘텐츠 찾기
    const mainContent = findMainContent($);
    
    // 제목 찾기
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';
    log(`Found title: ${title}`);
    
    // Markdown으로 변환
    log('Converting to Markdown');
    const markdown = turndownService.turndown(mainContent.html() || '');
    log('Conversion completed');
    
    // 저장할 파일명 생성 (timestamp_domain_pathsegment.md)
    const timestamp = Date.now();
    const filename = `${timestamp}_${domain.replace(/[^a-z0-9]/g, '')}_${cleanPathSegment}.md`;
    const filePath = path.join(process.cwd(), 'data', filename);
    
    log(`Saving to file: ${filename}`);
    // data 디렉토리가 없으면 생성
    await mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    
    // 메타데이터와 함께 콘텐츠 저장
    const metadata = {
      title,
      url,
      timestamp,
      type: 'webpage',
      domain
    };

    const content = `---\n${JSON.stringify(metadata, null, 2)}\n---\n\n${markdown}`;
    await writeFile(filePath, content);
    log('File saved successfully');
    
    return NextResponse.json({ 
      success: true,
      filename,
      title
    });
    
  } catch (error) {
    log(`Error in POST: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json(
      { error: 'Failed to extract content' },
      { status: 500 }
    );
  }
} 