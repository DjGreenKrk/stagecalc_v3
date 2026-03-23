## Informacje debugowania dla problemu "zamrażania" aplikacji

Poniżej znajdują się informacje i fragmenty kodu, o które prosiłeś, aby zdiagnozować problem z wydajnością aplikacji po operacjach zapisu do bazy danych Firebase.

### 1. Architektura aplikacji (Next.js)

Aplikacja jest zbudowana w oparciu o **Next.js w wersji 15**, z wykorzystaniem **App Router** (`/src/app` directory). Wszystkie komponenty, które wchodzą w interakcję z Firebase, są komponentami klienckimi (`'use client'`).

---

### 2. Komponent strony, na której występuje problem (Pełny kod)

Głównym miejscem, gdzie widać problem, jest strona wyświetlająca listę urządzeń dla danej kategorii. Poniżej znajduje się pełny kod tego komponentu, zawierający logikę filtrowania, paginacji i renderowania.

**Plik:** `src/app/catalog/[category]/page.tsx`

```tsx
'use client';

import { useState, useEffect, useMemo, FC } from 'react';
import { Edit, MoreHorizontal, PlusCircle, Trash2, Star, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
import type { Device, UserFavoriteDevices, DeviceCategoryName } from '@/lib/definitions';
import { deviceCategories } from '@/lib/definitions';
import { DeviceDetailsDialog } from '@/components/device/device-details-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking,
  setDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/context/language-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { LightingDeviceForm } from '@/components/device/lighting-device-form';
import { SoundDeviceForm } from '@/components/device/sound-device-form';
import { BaseDeviceForm } from '@/components/device/base-device-form';
import { Badge } from '@/components/ui/badge';


const ITEMS_PER_PAGE = 25;

const categoryFormMap: Record<string, FC<any>> = {
  'lighting': LightingDeviceForm,
  'sound': SoundDeviceForm,
  'multimedia': BaseDeviceForm,
  'power': BaseDeviceForm,
  'rigging': BaseDeviceForm,
  'other': BaseDeviceForm,
};

export default function CategoryPage() {
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const categorySlug = params.category as string;

  const categoryInfo = useMemo(() => deviceCategories.find(c => c.slug === categorySlug), [categorySlug]);

  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(undefined);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ### ODCZYT DANYCH Z FIREBASE (REAL-TIME) ###
  const devicesQuery = useMemoFirebase(() => {
    if (!user || !categoryInfo) return null;
    return collection(firestore, categoryInfo.collectionName);
  }, [firestore, user, categoryInfo]);
  
  const userFavoritesDocRef = useMemoFirebase(() => user ? doc(firestore, 'userFavorites', user.uid) : null, [firestore, user]);
  const { data: userFavoritesData } = useDoc<UserFavoriteDevices>(userFavoritesDocRef);

  const { data: allDevices, isLoading } = useCollection<Device>(devicesQuery);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    if (!categoryInfo) {
      // Maybe redirect to /catalog or a 404 page
      router.push('/catalog');
    }
  }, [user, isUserLoading, router, categoryInfo]);

  // ### FILTROWANIE, SORTOWANIE I PAGINACJA ###
  const favoriteDeviceIds = useMemo(() => new Set(userFavoritesData?.deviceIds || []), [userFavoritesData]);

  const filteredDevices = useMemo(() => {
    if (!allDevices) return [];
    
    const isFavorite = (deviceId: string) => favoriteDeviceIds.has(deviceId);

    return allDevices
      .filter(device => {
        if (showFavoritesOnly && !isFavorite(device.id)) return false;

        if (activeSubcategory && device.subcategory !== activeSubcategory) return false;
        
        if (searchQuery) {
          const lowerCaseQuery = searchQuery.toLowerCase();
          return (
            device.name.toLowerCase().includes(lowerCaseQuery) ||
            device.manufacturer.toLowerCase().includes(lowerCaseQuery) ||
            (device.model && device.model.toLowerCase().includes(lowerCaseQuery))
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aIsFav = isFavorite(a.id);
        const bIsFav = isFavorite(b.id);
        if (aIsFav && !bIsFav) return -1;
        if (!aIsFav && bIsFav) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [allDevices, searchQuery, showFavoritesOnly, activeSubcategory, favoriteDeviceIds]);

  const totalPages = Math.ceil(filteredDevices.length / ITEMS_PER_PAGE);

  const paginatedDevices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDevices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredDevices, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    setActiveSubcategory(null);
  }, [categorySlug]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, showFavoritesOnly, activeSubcategory]);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };


  const handleAdd = () => {
    setSelectedDevice(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (device: Device) => {
    setSelectedDevice(device);
    setIsFormOpen(true);
  };

  const handleDelete = (device: Device) => {
    setSelectedDevice(device);
    setIsDeleteConfirmOpen(true);
  };
  
  // ### ZAPIS DANYCH DO FIREBASE (USUWANIE) ###
  const confirmDelete = () => {
    if (selectedDevice?.id) {
      const deviceRef = doc(firestore, categoryInfo!.collectionName, selectedDevice.id);
      deleteDocumentNonBlocking(deviceRef);
    }
    setIsDeleteConfirmOpen(false);
    setSelectedDevice(undefined);
  };

  // ### ZAPIS DANYCH DO FIREBASE (DODAWANIE/EDYCJA) ###
  const handleSave = (device: Omit<Device, 'id'> & { id?: string }) => {
    const { id, ...deviceData } = device;
    if (id) {
      const deviceRef = doc(firestore, categoryInfo!.collectionName, id);
      updateDocumentNonBlocking(deviceRef, deviceData);
    } else {
      addDocumentNonBlocking(collection(firestore, categoryInfo!.collectionName), deviceData);
    }
    setIsFormOpen(false);
  };
  
  const DeviceForm = categoryFormMap[categorySlug] || BaseDeviceForm;
  
  // ### JSX RENDROWANIA TABELI ###
  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-headline">{categoryInfo?.name}</h1>
        {/* ... (kontener z wyszukiwarką i przyciskami) ... */}
      </div>

       {categoryInfo?.subcategories && categoryInfo.subcategories.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Badge 
            variant={!activeSubcategory ? 'default' : 'secondary'} 
            className="cursor-pointer"
            onClick={() => setActiveSubcategory(null)}
          >
            Wszystkie
          </Badge>
          {categoryInfo.subcategories.map(sub => (
            <Badge 
              key={sub.key} 
              variant={activeSubcategory === sub.key ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setActiveSubcategory(sub.key)}
            >
              {t(`devices.subcategories.${sub.key}`, sub.label)}
            </Badge>
          ))}
        </div>
      )}
      
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                 <TableHead className="w-[50px]"></TableHead>
                <TableHead>{t('devices.table.name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('devices.table.manufacturer')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('devices.table.power')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('devices.table.current')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('devices.table.weight')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && paginatedDevices.map((device) => {
                const isFavorite = favoriteDeviceIds.has(device.id);
                return (
                <TableRow key={device.id}>
                  {/* ... (komórki z danymi i przyciskami akcji) ... */}
                </TableRow>
              )})}
               {!isLoading && paginatedDevices.length === 0 && (
                 <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    {t('devices.no_devices_found')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         <div className="flex items-center justify-end gap-2 p-4 border-t">
            {/* ... (przyciski paginacji) ... */}
          </div>
      </Card>
      
      {/* Formularz jako dialog */}
      <DeviceForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        device={selectedDevice}
        onSave={handleSave}
        category={categoryInfo!}
      />
      {/* ... (reszta JSX, np. dialogi potwierdzenia) ... */}
    </AppShell>
  );
}
```

