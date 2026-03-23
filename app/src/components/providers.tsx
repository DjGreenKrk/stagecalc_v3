
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider } from '@/firebase';
import { LanguageProvider } from '@/context/language-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider>
      <LanguageProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </LanguageProvider>
    </FirebaseProvider>
  );
}
