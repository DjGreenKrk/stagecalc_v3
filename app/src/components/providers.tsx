'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from './theme-provider';
import { LanguageProvider } from '@/context/language-context';

import { PocketBaseProvider } from '@/context/pb-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <PocketBaseProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </PocketBaseProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}