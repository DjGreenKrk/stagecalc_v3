'use client';

import { useEffect, useMemo, useRef } from 'react';
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
import type { Device, DeviceCategory } from '@/lib/definitions';
import { useTranslation } from '@/context/language-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { SoundProtocols, SoundPowerTypes, SoundMountTypes, SoundPowerConnectors } from '@/lib/definitions';
import { RichTextEditor } from '../ui/rich-text-editor';

const NOMINAL_VOLTAGE = 230;

const getSoundFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('devices.validation.name_required')),
  manufacturer: z.string().min(1, t('devices.validation.manufacturer_required')),
  subcategory: z.string().optional(),
  powerW: z.coerce.number().min(0, t('devices.validation.power_positive')),
  currentA: z.coerce.number().min(0, t('devices.validation.current_positive')),
  avgPowerW: z.coerce.number().optional(),
  avgCurrentA: z.coerce.number().optional(),
  weightKg: z.coerce.number().min(0, t('devices.validation.weight_positive')),
  ipRating: z.string().optional(),
  spl: z.coerce.number().optional(),
  notes: z.string().optional(),
  powerType: z.enum(['active', 'passive']).optional(),
  protocols: z.array(z.string()).optional(),
  mountType: z.array(z.string()).optional(),
  powerConnectorsIn: z.array(z.string()).optional(),
});


type SoundDeviceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device;
  onSave: (device: Omit<Device, 'category' | 'id'> & { id?: string }) => void;
  category: DeviceCategory;
};

