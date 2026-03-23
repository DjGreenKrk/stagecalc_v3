
'use client';

import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { Device, DeviceCategory } from '@/lib/definitions';
import { useTranslation } from '@/context/language-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';

const loadChartEntrySchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  length: z.coerce.number().min(0),
  pointLoad: z.coerce.number().min(0),
  deflectionPointLoad: z.coerce.number().optional(),
  distribLoad: z.coerce.number().min(0),
  deflectionDistribLoad: z.coerce.number().optional(),
});

const weightChartEntrySchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  length: z.coerce.number().min(0),
  weight: z.coerce.number().min(0),
});

const getRiggingFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('devices.validation.name_required')),
  manufacturer: z.string().min(1, t('devices.validation.manufacturer_required')),
  subcategory: z.string().optional(),
  powerW: z.coerce.number().optional(),
  currentA: z.coerce.number().optional(),
  weightKg: z.coerce.number().min(0, t('devices.validation.weight_positive')),
  ipRating: z.string().optional(),
  notes: z.string().optional(),

  trussType: z.enum(['duo', 'trio', 'quatro']).optional(),
  height: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  wallThickness: z.coerce.number().optional(),
  loadChart: z.array(loadChartEntrySchema).optional(),
  weightChart: z.array(weightChartEntrySchema).optional(),

  wll: z.coerce.number().optional(),
  speed: z.coerce.number().optional(),
  chainLength: z.coerce.number().optional(),
  controlType: z.enum(['D8', 'D8+', 'C1']).optional(),
  clampDiameterRange: z.string().optional(),
});

type RiggingDeviceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Omit<Device, 'id'> & { id?: string };
  onSave: (device: Omit<Device, 'category' | 'id'> & { id?: string }) => void;
  category: DeviceCategory;
};

