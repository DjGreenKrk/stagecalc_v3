
'use client';

import { AppShell } from '@/components/app-shell';
import { QuickCalculator } from '@/components/calculator/quick-calculator';
import { useUser, useDoc } from '@/lib/pb-hooks';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/context/language-context';
import type { Calculation } from '@/lib/definitions';

export default function CalculatorPage() {
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;
  const isNew = id === 'new' || id === 'new-calculator'; // handle both

  const { data: initialData, isLoading: isCalculationLoading } = useDoc<Calculation>(
    !isNew && user ? 'calculations' : null,
    id
  );

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);


  if (isUserLoading || (!isNew && isCalculationLoading)) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">{t('common.loading')}</div>
      </AppShell>
    );
  }

  if (!isNew && !initialData && !isCalculationLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p>Nie znaleziono kalkulacji lub nie masz do niej dostępu.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <QuickCalculator initialData={(isNew ? undefined : initialData) as any || undefined} />
    </AppShell>
  );
}
