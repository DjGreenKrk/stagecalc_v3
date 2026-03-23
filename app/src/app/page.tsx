
'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/context/language-context';

export default function HomePage() {
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.push('/calculators');
      } else {
        router.push('/login');
      }
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>{t('common.loading')}...</p>
    </div>
  );
}
