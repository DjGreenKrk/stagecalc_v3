
// This file is obsolete and will be removed.
// The new entry point is /app/calculators/[id]/page.tsx.
// We are leaving this as a redirect for any old bookmarks.
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OldQuickCalculatorPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/calculators/new');
  }, [router]);
  return null;
}
