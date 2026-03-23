
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import type { Location, PowerConnector, Contact } from '@/lib/definitions';
import { PlusCircle, Trash2, Zap, Link as LinkIcon, X, User } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import { SummaryCard } from '../event/summary-card';
import { useTranslation } from '@/context/language-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ConnectorTypes, connectorTypeConfig } from '@/lib/definitions';

const contactSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1, 'Imię i nazwisko jest wymagane.'),
  phone: z.string().optional(),
  email: z.string().email('Nieprawidłowy adres e-mail.').optional().or(z.literal('')),
  notes: z.string().optional(),
});

const powerConnectorSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  type: z.enum([
    '16A Uni-Schuko',
    '16A CEE 3P',
    '16A CEE 5P',
    '32A CEE 3P',
    '32A CEE 5P',
    '63A CEE 5P',
    '125A CEE 5P',
    'Powerlock 200A',
    'Powerlock 400A',
  ]),
  phases: z.union([z.literal(1), z.literal(3)]),
  maxCurrentA: z.coerce.number().min(1),
  notes: z.string().optional(),
});

const powerConnectorGroupSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1, 'Nazwa grupy jest wymagana.'),
  connectors: z.array(powerConnectorSchema).optional(),
})

const documentSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  name: z.string().min(1, 'Nazwa pliku jest wymagana.'),
  url: z.string().url('Nieprawidłowy adres URL.'),
});

const getFormSchema = (t: (key: string) => string) => z.object({
  id: z.string().optional(),
  name: z.string().min(1, t('locations.validation.name_required')),
  address: z.string().min(1, t('locations.validation.address_required')),
  powerConnectorGroups: z.array(powerConnectorGroupSchema).optional(),
  documents: z.array(documentSchema).optional(),
  capacity: z.coerce.number().optional(),
  notes: z.string().optional(),
  contacts: z.array(contactSchema).optional(),
});


type LocationFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location;
  onSave: (location: Omit<Location, 'id'>, id?: string) => void;
  onDeleteRequest?: () => void;
};

type View = 'form' | 'confirmClose' | 'confirmDeleteGroup';