---

### 3. Komponent formularza

To jest przykład jednego z dedykowanych formularzy. Logika w pozostałych jest analogiczna.

**Plik:** `src/components/device/lighting-device-form.tsx`

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Device, DeviceCategory, DeviceCategoryName } from '@/lib/definitions';
import { useTranslation } from '@/context/language-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const NOMINAL_VOLTAGE = 230;

const getLightingFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('devices.validation.name_required')),
  manufacturer: z.string().min(1, t('devices.validation.manufacturer_required')),
  model: z.string().optional(),
  subcategory: z.string().optional(),
  powerW: z.coerce.number().min(0, t('devices.validation.power_positive')),
  currentA: z.coerce.number().min(0, t('devices.validation.current_positive')),
  weightKg: z.coerce.number().min(0, t('devices.validation.weight_positive')),
  ipRating: z.string().optional(),
  lightSource: z.string().optional(),
  notes: z.string().optional(),
});


type LightingDeviceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Omit<Device, 'id'> & { id?: string };
  onSave: (device: Omit<Device, 'id' | 'category'> & { id?: string }) => void;
  category: DeviceCategory;
};

export function LightingDeviceForm({
  open,
  onOpenChange,
  device,
  onSave,
  category,
}: LightingDeviceFormProps) {
  const { t } = useTranslation();
  const formSchema = getLightingFormSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { /* ... */ },
  });

  const { watch, setValue, control, reset } = form;
  // ... (logika do przeliczania W na A)

  useEffect(() => {
    if (open) {
      if (device) {
        reset(device);
      } else {
        reset({ /* ... */ });
      }
    }
  }, [device, open, reset, category]);

  // ### WYWOŁANIE FUNKCJI ZAPISUJĄCEJ ###
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const dataToSave = { ...values, id: device?.id, category: category.name };
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {device ? t('devices.edit_device') : t('devices.add_device')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            {/* ... (pola formularza) ... */}
            <DialogFooter>
              <Button type="submit">{t('common.save_changes')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 4. Sposób interakcji z Firebase

**Kluczowa informacja:** Aplikacja celowo używa **nieblokujących** (`non-blocking`) operacji zapisu do Firebase. Polegamy na mechanizmie `onSnapshot` (używanym w hooku `useCollection`), który automatycznie i w czasie rzeczywistym aktualizuje interfejs użytkownika.

**Plik z funkcjami zapisu:** `src/firebase/non-blocking-updates.tsx`

```tsx
'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import {FirestorePermissionError} from '@/firebase/errors';

/**
 * Inicjuje operację setDoc.
 * NIE czeka na zakończenie operacji zapisu.
 */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(error => {
    errorEmitter.emit(
      'permission-error',
      new FirestorePermissionError({
        path: docRef.path,
        operation: 'write',
        requestResourceData: data,
      })
    )
  })
}

// ... (reszta funkcji: add, update, delete)
```

**Plik z hookiem do odczytu:** `src/firebase/firestore/use-collection.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
// ...

export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  // ...

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      // ...
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      memoizedTargetRefOrQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results); // <<<--- TUTAJ AKTUALIZOWANY JEST STAN KOMPONENTU
        setError(null);
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        // ... (obsługa błędów)
      }
    );

    return () => unsubscribe();
  }, [memoizedTargetRefOrQuery]);
  
  // ...
  return { data, isLoading, error, setData };
}
```

---

### 5. Implementacja `useMemoFirebase`

**Plik:** `src/firebase/provider.tsx`

```tsx
import React, { DependencyList, useMemo } from 'react';
// ... (reszta importów)

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

// ... (reszta kodu providera)
```

Mam nadzieję, że te dodatkowe informacje pozwolą na znalezienie źródła problemu.