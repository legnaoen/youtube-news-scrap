import SubtitleManager from '@/components/SubtitleManager';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">유튜브 자막 관리</h1>
      <SubtitleManager />
    </div>
  );
}
