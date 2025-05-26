'use client';

import React, { useState } from 'react';
import UrlInput from './UrlInput';
import HistoryList from './HistoryList';
import MarkdownViewer from './MarkdownViewer';

export default function SubtitleManager() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubtitleExtracted = (filename: string) => {
    setSelectedFile(filename);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <UrlInput onSubtitleExtracted={handleSubtitleExtracted} />
        <HistoryList 
          selectedFile={selectedFile}
          onSelectFile={setSelectedFile}
          refreshKey={refreshKey}
        />
      </div>
      <div className="w-full md:w-2/3">
        <MarkdownViewer selectedFile={selectedFile} />
      </div>
    </div>
  );
} 