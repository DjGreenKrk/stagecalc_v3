'use client';

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/context/language-context";
import { useUser } from "@/lib/pb-hooks";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
    const { t, setLanguage, language } = useTranslation();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { setTheme, theme } = useTheme();

    useEffect(() => {
        if (!isUserLoading && !user) {
        router.push('/login');
        }
    }, [user, isUserLoading, router]);

    if (isUserLoading || !user) {
        return (
            <AppShell>
                <div className="flex items-center justify-center">{t('common.loading')}</div>
            </AppShell>
        );
    }
  return (
    <AppShell>
       <div className="max-w-2xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>{t('settings.title')}</CardTitle>
                <CardDescription>{t('settings.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">{t('settings.appearance.title')}</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <Label htmlFor="theme-mode">{t('settings.appearance.theme')}</Label>
                            <p className="text-sm text-muted-foreground">{t('settings.appearance.theme_description')}</p>
                        </div>
                         <Select onValueChange={(value) => setTheme(value)} value={theme}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('settings.appearance.select_theme_placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">{t('settings.appearance.light')}</SelectItem>
                                <SelectItem value="dark">{t('settings.appearance.dark')}</SelectItem>
                                <SelectItem value="system">{t('settings.appearance.system')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium">{t('settings.language.title')}</h3>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                            <Label htmlFor="language">{t('settings.language.language')}</Label>
                             <p className="text-sm text-muted-foreground">{t('settings.language.language_description')}</p>
                        </div>
                        <Select value={language} onValueChange={(value) => setLanguage(value as 'pl' | 'en')}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={t('settings.language.select_language_placeholder')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pl">Polski</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>
       </div>
    </AppShell>
  );
}
