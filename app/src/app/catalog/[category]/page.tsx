
'use client';

import { useState, useEffect, useMemo, FC } from 'react';
import { Edit, MoreHorizontal, PlusCircle, Trash2, Star, Search, ChevronLeft, ChevronRight, SlidersHorizontal, Camera } from 'lucide-react';
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
import {
  deviceCategories,
  SoundProtocols,
  SoundPowerTypes,
  SoundMountTypes,
  LightingControlProtocols,
  LightSourceTypes,
  StaticLightTypes,
  ColorSystems
} from '@/lib/definitions';
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
import { useCollection, useUser } from '@/firebase';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { pb } from '@/lib/pocketbase';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MultimediaDeviceForm } from '@/components/device/multimedia-device-form';
import { CablingDeviceForm } from '@/components/device/cabling-device-form';
import { RiggingDeviceForm } from '@/components/device/rigging-device-form';


const ITEMS_PER_PAGE = 25;

const categoryFormMap: Record<string, FC<any>> = {
  'lighting': LightingDeviceForm,
  'sound': SoundDeviceForm,
  'multimedia': MultimediaDeviceForm,
  'cabling': CablingDeviceForm,
  'rigging': RiggingDeviceForm,
  'other': BaseDeviceForm,
};

type SoundFilters = {
  powerType: string | null;
  mountType: string | null;
  protocols: string[];
}

type LightingFilters = {
  lightSourceType: string | null;
  colorSystem: string | null;
  cameraReady: boolean | null;
  controlProtocols: string[];
};