export function LocationForm({
  open,
  onOpenChange,
  location,
  onSave,
}: LocationFormProps) {
  const { t } = useTranslation();
  const formSchema = getFormSchema(t);
  type LocationFormData = z.infer<typeof formSchema>;

  const [view, setView] = useState<View>('form');
  const [itemToDelete, setItemToDelete] = useState<{ type: 'group'; id: string } | null>(null);

  const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: '',
      name: '',
      address: '',
      powerConnectorGroups: [],
      documents: [],
      capacity: 0,
      notes: '',
      contacts: [],
    },
  });

  const { formState: { isDirty }, reset, control, watch } = form;

  const { fields: groupFields, append: appendGroup, remove: removeGroup, update: updateGroup } = useFieldArray({
    control: control,
    name: 'powerConnectorGroups',
  });

  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control: control,
    name: 'documents',
  });

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: control,
    name: 'contacts',
  });

  const watchedGroups = watch('powerConnectorGroups');

  const calculatePower = (connectors: Omit<PowerConnector, 'id' | 'locationId' | 'name' | 'type' | 'quantity'>[] | undefined) => {
    if (!connectors) return 0;
    return connectors.reduce((total, connector) => {
      const current = connector.maxCurrentA;
      const phases = connector.phases;
      let powerPerConnector = 0;
      if (phases === 1) {
        powerPerConnector = 230 * current;
      } else {
        powerPerConnector = 400 * current * Math.sqrt(3);
      }
      return total + powerPerConnector;
    }, 0);
  };

  const totalPowerCapacity = useMemo(() => {
    const allConnectors = watchedGroups?.flatMap(g => g.connectors || []);
    return calculatePower(allConnectors);
  }, [watchedGroups]);

  const handleAddGroup = () => {
    const newGroupId = crypto.randomUUID();
    appendGroup({
      id: newGroupId,
      name: `Nowa grupa ${groupFields.length + 1}`,
      connectors: []
    });
    setOpenAccordionItems(prev => [...prev, newGroupId]);
  }

  const handleAddConnector = (groupIndex: number) => {
    const group = watchedGroups?.[groupIndex];
    if (!group) return;

    const newType = '16A Uni-Schuko';
    const config = connectorTypeConfig[newType];

    const newConnectors = [...(group.connectors || []), {
      id: crypto.randomUUID(),
      type: newType as PowerConnector['type'],
      phases: config.phases as 1 | 3,
      maxCurrentA: config.maxCurrentA,
      notes: ''
    }];
    updateGroup(groupIndex, { ...group, connectors: newConnectors });
  }

  const handleRemoveConnector = (groupIndex: number, connectorIndex: number) => {
    const group = watchedGroups?.[groupIndex];
    if (!group) return;
    const newConnectors = [...(group.connectors || [])];
    newConnectors.splice(connectorIndex, 1);
    updateGroup(groupIndex, { ...group, connectors: newConnectors });
  }

  const handleDeleteGroupRequest = (groupId: string) => {
    setItemToDelete({ type: 'group', id: groupId });
    setView('confirmDeleteGroup');
  };

  const confirmDeleteGroup = () => {
    if (itemToDelete?.type === 'group') {
      const groupIndex = groupFields.findIndex(g => g.id === itemToDelete.id);
      if (groupIndex > -1) {
        removeGroup(groupIndex);
      }
    }
    setView('form');
    setItemToDelete(null);
  }

  const handleAddDocument = () => {
    appendDocument({ id: crypto.randomUUID(), name: '', url: '' });
  };

  const handleAddContact = () => {
    appendContact({ id: crypto.randomUUID(), name: '', phone: '', email: '', notes: '' });
  };

  const handleAttemptClose = () => {
    if (isDirty) {
      setView('confirmClose');
    } else {
      onOpenChange(false);
    }
  };

  const confirmClose = () => {
    onOpenChange(false);
    setView('form');
  };

  useEffect(() => {
    if (open) {
      if (location) {
        let groups = location.powerConnectorGroups || [];
        if (location.powerConnectors && location.powerConnectors.length > 0 && groups.length === 0) {
          groups = [{
            id: crypto.randomUUID(),
            name: 'Domyślne przyłącza',
            connectors: location.powerConnectors.map(c => ({ ...c, id: c.id || crypto.randomUUID(), type: c.type || '16A Uni-Schuko' }))
          }];
        }

        const formData = {
          ...location,
          capacity: location.capacity ?? 0,
          notes: location.notes ?? '',
          powerConnectorGroups: groups.map(g => ({
            ...g,
            id: g.id || crypto.randomUUID(),
            connectors: g.connectors?.map(c => ({ ...c, id: c.id || crypto.randomUUID() })) || []
          })),
          documents: location.documents?.map(doc => ({ ...doc, id: doc.id || crypto.randomUUID() })) || [],
          contacts: location.contacts?.map(c => ({ ...c, id: c.id || crypto.randomUUID() })) || [],
        };
        reset(formData);
        setOpenAccordionItems(formData.powerConnectorGroups.map(g => g.id));

      } else {
        reset({
          id: '',
          name: '',
          address: '',
          powerConnectorGroups: [],
          documents: [],
          capacity: 0,
          notes: '',
          contacts: [],
        });
        setOpenAccordionItems([]);
      }
    } else {
      // Reset view when dialog is closed from outside
      setView('form');
    }
  }, [location, reset, open]);

  const onSubmit = (values: LocationFormData) => {
    const dataToSave = {
      ...values,
      powerConnectorGroups: values.powerConnectorGroups?.map(g => ({
        ...g,
        id: g.id || crypto.randomUUID(),
        connectors: g.connectors?.map(c => ({ ...c, id: c.id || crypto.randomUUID() })) || [],
      })) || [],
      documents: values.documents?.map(doc => ({
        ...doc,
        id: doc.id || crypto.randomUUID(),
      })) || [],
      contacts: values.contacts?.map(c => ({
        ...c,
        id: c.id || crypto.randomUUID(),
      })) || [],
    };
    onSave(dataToSave, values.id);
  };

  const renderContent = () => {
    switch (view) {
      case 'confirmClose':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Niezapisane zmiany</DialogTitle>
            </DialogHeader>
            <div className="py-4">Masz niezapisane zmiany. Czy na pewno chcesz zamknąć formularz? Zmiany zostaną utracone.</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setView('form')}>Anuluj</Button>
              <Button onClick={confirmClose}>Zamknij mimo to</Button>
            </DialogFooter>
          </>
        );
      case 'confirmDeleteGroup':
        const groupName = watchedGroups?.find(g => g.id === itemToDelete?.id)?.name || 'tę grupę';
        return (
          <>
            <DialogHeader>
              <DialogTitle>{t('common.are_you_sure')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">Czy na pewno chcesz usunąć grupę "{groupName}" i wszystkie jej przyłącza?</div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setView('form')}>{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={confirmDeleteGroup}>{t('common.delete')}</Button>
            </DialogFooter>
          </>
        );
      case 'form':
      default:
        return (
          <>
            <DialogHeader>
              <DialogTitle>{location ? t('locations.edit_location') : t('locations.add_location')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0">
                <div className="overflow-y-auto pr-6 pl-1 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                      <FormField control={control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('locations.table.name')}</FormLabel><FormControl><Input placeholder={t('locations.name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={control} name="address" render={({ field }) => (<FormItem><FormLabel>{t('locations.table.address')}</FormLabel><FormControl><Input placeholder={t('locations.address_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={control} name="capacity" render={({ field }) => (<FormItem><FormLabel>{t('locations.capacity_people')}</FormLabel><FormControl><Input type="number" placeholder="1000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={control} name="notes" render={({ field }) => (<FormItem className="flex flex-col flex-1"><FormLabel>{t('common.notes')}</FormLabel><FormControl><Textarea placeholder={t('locations.notes_placeholder')} {...field} className="h-full" /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <div className="space-y-4">
                      <Tabs defaultValue="power">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="power"><Zap className="mr-2 h-4 w-4" /> Przyłącza</TabsTrigger>
                          <TabsTrigger value="contacts"><User className="mr-2 h-4 w-4" /> Kontakty</TabsTrigger>
                          <TabsTrigger value="docs"><LinkIcon className="mr-2 h-4 w-4" /> Pliki</TabsTrigger>
                        </TabsList>
                        <TabsContent value="power" className="space-y-4">
                          <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems} className="w-full">
                            {groupFields.map((groupField, groupIndex) => {
                              const group = watchedGroups?.[groupIndex];
                              if (!group) return null;
                              const groupPower = calculatePower(group?.connectors);
                              return (
                                <AccordionItem value={group.id} key={group.id}>
                                  <div className='flex items-center'>
                                    <AccordionTrigger>
                                      <div className="flex items-center gap-2">
                                        <FormField control={control} name={`powerConnectorGroups.${groupIndex}.name`} render={({ field }) => (<Input {...field} onClick={(e) => e.stopPropagation()} className="text-md font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" />)} />
                                        <span className="text-sm text-muted-foreground font-normal">({(groupPower / 1000).toFixed(1)} kW)</span>
                                      </div>
                                    </AccordionTrigger>
                                    <Button type="button" variant='ghost' size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleDeleteGroupRequest(groupField.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <AccordionContent className='pl-2 space-y-2'>
                                    <div className="max-h-60 overflow-y-auto pr-2">
                                      <Table>
                                        <TableHeader><TableRow><TableHead>Typ</TableHead><TableHead>Notatki</TableHead><TableHead className="w-[50px]"><span className="sr-only">Akcje</span></TableHead></TableRow></TableHeader>
                                        <TableBody>
                                          {(group?.connectors || []).map((connector, connectorIndex) => (
                                            <TableRow key={connector.id}>
                                              <TableCell className="p-1">
                                                <FormField control={control} name={`powerConnectorGroups.${groupIndex}.connectors.${connectorIndex}.type`} render={({ field: selectField }) => (<FormItem><Select onValueChange={(value) => { selectField.onChange(value); const config = connectorTypeConfig[value as keyof typeof connectorTypeConfig]; if (config) { form.setValue(`powerConnectorGroups.${groupIndex}.connectors.${connectorIndex}.maxCurrentA`, config.maxCurrentA); form.setValue(`powerConnectorGroups.${groupIndex}.connectors.${connectorIndex}.phases`, config.phases); } }} value={selectField.value}><FormControl><SelectTrigger className="h-9"><SelectValue placeholder={t('locations.type_placeholder')} /></SelectTrigger></FormControl><SelectContent>{ConnectorTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                                              </TableCell>
                                              <TableCell className="p-1"><FormField control={control} name={`powerConnectorGroups.${groupIndex}.connectors.${connectorIndex}.notes`} render={({ field }) => (<FormItem><FormControl><Input className="h-9" placeholder={t('locations.connector_notes_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                              <TableCell className="p-1"><Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => handleRemoveConnector(groupIndex, connectorIndex)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                    <Button type="button" variant="outline" size="sm" onClick={() => handleAddConnector(groupIndex)}><PlusCircle className="mr-2 h-4 w-4" /> {t('common.add')} złącze</Button>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                          <Button type="button" variant="outline" size="sm" onClick={handleAddGroup} className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Dodaj grupę (np. rozdzielnię)</Button>
                          <SummaryCard title={t('locations.total_available_power')} value={`${(totalPowerCapacity / 1000).toFixed(2)} kW`} icon={Zap} />
                        </TabsContent>
                        <TabsContent value="contacts" className="space-y-4">
                          <div className="flex items-center justify-between"><h3 className="text-lg font-medium">Kontakty</h3><Button type="button" variant="outline" size="sm" onClick={handleAddContact}><PlusCircle className="mr-2 h-4 w-4" /> {t('common.add')}</Button></div>
                          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                            {contactFields.map((field, index) => (
                              <div key={field.id} className="p-4 border rounded-lg space-y-3 relative">
                                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeContact(index)}><X className="h-4 w-4 text-muted-foreground" /></Button>
                                <FormField control={control} name={`contacts.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Imię i nazwisko</FormLabel><FormControl><Input placeholder="Jan Kowalski" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={control} name={`contacts.${index}.notes`} render={({ field }) => (<FormItem><FormLabel>Rola / Notatki</FormLabel><FormControl><Input placeholder="np. Technik sceny, Kierownik" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField control={control} name={`contacts.${index}.phone`} render={({ field }) => (<FormItem><FormLabel>Telefon</FormLabel><FormControl><Input placeholder="+48..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                  <FormField control={control} name={`contacts.${index}.email`} render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="email@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                              </div>
                            ))}
                            {contactFields.length === 0 && <p className='text-sm text-center text-muted-foreground py-8'>Brak dodanych kontaktów.</p>}
                          </div>
                        </TabsContent>
                        <TabsContent value="docs" className="space-y-4">
                          <div className="flex items-center justify-between"><h3 className="text-lg font-medium">Załączone pliki</h3><Button type="button" variant="outline" size="sm" onClick={handleAddDocument}><PlusCircle className="mr-2 h-4 w-4" /> {t('common.add')}</Button></div>
                          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                            {documentFields.map((field, index) => (
                              <div key={field.id} className="flex items-end gap-2">
                                <div className="grid grid-cols-1 gap-2 flex-1">
                                  <FormField
                                    control={form.control}
                                    name={`documents.${index}.name`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Nazwa pliku</FormLabel>
                                        <FormControl>
                                          <Input placeholder="np. Plan techniczny" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name={`documents.${index}.url`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Link do pliku</FormLabel>
                                        <FormControl>
                                          <Input placeholder="https://..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeDocument(index)}>
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            ))}
                            {documentFields.length === 0 && <p className='text-sm text-center text-muted-foreground py-8'>Brak załączonych plików.</p>}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                </div>
                <DialogFooter className="pt-4 border-t">
                  <Button type="button" variant="secondary" onClick={handleAttemptClose}>{t('common.cancel')}</Button>
                  <Button type="submit">{t('common.save_changes')}</Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleAttemptClose() }}>
      <DialogContent
        hideClose
        className="sm:max-w-4xl max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => {
          if (isDirty) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isDirty) e.preventDefault();
          handleAttemptClose();
        }}
      >
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleAttemptClose}
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Zamknij</span>
          </Button>
        </div>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