export function RiggingDeviceForm({
  open,
  onOpenChange,
  device,
  onSave,
  category,
}: RiggingDeviceFormProps) {
  const { t } = useTranslation();
  const formSchema = getRiggingFormSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const { watch, control, reset } = form;
  const subcategory = watch('subcategory');

  const { fields: loadChartFields, append: appendLoadChart, remove: removeLoadChart } = useFieldArray({
    control,
    name: "loadChart",
  });

  const { fields: weightChartFields, append: appendWeightChart, remove: removeWeightChart } = useFieldArray({
    control,
    name: "weightChart",
  });

  useEffect(() => {
    if (open) {
      const defaultValues = {
        name: '',
        manufacturer: '',
        subcategory: category?.subcategories?.[0]?.key || '',
        powerW: 0,
        currentA: 0,
        weightKg: 0,
        ipRating: '',
        notes: '',
        trussType: undefined,
        height: undefined,
        width: undefined,
        wallThickness: undefined,
        loadChart: [],
        weightChart: [],
        wll: undefined,
        speed: undefined,
        chainLength: undefined,
        controlType: undefined,
        clampDiameterRange: '',
      };
      if (device) {
        reset({ ...defaultValues, ...device });
      } else {
        reset(defaultValues);
      }
    }
  }, [device, open, reset, category]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const sanitizedValues = JSON.parse(JSON.stringify(values));
    let dataToSave = { ...sanitizedValues, id: device?.id };

    if (dataToSave.subcategory === 'trusses') {
      if (dataToSave.weightChart && dataToSave.weightChart.length > 0) {
        dataToSave.weightKg = dataToSave.weightChart[0].weight || 0;
      } else {
        dataToSave.weightKg = 0;
      }
    }

    onSave(dataToSave as any);
  };

  const renderTrussFields = () => (
    <>
      <Separator className="my-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={control} name="trussType" render={({ field }) => (<FormItem><FormLabel>Typ</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="duo">DUO</SelectItem><SelectItem value="trio">TRIO</SelectItem><SelectItem value="quatro">QUATRO</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={control} name="wallThickness" render={({ field }) => (<FormItem><FormLabel>Grubość ścianki (mm)</FormLabel><FormControl><Input type="number" placeholder="2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="height" render={({ field }) => (<FormItem><FormLabel>Wysokość (mm)</FormLabel><FormControl><Input type="number" placeholder="290" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="width" render={({ field }) => (<FormItem><FormLabel>Szerokość (mm)</FormLabel><FormControl><Input type="number" placeholder="290" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      </div>

      <div className="space-y-2 mt-4">
        <FormLabel>Tabela wag</FormLabel>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Długość (m)</TableHead>
                <TableHead>Waga (kg)</TableHead>
                <TableHead className="w-12"><span className="sr-only">Usuń</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weightChartFields.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell><FormField control={control} name={`weightChart.${index}.length`} render={({ field }) => <Input type="number" {...field} />} /></TableCell>
                  <TableCell><FormField control={control} name={`weightChart.${index}.weight`} render={({ field }) => <Input type="number" step="0.1" {...field} />} /></TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeWeightChart(index)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => appendWeightChart({ id: crypto.randomUUID(), length: 0, weight: 0 })}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj wagę dla długości
        </Button>
      </div>

      <div className="space-y-2 mt-4">
        <FormLabel>Tabela nośności</FormLabel>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Długość (m)</TableHead>
                <TableHead>Obc. punkt. (kg)</TableHead>
                <TableHead>Ugięcie (mm)</TableHead>
                <TableHead>Obc. rozł. (kg/m)</TableHead>
                <TableHead>Ugięcie (mm)</TableHead>
                <TableHead className="w-12"><span className="sr-only">Usuń</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadChartFields.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell><FormField control={control} name={`loadChart.${index}.length`} render={({ field }) => <Input type="number" {...field} />} /></TableCell>
                  <TableCell><FormField control={control} name={`loadChart.${index}.pointLoad`} render={({ field }) => <Input type="number" {...field} />} /></TableCell>
                  <TableCell><FormField control={control} name={`loadChart.${index}.deflectionPointLoad`} render={({ field }) => <Input type="number" {...field} value={field.value ?? ''} />} /></TableCell>
                  <TableCell><FormField control={control} name={`loadChart.${index}.distribLoad`} render={({ field }) => <Input type="number" {...field} />} /></TableCell>
                  <TableCell><FormField control={control} name={`loadChart.${index}.deflectionDistribLoad`} render={({ field }) => <Input type="number" {...field} value={field.value ?? ''} />} /></TableCell>
                  <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => removeLoadChart(index)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => appendLoadChart({ id: crypto.randomUUID(), length: 0, pointLoad: 0, distribLoad: 0, deflectionPointLoad: 0, deflectionDistribLoad: 0 })}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Dodaj punkt z tabeli
        </Button>
      </div>
    </>
  );

  const renderHoistFields = () => (
    <>
      <Separator className="my-4" />
      <FormField control={control} name="weightKg" render={({ field }) => (<FormItem><FormLabel>Waga urządzenia (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={control} name="wll" render={({ field }) => (<FormItem><FormLabel>DOR (WLL) [kg]</FormLabel><FormControl><Input type="number" placeholder="500" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="controlType" render={({ field }) => (<FormItem><FormLabel>Klasa bezpieczeństwa</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="D8">D8</SelectItem><SelectItem value="D8+">D8+</SelectItem><SelectItem value="C1">C1</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={control} name="speed" render={({ field }) => (<FormItem><FormLabel>Prędkość (m/min)</FormLabel><FormControl><Input type="number" placeholder="4" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="chainLength" render={({ field }) => (<FormItem><FormLabel>Długość łańcucha (m)</FormLabel><FormControl><Input type="number" placeholder="24" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      </div>
    </>
  );

  const renderHookFields = () => (
    <>
      <Separator className="my-4" />
      <FormField control={control} name="weightKg" render={({ field }) => (<FormItem><FormLabel>Waga (kg)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={control} name="wll" render={({ field }) => (<FormItem><FormLabel>DOR (WLL) [kg]</FormLabel><FormControl><Input type="number" placeholder="1000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="clampDiameterRange" render={({ field }) => (<FormItem><FormLabel>Zakres średnicy</FormLabel><FormControl><Input placeholder="48-51mm" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {device ? t('devices.edit_device') : t('devices.add_device')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.name')}</FormLabel><FormControl><Input placeholder={t('devices.name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.manufacturer')}</FormLabel><FormControl><Input placeholder={t('devices.manufacturer_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            {category.subcategories && category.subcategories.length > 0 && (
              <FormField control={control} name="subcategory" render={({ field }) => (<FormItem><FormLabel>Podkategoria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz podkategorię..." /></SelectTrigger></FormControl><SelectContent>{category.subcategories?.map(sub => (<SelectItem key={sub.key} value={sub.key}>{t(`devices.subcategories.${sub.key}`, sub.label)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}

            {subcategory === 'trusses' && renderTrussFields()}
            {subcategory === 'hoists' && renderHoistFields()}
            {subcategory === 'hooks' && renderHookFields()}

            <Separator className="my-2" />

            <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('common.notes')}</FormLabel><FormControl><Textarea placeholder={t('devices.notes_placeholder')} {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

            <DialogFooter>
              <Button type="submit">{t('common.save_changes')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
