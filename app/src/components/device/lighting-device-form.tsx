
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
import type { Device, DeviceCategory } from '@/lib/definitions';
import { useTranslation } from '@/context/language-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';
import { LightingControlProtocols, LightSourceTypes, StaticLightTypes, ColorSystems } from '@/lib/definitions';

const NOMINAL_VOLTAGE = 230;

const getLightingFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('devices.validation.name_required')),
  manufacturer: z.string().min(1, t('devices.validation.manufacturer_required')),
  subcategory: z.string().optional(),
  powerW: z.coerce.number().min(0, t('devices.validation.power_positive')),
  currentA: z.coerce.number().min(0, t('devices.validation.current_positive')),
  weightKg: z.coerce.number().min(0, t('devices.validation.weight_positive')),
  ipRating: z.string().optional(),
  notes: z.string().optional(),
  // New lighting specific fields
  lightSourceType: z.string().optional(),
  bulbType: z.string().optional(),
  controlProtocols: z.array(z.string()).optional(),
  dmxModes: z.string().optional(),
  zoomRange: z.string().optional(),
  colorSystem: z.string().optional(),
  cameraReady: z.boolean().optional(),
  riggingPoints: z.coerce.number().optional(),
});


type LightingDeviceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device;
  onSave: (device: Omit<Device, 'category' | 'id'> & { id?: string }) => void;
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
    defaultValues: {
      name: '',
      manufacturer: '',
      subcategory: '',
      powerW: 0,
      currentA: 0,
      weightKg: 0,
      ipRating: '',
      notes: '',
      lightSourceType: '',
      bulbType: '',
      controlProtocols: [],
      dmxModes: '',
      zoomRange: '',
      colorSystem: '',
      cameraReady: false,
      riggingPoints: undefined,
    },
  });

  const { watch, setValue, control, reset } = form;
  const powerW = watch('powerW');
  const currentA = watch('currentA');
  const subcategory = watch('subcategory');
  const colorSystem = watch('colorSystem');
  const lastChanged = useRef<'power' | 'current' | null>(null);

  useEffect(() => {
    if (lastChanged.current === 'power') {
      const newCurrent = powerW / NOMINAL_VOLTAGE;
      if (!isNaN(newCurrent) && isFinite(newCurrent)) {
        setValue('currentA', parseFloat(newCurrent.toFixed(2)));
      }
    }
  }, [powerW, setValue]);

  useEffect(() => {
    if (lastChanged.current === 'current') {
      const newPower = currentA * NOMINAL_VOLTAGE;
      if (!isNaN(newPower) && isFinite(newPower)) {
        setValue('powerW', parseFloat(newPower.toFixed(0)));
      }
    }
  }, [currentA, setValue]);

  useEffect(() => {
    if (open) {
      if (device) {
        reset({
          ...device,
          ipRating: device.ipRating || '',
          notes: device.notes || '',
          subcategory: device.subcategory || '',
          lightSourceType: device.lightSourceType || '',
          bulbType: device.bulbType || '',
          dmxModes: device.dmxModes || '',
          zoomRange: device.zoomRange || '',
          colorSystem: device.colorSystem || '',
          controlProtocols: device.controlProtocols || [],
          cameraReady: device.cameraReady || false,
          riggingPoints: device.riggingPoints,
        });
      } else {
        reset({
          name: '', manufacturer: '', subcategory: '',
          powerW: 0, currentA: 0, weightKg: 0,
          ipRating: '', notes: '', lightSourceType: '', bulbType: '',
          controlProtocols: [], dmxModes: '', zoomRange: '',
          colorSystem: '', cameraReady: false,
          riggingPoints: undefined,
        });
      }
      lastChanged.current = null;
    }
  }, [device, open, reset]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const dataToSave = { ...values, id: device?.id };
    onSave(dataToSave as any);
    onOpenChange(false);
  };

  const currentLightSourceTypes = subcategory === 'moving_heads' ? LightSourceTypes : StaticLightTypes;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {device ? t('devices.edit_device') : t('devices.add_device')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.name')}</FormLabel><FormControl><Input placeholder="np. Mega Beam 3000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.manufacturer')}</FormLabel><FormControl><Input placeholder="np. Pro Light Co." {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            {category.subcategories && category.subcategories.length > 0 && (
              <FormField control={control} name="subcategory" render={({ field }) => (<FormItem><FormLabel>Podkategoria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz podkategorię..." /></SelectTrigger></FormControl><SelectContent>{category.subcategories?.map(sub => (<SelectItem key={sub.key} value={sub.key}>{t(`devices.subcategories.${sub.key}`, sub.label)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}

            {(subcategory === 'moving_heads' || subcategory === 'static_lighting') && (
              <FormField control={control} name="lightSourceType" render={({ field }) => (<FormItem><FormLabel>Typ urządzenia</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz typ..." /></SelectTrigger></FormControl><SelectContent>{currentLightSourceTypes.map(type => (<SelectItem key={type} value={type}>{type}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}

            <Separator className="my-2" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={control} name="powerW" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.power')}</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => { lastChanged.current = 'power'; field.onChange(e); }} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="currentA" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.current')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={(e) => { lastChanged.current = 'current'; field.onChange(e); }} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="weightKg" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.weight')}</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={control}
                name="riggingPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('devices.rigging_points')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="np. 2" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={control} name="ipRating" render={({ field }) => (<FormItem><FormLabel>{t('devices.ip_rating')}</FormLabel><FormControl><Input placeholder="np. IP20 lub IP65" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              {(subcategory === 'moving_heads' || subcategory === 'static_lighting') && (
                <FormField control={control} name="colorSystem" render={({ field }) => (<FormItem><FormLabel>System Koloru</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz system..." /></SelectTrigger></FormControl><SelectContent>{ColorSystems.map(cs => (<SelectItem key={cs} value={cs}>{cs}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              )}
            </div>

            {(colorSystem === 'Discharge' || colorSystem === 'Tungsten') && (
              <FormField control={control} name="bulbType" render={({ field }) => (<FormItem><FormLabel>Rodzaj żarówki</FormLabel><FormControl><Input placeholder="np. HMI 575, MSR 700" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
            )}

            {(subcategory === 'moving_heads' || subcategory === 'static_lighting') && (
              <>
                <Separator className="my-2" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={control} name="dmxModes" render={({ field }) => (<FormItem><FormLabel>Tryby DMX</FormLabel><FormControl><Input placeholder="np. 16/24/32" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={control} name="zoomRange" render={({ field }) => (<FormItem><FormLabel>Zakres Zoom / Kąt</FormLabel><FormControl><Input placeholder="np. 10-40 lub 25" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </>
            )}

            <Separator className="my-2" />

            <FormField control={control} name="controlProtocols" render={() => (
              <FormItem>
                <FormLabel>Protokoły sterowania</FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {LightingControlProtocols.map((item) => (
                    <FormField key={item} control={control} name="controlProtocols" render={({ field }) => {
                      const fieldValue = Array.isArray(field.value) ? field.value : [];
                      return (<FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={fieldValue.includes(item)} onCheckedChange={(checked) => { return checked ? field.onChange([...fieldValue, item]) : field.onChange(fieldValue.filter((value) => value !== item)) }} /></FormControl><FormLabel className="font-normal">{item}</FormLabel></FormItem>)
                    }} />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
            />

            {(subcategory === 'moving_heads' || subcategory === 'static_lighting') && (
              <FormField control={control} name="cameraReady" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Nadaje się do pracy z kamerą</FormLabel>
                    <FormMessage />
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )} />
            )}

            <FormField control={control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('common.notes')}</FormLabel><FormControl><Textarea placeholder={t('devices.notes_placeholder')} {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />

            <DialogFooter>
              <Button type="submit">{t('common.save_changes')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
