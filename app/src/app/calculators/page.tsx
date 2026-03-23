'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, Calculator } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useCollection, useUser } from '@/firebase';
import type { Calculation } from '@/lib/definitions';
import { useTranslation } from '@/context/language-context';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function CalculatorsPage() {
  const { t, getLocale, language } = useTranslation();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const [selectedCalculation, setSelectedCalculation] = useState<Calculation | undefined>(undefined);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const { data: calculations, isLoading: areCalculationsLoading } = useCollection<Calculation>(
    user ? 'calculations' : null,
    useMemo(() => ({
      filter: `ownerUserId = "${user?.id}"`,
      sort: 'name'
    }), [user?.id])
  );

  const filteredCalculations = useMemo(() => {
    if (!calculations) return [];
    let sortedCalculations = [...calculations].sort((a, b) => a.name.localeCompare(b.name));
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      return sortedCalculations.filter(calc =>
        calc.name.toLowerCase().includes(lowerCaseQuery)
      );
    }
    return sortedCalculations;
  }, [calculations, searchQuery]);

  const handleEditCalculation = (id: string) => {
    router.push(`/calculators/${id}`);
  };

  const handleDeleteRequest = (calculation: Calculation) => {
    setSelectedCalculation(calculation);
    setTimeout(() => {
      setIsDeleteConfirmOpen(true);
    }, 0);
  };

  const confirmDelete = () => {
    if (selectedCalculation) {
      deleteDocumentNonBlocking('calculations', selectedCalculation.id);
    }
    setIsDeleteConfirmOpen(false);
    setSelectedCalculation(undefined);
  };


  if (isUserLoading || areCalculationsLoading || !user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p>{t('common.loading')}</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-headline">Zapisane Kalkulacje</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj kalkulacji..."
              className="pl-8 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => router.push('/calculators/new')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nowa kalkulacja
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead className="text-right">Ostatnia modyfikacja</TableHead>
                <TableHead><span className="sr-only">{t('common.actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCalculations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-60">
                    <Calculator className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Brak zapisanych kalkulacji</p>
                    <p className="text-muted-foreground">Utwórz swoją pierwszą kalkulację, aby zacząć planowanie.</p>
                    <Button onClick={() => router.push('/calculators/new')} className="mt-4">
                      <PlusCircle className="mr-2 h-4 w-4" /> Nowa kalkulacja
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCalculations.map(calc => (
                  <TableRow key={calc.id}>
                    <TableCell className="font-medium">
                      <Link href={`/calculators/${calc.id}`} className="text-primary hover:underline">
                        {calc.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {new Date(calc.lastModified).toLocaleDateString(language, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditCalculation(calc.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Otwórz / Edytuj</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteRequest(calc)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>{t('common.delete')}</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.are_you_sure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.are_you_sure')} Tej akcji nie można cofnąć. Spowoduje to trwałe usunięcie kalkulacji "{selectedCalculation?.name || ''}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
