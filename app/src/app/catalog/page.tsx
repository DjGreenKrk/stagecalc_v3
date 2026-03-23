'use client';
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deviceCategories } from "@/lib/definitions";
import { useTranslation } from "@/context/language-context";
import { HardDrive } from "lucide-react";
import Link from "next/link";

export default function CatalogPage() {
    const { t } = useTranslation();
    return (
        <AppShell>
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold font-headline">Katalog Urządzeń</h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {deviceCategories.map(category => {
                    const categoryName = t(`categories.${category.slug}`, category.name);
                    return (
                        <Link key={category.name} href={`/catalog/${category.slug}`}>
                            <Card className="hover:border-primary/50 hover:shadow-lg transition-all">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <HardDrive className="w-6 h-6 text-primary" />
                                        {categoryName}
                                    </CardTitle>
                                    <CardDescription>Przeglądaj i zarządzaj urządzeniami z kategorii {categoryName.toLowerCase()}.</CardDescription>
                                </CardHeader>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </AppShell>
    );
}
