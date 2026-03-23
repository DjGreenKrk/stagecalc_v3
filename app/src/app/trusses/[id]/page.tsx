'use client';

import { AppShell } from '@/components/app-shell';
import { useUser, useDoc } from '@/firebase';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from '@/context/language-context';
import type { Calculation } from '@/lib/definitions';
import { TrussCalculator } from '@/components/truss/truss-calculator';

export default function TrussCalculationPage() {
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();

  const id = params.id as string;

  const { data: calculationData, isLoading: isCalculationLoading } = useDoc<Calculation>('calculations', id);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isCalculationLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">{t('common.loading')}</div>
      </AppShell>
    );
  }

  if (!calculationData && !isCalculationLoading) {
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
      <TrussCalculator calculation={calculationData!} />
    </AppShell>
  );
}
