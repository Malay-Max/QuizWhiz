
"use client";
// This file is deprecated and will be removed.
// Navigation will now use /quiz/manage/[categoryId]
// Keeping it temporarily to avoid breaking existing file structure during XML application if necessary,
// but it should be considered deleted.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeprecatedManageCategoryPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/'); // Redirect to home as this page is no longer used
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Redirecting...</p>
    </div>
  );
}
