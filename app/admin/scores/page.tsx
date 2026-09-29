'use client';

// app/admin/scores/page.tsx — Admin Score Review & Publishing Management Page
import ScoreReviewManager from '@/components/admin/ScoreReviewManager';

export default function AdminScoresPage() {
  return (
    <div className="p-space-lg w-full">
      <ScoreReviewManager />
    </div>
  );
}
