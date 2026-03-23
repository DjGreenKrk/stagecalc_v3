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

const NOMINAL_VOLTAGE = 230;

const getBaseFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('devices.validation.name_required')),
  manufacturer: z.string().min(1, t('devices.validation.manufacturer_required')),
  subcategory: z.string().optional(),
  powerW: z.coerce.number().min(0, t('devices.validation.power_positive')),
  currentA: z.coerce.number().min(0, t('devices.validation.current_positive')),
  weightKg: z.coerce.number().min(0, t('devices.validation.weight_positive')),
  ipRating: z.string().optional(),
  notes: z.string().optional(),
});

type BaseDeviceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device;
  onSave: (device: Omit<Device, 'category' | 'id'> & { id?: string }) => void;
  category: DeviceCategory;
};

export function BaseDeviceForm({
  open,
  onOpenChange,
  device,
  onSave,
  category,
}: BaseDeviceFormProps) {
  const { t } = useTranslation();
  const formSchema = getBaseFormSchema(t);

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
    },
  });

  const { watch, setValue, control, reset } = form;
  const powerW = watch('powerW');
  const currentA = watch('currentA');
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
        reset(device);
      } else {
        reset({
          name: '',
          manufacturer: '',
          subcategory: '',
          powerW: 0,
          currentA: 0,
          weightKg: 0,
          ipRating: '',
          notes: '',
        });
      }
      lastChanged.current = null;
    }
  }, [device, open, reset, category]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const dataToSave = {
      ...values,
      id: device?.id,
    };
    onSave(dataToSave as any);
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('devices.table.name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('devices.name_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('devices.table.manufacturer')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('devices.manufacturer_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {category.subcategories && category.subcategories.length > 0 && (
              <FormField
                control={control}
                name="subcategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Podkategoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Wybierz podkategorię..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {category.subcategories?.map(sub => (
                          <SelectItem key={sub.key} value={sub.key}>{t(`devices.subcategories.${sub.key}`, sub.label)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={control}
                name="powerW"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('devices.table.power')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => {
                          lastChanged.current = 'power';
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="currentA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('devices.table.current')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          lastChanged.current = 'current';
                          field.onChange(e);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('devices.table.weight')}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name="ipRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('devices.ip_rating')}</FormLabel>
                  <FormControl>
                    <Input placeholder="np. IP20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.notes')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('devices.notes_placeholder')} {...field} />
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