export function SoundDeviceForm({
  open,
  onOpenChange,
  device,
  onSave,
  category,
}: SoundDeviceFormProps) {
  const { t } = useTranslation();
  const formSchema = getSoundFormSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      manufacturer: '',
      subcategory: '',
      powerW: 0,
      currentA: 0,
      avgPowerW: undefined,
      avgCurrentA: undefined,
      weightKg: 0,
      ipRating: '',
      spl: undefined,
      notes: '',
      powerType: undefined,
      protocols: [],
      mountType: [],
      powerConnectorsIn: [],
    },
  });

  const { watch, setValue, control, reset } = form;
  const lastChanged = useRef<'power' | 'current' | null>(null);
  const avgLastChanged = useRef<'power' | 'current' | null>(null);

  const powerW = watch('powerW');
  const currentA = watch('currentA');
  const avgPowerW = watch('avgPowerW');
  const avgCurrentA = watch('avgCurrentA');
  const powerType = watch('powerType');
  const subcategory = watch('subcategory');

  const mountTypesForSubcategory = useMemo(() => {
    if (subcategory === 'sound_controllers') {
      return ['Truss Clamp', 'Rack Mount', 'Tabletop'];
    }
    return SoundMountTypes;
  }, [subcategory]);

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
    if (avgPowerW && avgLastChanged.current === 'power') {
      const newCurrent = avgPowerW / NOMINAL_VOLTAGE;
      if (!isNaN(newCurrent) && isFinite(newCurrent)) {
        setValue('avgCurrentA', parseFloat(newCurrent.toFixed(2)));
      }
    }
  }, [avgPowerW, setValue]);

  useEffect(() => {
    if (avgCurrentA && avgLastChanged.current === 'current') {
      const newPower = avgCurrentA * NOMINAL_VOLTAGE;
      if (!isNaN(newPower) && isFinite(newPower)) {
        setValue('avgPowerW', parseFloat(newPower.toFixed(0)));
      }
    }
  }, [avgCurrentA, setValue]);

  useEffect(() => {
    if (open) {
      if (device) {
        reset({
          ...device,
          spl: device.spl ?? undefined,
          avgPowerW: device.avgPowerW ?? undefined,
          avgCurrentA: device.avgCurrentA ?? undefined,
          powerType: device.powerType || undefined,
          protocols: Array.isArray(device.protocols) ? device.protocols : (device.protocols ? [device.protocols] : []),
          mountType: Array.isArray(device.mountType) ? device.mountType : (device.mountType ? [device.mountType] : []),
          powerConnectorsIn: Array.isArray(device.powerConnectorsIn) ? device.powerConnectorsIn : (device.powerConnectorsIn ? [device.powerConnectorsIn] : []),
        });
      } else {
        reset({
          name: '', manufacturer: '', subcategory: '',
          powerW: 0, currentA: 0, avgPowerW: undefined, avgCurrentA: undefined,
          weightKg: 0, ipRating: '', spl: undefined, notes: '',
          powerType: undefined, protocols: [], mountType: [], powerConnectorsIn: [],
        });
      }
      lastChanged.current = null;
      avgLastChanged.current = null;
    }
  }, [device, open, reset]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const dataToSave = { ...values, id: device?.id! };

    // Sanitize data before saving to Firestore
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key as keyof typeof dataToSave] === undefined) {
        delete dataToSave[key as keyof typeof dataToSave];
      }
    });

    onSave(dataToSave as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {device ? t('devices.edit_device') : t('devices.add_device')}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.name')}</FormLabel><FormControl><Input placeholder={t('devices.name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.manufacturer')}</FormLabel><FormControl><Input placeholder={t('devices.manufacturer_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            {category.subcategories && category.subcategories.length > 0 && (
              <FormField control={control} name="subcategory" render={({ field }) => (<FormItem><FormLabel>Podkategoria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz podkategorię..." /></SelectTrigger></FormControl><SelectContent>{category.subcategories?.map(sub => (<SelectItem key={sub.key} value={sub.key}>{t(`devices.subcategories.${sub.key}`, sub.label)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}

            <Separator className="my-2" />
            <FormLabel>Pobór mocy (maksymalny)</FormLabel>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={control} name="powerW" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.power')}</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => { lastChanged.current = 'power'; field.onChange(e); }} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="currentA" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.current')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={(e) => { lastChanged.current = 'current'; field.onChange(e); }} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            {subcategory !== 'sound_controllers' && (
              <>
                <Separator className="my-2" />
                <FormLabel>Pobór mocy (średni, opcjonalnie)</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={control} name="avgPowerW" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.power')}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={(e) => { avgLastChanged.current = 'power'; field.onChange(e); }} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={control} name="avgCurrentA" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.current')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} value={field.value ?? ''} onChange={(e) => { avgLastChanged.current = 'current'; field.onChange(e); }} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </>
            )}


            <Separator className="my-2" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={control} name="weightKg" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.weight')}</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="ipRating" render={({ field }) => (<FormItem><FormLabel>{t('devices.ip_rating')}</FormLabel><FormControl><Input placeholder="np. IP20" {...field} /></FormControl><FormMessage /></FormItem>)} />
              {subcategory !== 'sound_controllers' && (
                <FormField control={control} name="spl" render={({ field }) => (<FormItem><FormLabel>Max SPL (dB)</FormLabel><FormControl><Input type="number" placeholder="131" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              )}
            </div>

            <Separator className="my-2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <FormField control={control} name="powerType" render={({ field }) => (<FormItem><FormLabel>Typ zasilania</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz typ..." /></SelectTrigger></FormControl><SelectContent>{SoundPowerTypes.map(pt => (<SelectItem key={pt.id} value={pt.id}>{pt.label}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
              {subcategory !== 'sound_controllers' && (
                <FormField
                  control={control}
                  name="mountType"
                  render={() => (
                    <FormItem>
                      <FormLabel>Sposób montażu</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {mountTypesForSubcategory.map((item) => (
                          <FormField
                            key={item}
                            control={control}
                            name="mountType"
                            render={({ field }) => {
                              const fieldValue = Array.isArray(field.value) ? field.value : [];
                              return (
                                <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl><Checkbox checked={fieldValue.includes(item)} onCheckedChange={(checked) => {
                                    return checked ? field.onChange([...fieldValue, item]) : field.onChange(fieldValue.filter((value) => value !== item))
                                  }} /></FormControl>
                                  <FormLabel className="font-normal">{item}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {subcategory === 'sound_controllers' && (
                <FormField
                  control={control}
                  name="mountType"
                  render={() => (
                    <FormItem>
                      <FormLabel>Sposób montażu</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {mountTypesForSubcategory.map((item) => (
                          <FormField
                            key={item}
                            control={control}
                            name="mountType"
                            render={({ field }) => {
                              const fieldValue = Array.isArray(field.value) ? field.value : [];
                              return (
                                <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl><Checkbox checked={fieldValue.includes(item)} onCheckedChange={(checked) => {
                                    return checked ? field.onChange([...fieldValue, item]) : field.onChange(fieldValue.filter((value) => value !== item))
                                  }} /></FormControl>
                                  <FormLabel className="font-normal">{item}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator className="my-2" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 items-start">
              <FormField
                control={control}
                name="protocols"
                render={() => (
                  <FormItem>
                    <FormLabel>Protokoły sygnałowe</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {SoundProtocols.map((item) => (
                        <FormField
                          key={item}
                          control={control}
                          name="protocols"
                          render={({ field }) => {
                            const fieldValue = Array.isArray(field.value) ? field.value : [];
                            return (
                              <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl><Checkbox checked={fieldValue.includes(item)} onCheckedChange={(checked) => {
                                  return checked ? field.onChange([...fieldValue, item]) : field.onChange(fieldValue.filter((value) => value !== item))
                                }} /></FormControl>
                                <FormLabel className="font-normal">{item}</FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {powerType === 'active' && (
                <FormField
                  control={control}
                  name="powerConnectorsIn"
                  render={() => (
                    <FormItem>
                      <FormLabel>Złącza zasilania</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {SoundPowerConnectors.map((item) => (
                          <FormField
                            key={item}
                            control={control}
                            name="powerConnectorsIn"
                            render={({ field }) => {
                              const fieldValue = Array.isArray(field.value) ? field.value : [];
                              return (
                                <FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl><Checkbox checked={fieldValue.includes(item)} onCheckedChange={(checked) => {
                                    return checked ? field.onChange([item]) : field.onChange([])
                                  }} /></FormControl>
                                  <FormLabel className="font-normal">{item}</FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.notes')}</FormLabel>
                  <FormControl>
                    <RichTextEditor 
                      value={field.value || ''} 
                      onChange={field.onChange} 
                      placeholder={t('devices.notes_placeholder')} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">{t('common.save_changes')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
