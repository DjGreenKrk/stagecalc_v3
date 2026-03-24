
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Edit, PlusCircle, MoreHorizontal, Zap, Trash2, Search, Map, ChevronLeft, ChevronRight } from 'lucide-react';
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
import type { Location } from '@/lib/definitions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LocationForm } from '@/components/location/location-form';
import { useCollection, useUser } from '@/lib/pb-hooks';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/lib/pb-hooks/non-blocking-updates';
import { LocationDetailsDialog } from '@/components/location/location-details-dialog';
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
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/language-context';
import { Input } from '@/components/ui/input';

const ITEMS_PER_PAGE = 25;

export default function LocationsPage() {
  const { t, language } = useTranslation();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  const { data: allLocations, isLoading } = useCollection<Location>(
    user ? 'locations' : null,
    useMemo(() => ({ sort: 'name' }), [])
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const filteredLocations = useMemo(() => {
    if (!allLocations) return [];

    let locations = [...allLocations];

    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      locations = locations.filter(location =>
        location.name.toLowerCase().includes(lowerCaseQuery) ||
        location.address.toLowerCase().includes(lowerCaseQuery)
      );
    }

    return locations.sort((a, b) => a.name.localeCompare(b.name));
  }, [allLocations, searchQuery]);

  const totalPages = Math.ceil(filteredLocations.length / ITEMS_PER_PAGE);

  const paginatedLocations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLocations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLocations, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  if (isUserLoading || !user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center">{t('common.loading')}</div>
      </AppShell>
    );
  }

  const handleEdit = (location: Location) => {
    setSelectedLocation(location);
    setTimeout(() => {
      setIsFormOpen(true);
    }, 0);
  };

  const handleDeleteRequest = (location: Location) => {
    setSelectedLocation(location);
    setTimeout(() => {
      setIsDeleteConfirmOpen(true);
    }, 0);
  };

  const confirmDelete = () => {
    if (selectedLocation?.id) {
      deleteDocumentNonBlocking('locations', selectedLocation.id);
    }
    setIsDeleteConfirmOpen(false);
    setSelectedLocation(undefined);
  };

  const handleViewDetails = (location: Location) => {
    setSelectedLocation(location);
    setIsDetailsOpen(true);
  };

  const handleAdd = () => {
    setSelectedLocation(undefined);
    setIsFormOpen(true);
  };

  const handleSave = (locationData: Omit<Location, 'id'>, id?: string) => {
    if (id) {
      updateDocumentNonBlocking('locations', id, locationData);
    } else {
      addDocumentNonBlocking('locations', { ...locationData, ownerUserId: user?.id });
    }

    setIsFormOpen(false);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedLocation(undefined);
  }

  const generateGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const calculateTotalPower = (location: Location) => {
    const connectors = location.powerConnectorGroups?.flatMap(g => g.connectors) || location.powerConnectors || [];
    if (connectors.length === 0) return 0;

    const totalPower = connectors.reduce((total, pc) => {
      const powerPerConnector = pc.phases === 1
        ? 230 * pc.maxCurrentA
        : 400 * pc.maxCurrentA * Math.sqrt(3);
      return total + (powerPerConnector * (pc.quantity || 1));
    }, 0);
    return (totalPower / 1000).toFixed(1);
  }

  return (
    <AppShell>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-headline">{t('locations.title')}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj lokalizacji..."
              className="pl-8 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('locations.add_location')}
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('locations.table.name')}</TableHead>
                <TableHead>{t('locations.table.address')}</TableHead>
                <TableHead>{t('locations.table.max_power')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">{t('common.loading')}</TableCell>
                </TableRow>
              )}
              {paginatedLocations.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 h-60">
                    <Map className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">Nie znaleziono lokalizacji</p>
                    <p className="text-muted-foreground">{searchQuery ? "Spróbuj wpisać inną frazę" : "Dodaj pierwszą lokalizację, aby zacząć"}</p>
                    <Button onClick={handleAdd} className="mt-4">
                      <PlusCircle className="mr-2 h-4 w-4" /> {t('locations.add_location')}
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              {paginatedLocations.map((location) => (
                <TableRow key={location.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleViewDetails(location)}>
                  <TableCell className="font-medium">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewDetails(location); }}
                      className="text-primary hover:underline"
                    >
                      {location.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <a
                      href={generateGoogleMapsLink(location.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {location.address}
                    </a>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>{calculateTotalPower(location)} kW</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t('common.open_menu')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => handleEdit(location)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>{t('common.edit')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteRequest(location)}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>{t('common.delete')}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-2 p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Poprzednia
            </Button>
            <span className="text-sm text-muted-foreground">
              Strona {currentPage} z {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Następna
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>

      {isFormOpen && (
        <LocationForm
          key={selectedLocation?.id || 'new'}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          location={selectedLocation}
          onSave={handleSave}
          onDeleteRequest={() => selectedLocation && handleDeleteRequest(selectedLocation)}
        />
      )}


      <LocationDetailsDialog
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        location={selectedLocation}
      />
      <AlertDialog
        open={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.are_you_sure')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('locations.delete_warning_description', { locationName: selectedLocation?.name || '' })}
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
