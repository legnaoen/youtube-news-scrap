'use client';

import React, { useState } from 'react';

interface UrlInputProps {
  onSubtitleExtracted: (filename: string) => void;
}

export default function UrlInput({ onSubtitleExtracted }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isYoutubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
    return youtubeRegex.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!url) {
      setError('URL을 입력해주세요.');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('올바른 URL 형식이 아닙니다.');
      return;
    }

    setIsLoading(true);
    try {
      // URL 타입에 따라 자동으로 엔드포인트 선택
      const endpoint = isYoutubeUrl(url) ? '/api/subtitles' : '/api/content';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '콘텐츠를 가져오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.filename) {
        onSubtitleExtracted(data.filename);
      }

      setUrl('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">콘텐츠 추출</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            URL 입력
          </label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... 또는 https://example.com/article"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full px-4 py-2 text-white font-medium rounded-md transition-colors
            ${isLoading 
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
            }`}
        >
          {isLoading ? '처리중...' : '콘텐츠 가져오기'}
        </button>
      </form>
    </div>
  );
} 