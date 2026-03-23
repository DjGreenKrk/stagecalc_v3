'use client';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { TrussLoad, Device, DeviceCategory } from '@/lib/definitions';
import { deviceCategories } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  deviceId: z.string().optional(),
  manualName: z.string().optional(),
  manualWeight: z.coerce.number().optional(),
  quantity: z.coerce.number().min(1, "Ilość musi wynosić co najmniej 1."),
  loadType: z.enum(['point', 'udl']),
  position: z.coerce.number().optional(),
  riggingWeight: z.coerce.number().min(0).default(0),
});

type TrussLoadFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (load: TrussLoad) => void;
  load?: TrussLoad;
  trussLength: number;
  deviceCatalog: Device[];
};

const allowedCategories = deviceCategories.filter(c => ['cabling', 'other', 'rigging'].includes(c.slug));

export function TrussLoadFormDialog({ open, onOpenChange, onSave, load, trussLength, deviceCatalog }: TrussLoadFormDialogProps) {
  const [source, setSource] = useState<'catalog' | 'manual'>('manual');
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 1,
      loadType: 'udl',
      position: 0,
      riggingWeight: 0,
    },
  });

  const { control, handleSubmit, reset, watch, setValue } = form;
  const watchedLoadType = watch('loadType');
  const watchedDeviceId = watch('deviceId');

  const filteredCatalogItems = useMemo(() => {
    if (!selectedCategory) return [];
    
    let items = deviceCatalog.filter(d => d.category === selectedCategory.name);

    if (searchQuery) {
        return items.filter(device => 
            device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            device.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    return items;
  }, [deviceCatalog, searchQuery, selectedCategory]);


  const selectedDeviceFromCatalog = deviceCatalog.find(d => d.id === watchedDeviceId);
  const isCable = selectedDeviceFromCatalog?.subcategory === 'power_cables';

  useEffect(() => {
    if (open) {
      if (load) {
        const newSource = load.deviceId ? 'catalog' : 'manual';
        setSource(newSource);
        if (newSource === 'catalog' && load.deviceId) {
            const device = deviceCatalog.find(d => d.id === load.deviceId);
            const category = deviceCategories.find(c => c.name === device?.category);
            if (category && allowedCategories.some(c => c.slug === category.slug)) {
              setSelectedCategory(category);
            } else {
              setSelectedCategory(null);
            }
        }
        reset({ ...load, loadType: load.loadType || 'udl' });
      } else {
        setSource('manual');
        setSelectedCategory(null);
        setIsPickerVisible(false);
        setSearchQuery('');
        reset({
          deviceId: undefined,
          manualName: '',
          manualWeight: 0,
          quantity: 1,
          loadType: 'udl',
          position: 0,
          riggingWeight: 0,
        });
      }
    }
  }, [open, load, reset, deviceCatalog]);


  const onSubmit = (values: z.infer<typeof formSchema>) => {
    let dataToSave: Partial<TrussLoad> = {
      id: load?.id || crypto.randomUUID(),
      quantity: values.quantity,
      loadType: values.loadType,
      position: values.loadType === 'point' ? values.position || 0 : 0,
      riggingWeight: values.riggingWeight,
    };
    
    if (source === 'catalog') {
      if (!values.deviceId) {
        form.setError('deviceId', { type: 'manual', message: 'Musisz wybrać urządzenie.' });
        return;
      }
      dataToSave = { ...dataToSave, deviceId: values.deviceId, manualName: undefined, manualWeight: undefined };
    } else { // manual
      if (!values.manualName || values.manualWeight === undefined) {
        form.setError('manualName', { type: 'manual', message: 'Nazwa jest wymagana.' });
        form.setError('manualWeight', { type: 'manual', message: 'Waga jest wymagana.' });
        return;
      }
       dataToSave = { ...dataToSave, manualName: values.manualName, manualWeight: values.manualWeight, deviceId: undefined };
    }
    
    onSave(dataToSave as TrussLoad);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{load ? 'Edytuj obciążenie' : 'Dodaj obciążenie'}</DialogTitle>
          <DialogDescription>
            Dodaj element z katalogu lub wprowadź go ręcznie.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
            
            <FormField
              control={control}
              name="source"
              render={() => (
                <FormItem>
                  <FormLabel>Źródło obciążenia</FormLabel>
                   <RadioGroup onValueChange={(value) => setSource(value as any)} value={source} className="flex gap-4">
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="catalog" /></FormControl><FormLabel className="font-normal">Z katalogu</FormLabel></FormItem>
                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="manual" /></FormControl><FormLabel className="font-normal">Ręczne</FormLabel></FormItem>
                  </RadioGroup>
                </FormItem>
              )}
            />
            
            {source === 'catalog' && (
                <div className="space-y-2">
                    <FormField
                        name="deviceId"
                        control={control}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Element z katalogu</FormLabel>
                                <div className="grid grid-cols-2 gap-2">
                                    <Select onValueChange={(slug) => {
                                        const category = allowedCategories.find(c => c.slug === slug);
                                        setSelectedCategory(category || null);
                                        field.onChange(undefined); // Reset device when category changes
                                        setIsPickerVisible(true); // Open picker when category is selected
                                    }} value={selectedCategory?.slug}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Wybierz kategorię..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allowedCategories.map(c => (
                                                <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        onClick={() => setIsPickerVisible(prev => !prev)}
                                        disabled={!selectedCategory}
                                        className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                    >
                                        <span className="truncate">
                                            {field.value ? deviceCatalog.find(d => d.id === field.value)?.name : "Wybierz urządzenie"}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {isPickerVisible && selectedCategory && (
                        <Command className="rounded-lg border shadow-md">
                            <CommandInput value={searchQuery} onValueChange={setSearchQuery} placeholder="Szukaj w wybranej kategorii..." />
                            <CommandList>
                                <ScrollArea className="h-64">
                                    <CommandEmpty>Nie znaleziono.</CommandEmpty>
                                    {filteredCatalogItems.map((device) => (
                                        <CommandItem
                                            value={device.id}
                                            key={device.id}
                                            onSelect={() => {
                                                setValue("deviceId", device.id);
                                                setIsPickerVisible(false);
                                                setSearchQuery('');
                                            }}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4", device.id === watchedDeviceId ? "opacity-100" : "opacity-0")} />
                                            {device.name}
                                        </CommandItem>
                                    ))}
                                </ScrollArea>
                            </CommandList>
                        </Command>
                    )}
                </div>
            )}

            {source === 'manual' && (
                <>
                 <FormField control={control} name="manualName" render={({ field }) => (<FormItem><FormLabel>Nazwa obciążenia</FormLabel><FormControl><Input placeholder="np. Baner reklamowy" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                 <FormField control={control} name="manualWeight" render={({ field }) => (<FormItem><FormLabel>Waga jednostkowa (kg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                </>
            )}

            <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="quantity" render={({ field }) => (<FormItem><FormLabel>{isCable ? 'Długość (m)' : 'Ilość'}</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="riggingWeight" render={({ field }) => (<FormItem><FormLabel>Dodatkowa waga riggingu (kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

             <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="loadType" render={({ field }) => (<FormItem><FormLabel>Typ obciążenia</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="point">Punktowe</SelectItem><SelectItem value="udl">Rozłożone (UDL)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                {watchedLoadType === 'point' && (
                  <FormField control={control} name="position" render={({ field }) => (<FormItem><FormLabel>Pozycja na kracie (m)</FormLabel><FormControl><Input type="number" step="0.1" max={trussLength} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                )}
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Anuluj</Button>
              <Button type="submit">Zapisz</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
