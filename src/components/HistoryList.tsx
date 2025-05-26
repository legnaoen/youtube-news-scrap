'use client';

import React, { useEffect, useState } from 'react';
import { TrashIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface HistoryListProps {
  selectedFile: string | null;
  onSelectFile: (filename: string) => void;
  refreshKey: number;
}

interface FileMetadata {
  filename: string;
  title: string;
  timestamp: number;
}

interface GroupedFiles {
  [key: string]: FileMetadata[];
}

export default function HistoryList({ selectedFile, onSelectFile, refreshKey }: HistoryListProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('히스토리를 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      
      // 각 파일의 메타데이터를 가져옵니다
      const filesWithMetadata = await Promise.all(
        data.files.map(async (filename: string) => {
          try {
            // 파일명 전체를 URL 인코딩
            const encodedFilename = encodeURIComponent(filename);
            const response = await fetch(`/api/content?filename=${encodedFilename}`);
            if (!response.ok) {
              throw new Error('메타데이터를 불러오는데 실패했습니다.');
            }
            const metadata = await response.json();
            return {
              filename,
              title: metadata.title || getDisplayTitle(filename),
              timestamp: metadata.timestamp || 0
            };
          } catch (error) {
            console.error('메타데이터 로딩 오류:', error);
            return {
              filename,
              title: getDisplayTitle(filename),
              timestamp: 0
            };
          }
        })
      );

      // 시간순으로 정렬
      filesWithMetadata.sort((a, b) => b.timestamp - a.timestamp);
      setFiles(filesWithMetadata);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  const handleDelete = async (filename: string) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/history?filename=${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.');
      }
      
      await fetchHistory();
      if (selectedFile === filename) {
        onSelectFile('');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCopy = async (filename: string) => {
    try {
      // 파일 내용 가져오기
      const encodedFilename = encodeURIComponent(filename);
      const response = await fetch(`/api/content?filename=${encodedFilename}`);
      if (!response.ok) {
        throw new Error('파일 내용을 불러오는데 실패했습니다.');
      }
      const data = await response.json();
      
      // 콘텐츠 정리
      let cleanContent = data.content;
      if (data.type === 'youtube') {
        // YouTube 자막에서 불필요한 태그 제거
        cleanContent = cleanContent
          .replace(/<\/?c>/g, '') // <c>, </c> 태그 제거
          .replace(/\s+/g, ' ') // 연속된 공백을 하나로
          .trim();
      }

      // 제목과 내용을 합치기
      const fullContent = `${data.title}\n\n${cleanContent}`;
      
      // 임시 textarea 엘리먼트 생성
      const textarea = document.createElement('textarea');
      textarea.value = fullContent;
      
      // 화면에서 안 보이게 스타일링
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      
      // DOM에 추가
      document.body.appendChild(textarea);
      
      // 텍스트 선택 및 복사
      textarea.select();
      document.execCommand('copy');
      
      // 임시 엘리먼트 제거
      document.body.removeChild(textarea);

      // 복사 완료 알림
      const originalTitle = document.title;
      document.title = "복사 완료!";
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    } catch (err) {
      console.error('복사 중 오류 발생:', err);
      alert('텍스트 복사에 실패했습니다.');
    }
  };

  const getDisplayTitle = (filename: string) => {
    // 파일 확장자 제거
    const withoutExtension = filename.replace(/\.md$/, '');
    
    // YouTube 동영상 ID 제거 (마지막 _와 그 뒤의 11자리 문자)
    const withoutId = withoutExtension.replace(/_[a-zA-Z0-9_-]{11}$/, '');
    
    // 언더스코어를 공백으로 변환
    return withoutId.replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">히스토리</h2>
        <div className="flex items-center justify-center h-32 text-gray-500">
          로딩중...
        </div>
      </div>
    );
  }

  const groupedFiles = groupFilesByDate(files);
  const dateGroups = ['오늘', '어제', '지난 7일', '이전'];

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">히스토리</h2>
      {error ? (
        <div className="text-red-600 text-sm p-4 bg-red-50 rounded-md">
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          처리된 자막이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {dateGroups.map(group => (
            groupedFiles[group]?.length > 0 && (
              <div key={group}>
                <h3 className="text-sm font-medium text-gray-500 py-2 bg-gray-50 px-2 rounded">
                  {group}
                </h3>
                <ul className="divide-y divide-gray-200">
                  {groupedFiles[group].map((file) => (
                    <li
                      key={file.filename}
                      className={`flex items-center justify-between py-3 px-2 hover:bg-gray-50 cursor-pointer ${
                        selectedFile === file.filename ? 'bg-blue-50' : ''
                      }`}
                    >
                      <button
                        className="flex-1 text-left truncate mr-2"
                        onClick={() => onSelectFile(file.filename)}
                      >
                        {file.title}
                      </button>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(file.filename);
                          }}
                          className="p-1 hover:bg-gray-200 rounded-full"
                          title="전체 내용 복사"
                        >
                          <ClipboardDocumentIcon className="w-5 h-5 text-gray-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(file.filename);
                          }}
                          className="p-1 hover:bg-gray-200 rounded-full"
                          title="삭제"
                        >
                          <TrashIcon className="w-5 h-5 text-gray-500" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// 파일들을 날짜별로 그룹화하는 함수
const groupFilesByDate = (files: FileMetadata[]): GroupedFiles => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000; // 24시간을 밀리초로
  const lastWeek = today - 86400000 * 7;

  return files.reduce((groups: GroupedFiles, file) => {
    const fileDate = new Date(file.timestamp);
    const fileTime = new Date(
      fileDate.getFullYear(),
      fileDate.getMonth(),
      fileDate.getDate()
    ).getTime();

    let group = '이전';
    if (fileTime >= today) {
      group = '오늘';
    } else if (fileTime >= yesterday) {
      group = '어제';
    } else if (fileTime >= lastWeek) {
      group = '지난 7일';
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(file);
    return groups;
  }, {});
}; 