export default function CategoryPage() {
  const { t } = useTranslation();
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

  const [soundFilters, setSoundFilters] = useState<SoundFilters>({ powerType: null, mountType: null, protocols: [] });
  const [lightingFilters, setLightingFilters] = useState<LightingFilters>({ lightSourceType: null, colorSystem: null, cameraReady: null, controlProtocols: [] });

  const { data: rawDevices, isLoading: areDevicesLoading } = useCollection<Device>(
    user && categoryInfo ? categoryInfo.collectionName : null,
    useMemo(() => ({ sort: 'name' }), [])
  );

  const allDevices = useMemo(() => {
    if (!rawDevices || !categoryInfo) return [];
    return rawDevices.map(d => ({ ...d, category: categoryInfo.name as DeviceCategoryName }));
  }, [rawDevices, categoryInfo]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!isUserLoading && user && !categoryInfo) {
      router.push('/catalog');
    }
  }, [isUserLoading, user, categoryInfo, router]);

  const favoriteDeviceIds = useMemo(() => new Set(user?.favorites || []), [user]);

  const filteredDevices = useMemo(() => {
    if (!allDevices) return [];

    const isFavorite = (deviceId: string) => favoriteDeviceIds.has(deviceId);

    return allDevices
      .filter(device => {
        if (showFavoritesOnly && !isFavorite(device.id)) return false;
        if (activeSubcategory && device.subcategory !== activeSubcategory) return false;

        if (categorySlug === 'sound') {
          if (soundFilters.powerType && device.powerType !== soundFilters.powerType) return false;
          if (soundFilters.mountType && !device.mountType?.includes(soundFilters.mountType)) return false;
          if (soundFilters.protocols.length > 0) {
            if (!device.protocols || !soundFilters.protocols.every(p => device.protocols!.includes(p))) {
              return false;
            }
          }
        }

        if (categorySlug === 'lighting') {
          if (lightingFilters.lightSourceType && device.lightSourceType !== lightingFilters.lightSourceType) return false;
          if (lightingFilters.colorSystem && device.colorSystem !== lightingFilters.colorSystem) return false;
          if (lightingFilters.cameraReady !== null && device.cameraReady !== lightingFilters.cameraReady) return false;
          if (lightingFilters.controlProtocols.length > 0) {
            if (!device.controlProtocols || !lightingFilters.controlProtocols.every(p => device.controlProtocols!.includes(p))) {
              return false;
            }
          }
        }

        if (searchQuery) {
          const lowerCaseQuery = searchQuery.toLowerCase();
          return (
            device.name.toLowerCase().includes(lowerCaseQuery) ||
            device.manufacturer.toLowerCase().includes(lowerCaseQuery)
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
  }, [allDevices, searchQuery, showFavoritesOnly, activeSubcategory, favoriteDeviceIds, soundFilters, lightingFilters, categorySlug]);

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
  }, [searchQuery, showFavoritesOnly, activeSubcategory, soundFilters, lightingFilters]);

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));

  // Render a loading state until all essential data is available.
  if (isUserLoading || !user || !categoryInfo) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <p>{t('common.loading')}...</p>
        </div>
      </AppShell>
    );
  }

  const handleViewDetails = (device: Device) => {
    setSelectedDevice(device);
    setIsDetailsOpen(true);
  };

  const handleAdd = () => {
    setSelectedDevice(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (device: Device) => {
    setSelectedDevice(device);
    setTimeout(() => setIsFormOpen(true), 0);
  };

  const handleDelete = (device: Device) => {
    setSelectedDevice(device);
    setTimeout(() => setIsDeleteConfirmOpen(true), 0);
  };

  const toggleFavorite = async (deviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newFavorites = new Set(favoriteDeviceIds);
    if (newFavorites.has(deviceId)) {
      newFavorites.delete(deviceId);
    } else {
      newFavorites.add(deviceId);
    }
    try {
      await pb.collection('users').update(user.id, {
        favorites: Array.from(newFavorites)
      });
      // The auth state should update automatically if pb.authStore.model is updated
      // But it might need a page refresh or manual store update if not using real-time for user
    } catch (error) {
      console.error("Error updating favorites", error);
    }
  };

  const confirmDelete = () => {
    if (selectedDevice?.id && categoryInfo) {
      deleteDocumentNonBlocking(categoryInfo.collectionName, selectedDevice.id);
    }
    setIsDeleteConfirmOpen(false);
    setSelectedDevice(undefined);
    document.body.focus();
  };

  const handleSave = (deviceDataWithId: Omit<Device, 'category'> & { id?: string }) => {
    const { id, ...deviceData } = deviceDataWithId;
    if (id) {
      updateDocumentNonBlocking(categoryInfo.collectionName, id, deviceData);
    } else {
      addDocumentNonBlocking(categoryInfo.collectionName, deviceData);
    }
    setIsFormOpen(false);
    document.body.focus();
  };

  const DeviceForm = categoryFormMap[categorySlug] || BaseDeviceForm;

  const currentLightingSourceTypes = activeSubcategory === 'moving_heads' ? LightSourceTypes : StaticLightTypes;

  const isCablingOrRiggingCategory = categorySlug === 'cabling' || categorySlug === 'rigging';

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-headline">{t(`categories.${categorySlug}`)}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('devices.search_placeholder')} className="pl-8 w-full sm:w-48" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="favorites-only" className="text-sm">{t('devices.favorites')}</Label>
            <Switch id="favorites-only" checked={showFavoritesOnly} onCheckedChange={setShowFavoritesOnly} />
          </div>
          <Button onClick={handleAdd} className="shrink-0"><PlusCircle className="mr-2 h-4 w-4" /> {t('devices.add_device')}</Button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {categoryInfo.subcategories && categoryInfo.subcategories.length > 0 && (
          <>
            <Badge variant={!activeSubcategory ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setActiveSubcategory(null)}>Wszystkie</Badge>
            {categoryInfo.subcategories.map(sub => (<Badge key={sub.key} variant={activeSubcategory === sub.key ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setActiveSubcategory(sub.key)}>{t(`devices.subcategories.${sub.key}`)}</Badge>))}
          </>
        )}
        {categorySlug === 'sound' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7"><SlidersHorizontal className="mr-2 h-4 w-4" />Filtry</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2"><h4 className="font-medium leading-none">Filtry dla dźwięku</h4><p className="text-sm text-muted-foreground">Filtruj urządzenia po atrybutach.</p></div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4"><Label>Typ zasilania</Label><Select value={soundFilters.powerType || ''} onValueChange={(v) => setSoundFilters(f => ({ ...f, powerType: v === 'all' ? null : v }))}><SelectTrigger className="col-span-2 h-8"><SelectValue placeholder="Wszystkie" /></SelectTrigger><SelectContent><SelectItem value="all">Wszystkie</SelectItem>{SoundPowerTypes.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-3 items-center gap-4"><Label>Montaż</Label><Select value={soundFilters.mountType || ''} onValueChange={(v) => setSoundFilters(f => ({ ...f, mountType: v === 'all' ? null : v }))}><SelectTrigger className="col-span-2 h-8"><SelectValue placeholder="Wszystkie" /></SelectTrigger><SelectContent><SelectItem value="all">Wszystkie</SelectItem>{SoundMountTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Protokoły</Label>
                    <div className="flex flex-wrap gap-2">
                      {SoundProtocols.map(p => (<div key={p} className="flex items-center space-x-2"><Checkbox id={`proto-${p}`} checked={soundFilters.protocols.includes(p)} onCheckedChange={(checked) => setSoundFilters(f => ({ ...f, protocols: checked ? [...f.protocols, p] : f.protocols.filter(proto => proto !== p) }))} /><label htmlFor={`proto-${p}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{p}</label></div>))}
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {categorySlug === 'lighting' && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7"><SlidersHorizontal className="mr-2 h-4 w-4" />Filtry</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2"><h4 className="font-medium leading-none">Filtry dla oświetlenia</h4><p className="text-sm text-muted-foreground">Filtruj urządzenia po atrybutach.</p></div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4"><Label>Typ urządzenia</Label><Select value={lightingFilters.lightSourceType || ''} onValueChange={(v) => setLightingFilters(f => ({ ...f, lightSourceType: v === 'all' ? null : v }))}><SelectTrigger className="col-span-2 h-8"><SelectValue placeholder="Wszystkie" /></SelectTrigger><SelectContent><SelectItem value="all">Wszystkie</SelectItem>{[...LightSourceTypes, ...StaticLightTypes].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-3 items-center gap-4"><Label>System koloru</Label><Select value={lightingFilters.colorSystem || ''} onValueChange={(v) => setLightingFilters(f => ({ ...f, colorSystem: v === 'all' ? null : v }))}><SelectTrigger className="col-span-2 h-8"><SelectValue placeholder="Wszystkie" /></SelectTrigger><SelectContent><SelectItem value="all">Wszystkie</SelectItem>{ColorSystems.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
                  <div className="grid grid-cols-3 items-center gap-4"><Label>Praca z kamerą</Label><div className="col-span-2 flex items-center space-x-2"><Switch id="camera-ready-filter" checked={lightingFilters.cameraReady === true} onCheckedChange={(c) => setLightingFilters(f => ({ ...f, cameraReady: c ? true : null }))} /><label htmlFor="camera-ready-filter">Tylko "Camera-Ready"</label></div></div>
                  <div className="space-y-2"><Label>Protokoły sterowania</Label>
                    <div className="flex flex-wrap gap-2">
                      {LightingControlProtocols.map(p => (<div key={p} className="flex items-center space-x-2"><Checkbox id={`proto-light-${p}`} checked={lightingFilters.controlProtocols.includes(p)} onCheckedChange={(checked) => setLightingFilters(f => ({ ...f, controlProtocols: checked ? [...f.controlProtocols, p] : f.controlProtocols.filter(proto => proto !== p) }))} /><label htmlFor={`proto-light-${p}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{p}</label></div>))}
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>{t('devices.table.name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('devices.table.manufacturer')}</TableHead>
                {!isCablingOrRiggingCategory && (
                  <>
                    <TableHead className="hidden lg:table-cell">{t('devices.table.power')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('devices.table.current')}</TableHead>
                  </>
                )}
                <TableHead className="hidden lg:table-cell">{t('devices.table.weight')}</TableHead>
                <TableHead><span className="sr-only">{t('common.actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areDevicesLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24">
                    {t('common.loading')}
                  </TableCell>
                </TableRow>
              )}
              {!areDevicesLoading && paginatedDevices.length > 0 && paginatedDevices.map((device) => {
                const isFavorite = favoriteDeviceIds.has(device.id);
                return (
                  <TableRow key={device.id}>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => toggleFavorite(device.id, e)}><Star className={cn("h-5 w-5 text-muted-foreground/50 transition-all", isFavorite && "fill-yellow-400 text-yellow-500")} /></Button></TableCell>
                    <TableCell className="font-medium break-words"><button onClick={() => handleViewDetails(device)} className="text-primary hover:underline">{device.name}</button>{device.subcategory && <Badge variant="outline" className="ml-2">{t(`devices.subcategories.${device.subcategory}`)}</Badge>}</TableCell>
                    <TableCell className="hidden md:table-cell">{device.manufacturer}</TableCell>
                    {!isCablingOrRiggingCategory && (
                      <>
                        <TableCell className="hidden lg:table-cell">{device.powerW}</TableCell>
                        <TableCell className="hidden lg:table-cell">{device.currentA.toFixed(2)}</TableCell>
                      </>
                    )}
                    <TableCell className="hidden lg:table-cell">{device.weightKg.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('common.open_menu')}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => handleEdit(device)}><Edit className="mr-2 h-4 w-4" /><span>{t('common.edit')}</span></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onClick={() => handleDelete(device)} className="text-red-400 focus:text-red-400"><Trash2 className="mr-2 h-4 w-4" /><span>{t('common.delete')}</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!areDevicesLoading && paginatedDevices.length === 0 && (
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
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}><ChevronLeft className="mr-2 h-4 w-4" />Poprzednia</Button>
          <span className="text-sm text-muted-foreground">Strona {currentPage} z {totalPages || 1}</span>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0}>Następna<ChevronRight className="ml-2 h-4 w-4" /></Button>
        </div>
      </Card>
      <DeviceDetailsDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen} device={selectedDevice} />
      <DeviceForm open={isFormOpen} onOpenChange={setIsFormOpen} device={selectedDevice} onSave={handleSave} category={categoryInfo} />
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('common.are_you_sure')}</AlertDialogTitle><AlertDialogDescription>{t('devices.delete_warning_description', { deviceName: selectedDevice?.name || '' })}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction onClick={confirmDelete}>{t('common.continue')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

