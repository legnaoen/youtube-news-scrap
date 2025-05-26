'use client';

import React, { useEffect, useState } from 'react';
import { remark } from 'remark';
import html from 'remark-html';

interface MarkdownViewerProps {
  selectedFile: string | null;
}

interface ContentResponse {
  content: string;
  title?: string;
  url?: string;
  type?: 'youtube' | 'webpage';
}

export default function MarkdownViewer({ selectedFile }: MarkdownViewerProps) {
  const [content, setContent] = useState<string>('');
  const [metadata, setMetadata] = useState<{title?: string; url?: string; type?: 'youtube' | 'webpage'}>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    if (!selectedFile) {
      setContent('');
      setMetadata({});
      return;
    }

    fetchContent();
  }, [selectedFile]);

  const fetchContent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/content?filename=${selectedFile}`);
      if (!response.ok) {
        throw new Error('컨텐츠를 불러오는데 실패했습니다.');
      }
      
      const data: ContentResponse = await response.json();
      const processedContent = await remark()
        .use(html)
        .process(data.content);
      
      setContent(processedContent.toString());
      setMetadata({
        title: data.title,
        url: data.url,
        type: data.type
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      setContent('');
      setMetadata({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      // HTML 태그를 제거하고 순수 텍스트만 추출
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';

      // 폴백 메커니즘 구현
      if (navigator.clipboard && window.isSecureContext) {
        // 최신 클립보드 API 사용
        await navigator.clipboard.writeText(textContent);
      } else {
        // 레거시 방식으로 폴백
        const textArea = document.createElement('textarea');
        textArea.value = textContent;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          textArea.remove();
        } catch (err) {
          console.error('복사 실패:', err);
          textArea.remove();
          throw new Error('복사에 실패했습니다.');
        }
      }

      setCopyStatus('copied');
      
      // 2초 후 상태 초기화
      setTimeout(() => {
        setCopyStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('복사 중 오류 발생:', err);
      alert('복사에 실패했습니다. 텍스트를 직접 선택하여 복사해주세요.');
      setCopyStatus('idle');
    }
  };

  if (!selectedFile) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 h-full">
        <div className="flex items-center justify-center h-64 text-gray-500">
          왼쪽 목록에서 파일을 선택해주세요.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 h-full">
        <div className="flex items-center justify-center h-64 text-gray-500">
          로딩중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-red-600 text-sm p-4 bg-red-50 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <div className="relative">
        {metadata.title && (
          <div className="mb-4">
            <h1 className="text-2xl font-bold">{metadata.title}</h1>
            {metadata.url && (
              <a 
                href={metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm mt-1 block"
              >
                원본 {metadata.type === 'youtube' ? '동영상' : '페이지'} 보기
              </a>
            )}
          </div>
        )}
        {content && (
          <button
            onClick={handleCopy}
            className={`absolute top-0 right-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              copyStatus === 'copied'
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {copyStatus === 'copied' ? '복사됨' : '복사하기'}
          </button>
        )}
        <div 
          className="prose max-w-none mt-10"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
} 