'use client';

import { useState, useMemo, useEffect } from 'react';
import { Edit, MoreHorizontal, PlusCircle, Trash2, User, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
import type { Client } from '@/lib/definitions';
import { ClientDetailsDialog } from '@/components/client/client-details-dialog';
import { ClientForm } from '@/components/client/client-form';
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

import { pb } from '@/lib/pocketbase';
import { useCollection, useUser } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/context/language-context';
import { Input } from '@/components/ui/input';
import React from 'react';

const ITEMS_PER_PAGE = 25;

export default function ClientsPage() {
  const { t } = useTranslation();
  const { user } = useUser();

  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: allClientsFromHook, isLoading } = useCollection<Client>(
    user ? 'clients' : null,
    useMemo(() => ({ sort: 'name' }), [])
  );

  const allClients = allClientsFromHook || [];


  const filteredClients = useMemo(() => {
    if (!allClients) return [];
    let clients = [...allClients];
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      clients = clients.filter(client =>
        client.name.toLowerCase().includes(lowerCaseQuery) ||
        (client.contactPerson && client.contactPerson.toLowerCase().includes(lowerCaseQuery)) ||
        client.email.toLowerCase().includes(lowerCaseQuery) ||
        (client.nip && client.nip.toLowerCase().includes(lowerCaseQuery))
      );
    }
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  }, [allClients, searchQuery]);

  const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
  const paginatedClients = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredClients.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredClients, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleAdd = () => {
    setSelectedClient(undefined);
    setIsFormOpen(true);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setTimeout(() => setIsFormOpen(true), 0);
  };

  const handleDelete = (client: Client) => {
    setSelectedClient(client);
    setTimeout(() => setIsDeleteConfirmOpen(true), 0);
  };

  // USUWANIE W POCKETBASE
  const confirmDelete = async () => {
    if (selectedClient?.id) {
      try {
        await pb.collection('clients').delete(selectedClient.id);
        // useCollection will auto-refresh via real-time subscription
      } catch (error) {
        alert("Błąd usuwania!");
      }
    }
    setIsDeleteConfirmOpen(false);
    setSelectedClient(undefined);
  };

  // ZAPIS/EDYCJA W POCKETBASE
  const handleSave = async (clientData: Omit<Client, 'id' | 'ownerUserId'>) => {
    try {
      const data = {
        ...clientData,
        owner: pb.authStore.model?.id, // Przypisujemy do zalogowanego usera
      };

      if (selectedClient?.id) {
        await pb.collection('clients').update(selectedClient.id, data);
      } else {
        await pb.collection('clients').create(data);
      }
      // useCollection will auto-refresh via real-time subscription
      setIsFormOpen(false);
    } catch (error) {
      alert("Błąd zapisu! Sprawdź czy jesteś zalogowany.");
    }
  };

  const generateGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <AppShell>
      {/* Reszta JSX pozostaje niemal identyczna jak w oryginale */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold font-headline">{t('clients.title')}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('clients.search_placeholder')}
              className="pl-8 w-full sm:w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAdd} className="shrink-0">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('clients.add_client')}
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('clients.table.name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('clients.table.contact')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('clients.table.email')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('clients.table.address')}</TableHead>
                <TableHead><span className="sr-only">{t('common.actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center h-24">{t('common.loading')}</TableCell></TableRow>
              ) : paginatedClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 h-60">
                    <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-lg">{t('clients.no_clients_found')}</p>
                    <Button onClick={handleAdd} className="mt-4">
                      <PlusCircle className="mr-2 h-4 w-4" /> {t('clients.add_client')}
                    </Button>
                  </TableCell>
                </TableRow>
              ) : paginatedClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleViewDetails(client)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-primary hover:underline">{client.name}</span>
                      {client.nip && <Badge variant="secondary">NIP: {client.nip}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{client.contactPerson || '-'}</TableCell>
                  <TableCell className="hidden sm:table-cell">{client.email}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {client.address ? (
                      <a href={generateGoogleMapsLink(client.address)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                        {client.address}
                      </a>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => handleEdit(client)}>
                          <Edit className="mr-2 h-4 w-4" /> <span>{t('common.edit')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDelete(client)} className="text-red-400">
                          <Trash2 className="mr-2 h-4 w-4" /> <span>{t('common.delete')}</span>
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
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Poprzednia
            </Button>
            <span className="text-sm text-muted-foreground">Strona {currentPage} z {totalPages}</span>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
              Następna <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>

      <ClientDetailsDialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen} client={selectedClient} />
      <ClientForm open={isFormOpen} onOpenChange={setIsFormOpen} client={selectedClient} onSave={handleSave} />

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.are_you_sure')}</AlertDialogTitle>
            <AlertDialogDescription>{t('clients.delete_warning_description', { clientName: selectedClient?.name || '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('common.continue')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}