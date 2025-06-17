
"use client";

// This page is no longer used as category addition is integrated into the home page (CategorySelector.tsx).
// Keeping the file temporarily to avoid build issues if referenced elsewhere, but it should be deleted.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DeprecatedAddCategoriesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/'); // Redirect to home
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-muted-foreground">Redirecting to home...</p>
    </div>
  );
}
