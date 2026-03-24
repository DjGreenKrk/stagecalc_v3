'use client';

import { useEffect, useRef } from 'react';
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
import type { Device, DeviceCategory, DistributionOutput } from '@/lib/definitions';
import { useTranslation } from '@/context/language-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { ConnectorTypes } from '@/lib/definitions';
import { ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { RichTextEditor } from '../ui/rich-text-editor';

const distributionOutputSchema = z.object({
  type: z.string().min(1),
  quantity: z.coerce.number().min(1),
});

const getCablingFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('devices.validation.name_required')),
  manufacturer: z.string().min(1, t('devices.validation.manufacturer_required')),
  subcategory: z.string().optional(),
  powerW: z.coerce.number().optional(),
  currentA: z.coerce.number().optional(),
  weightKg: z.coerce.number().min(0, t('devices.validation.weight_positive')),
  ipRating: z.string().optional(),
  notes: z.string().optional(),

  // Power Cables
  cableType: z.string().optional(),
  crossSection: z.coerce.number().optional(),
  conductorCount: z.coerce.number().optional(),
  
  // Distribution Boxes
  distributionInput: z.string().optional(),
  distributionOutputs: z.array(distributionOutputSchema).optional(),
  mountType: z.array(z.string()).optional(),
  
  // Adapters
  adapterIn: z.string().optional(),
  adapterOut: z.string().optional(),
  isThreePhase: z.boolean().optional(),
});


type CablingDeviceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Omit<Device, 'id'> & { id?: string };
  onSave: (device: Omit<Device, 'id' | 'category'> & { id?: string }) => void;
  category: DeviceCategory;
};

export function CablingDeviceForm({
  open,
  onOpenChange,
  device,
  onSave,
  category,
}: CablingDeviceFormProps) {
  const { t } = useTranslation();
  const formSchema = getCablingFormSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const { watch, control, reset, setValue } = form;
  const subcategory = watch('subcategory');

  const { fields, append, remove } = useFieldArray({
    control,
    name: "distributionOutputs",
  });

  useEffect(() => {
    if (open) {
       const defaultValues = {
        name: '',
        manufacturer: '',
        subcategory: '',
        powerW: 0,
        currentA: 0,
        weightKg: 0,
        ipRating: '',
        notes: '',
        cableType: '',
        crossSection: undefined,
        conductorCount: undefined,
        distributionInput: '',
        distributionOutputs: [],
        mountType: [],
        adapterIn: '',
        adapterOut: '',
        isThreePhase: false,
      };

      if (device) {
        reset({ ...defaultValues, ...device });
      } else {
        reset(defaultValues);
      }
    }
  }, [device, open, reset]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const sanitizedValues = JSON.parse(JSON.stringify(values));
    const dataToSave = { ...sanitizedValues, id: device?.id };
    onSave(dataToSave);
  };
  
  const renderPowerCableFields = () => (
    <>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={control} name="cableType" render={({ field }) => (<FormItem><FormLabel>Typ kabla</FormLabel><FormControl><Input placeholder="np. Schuko, CEE 16A/5P" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={control} name="crossSection" render={({ field }) => (<FormItem><FormLabel>Przekrój (mm²)</FormLabel><FormControl><Input type="number" step="0.5" placeholder="np. 2.5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={control} name="conductorCount" render={({ field }) => (<FormItem><FormLabel>Ilość żył</FormLabel><FormControl><Input type="number" step="1" placeholder="np. 3" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
    </>
  );

  const renderDistributionBoxFields = () => (
      <>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <FormField
              control={control}
              name="distributionInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wejście</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Wybierz wejście..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ConnectorTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
                <FormLabel>Wyjścia</FormLabel>
                <div className="space-y-2">
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <FormField
                        control={control}
                        name={`distributionOutputs.${index}.type`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Typ wyjścia..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ConnectorTypes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`distributionOutputs.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="number" placeholder="Ilość" className="w-20" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                       <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                    </div>
                  ))}
                </div>
                 <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => append({ type: '', quantity: 1 })}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Dodaj wyjście
                </Button>
            </div>
        </div>
        <FormField control={control} name="mountType" render={({ field }) => (<FormItem><FormLabel>Sposób montażu</FormLabel><Select onValueChange={(v) => field.onChange(v.split(','))} value={field.value?.join(',')}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="ground">Stojąca (ground)</SelectItem><SelectItem value="truss">Wisząca (truss)</SelectItem><SelectItem value="rack">Rack</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
    </>
  );
  
  const renderAdapterFields = () => (
     <>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={control} name="adapterIn" render={({ field }) => (<FormItem><FormLabel>Wejście (IN)</FormLabel><FormControl><Input placeholder="np. CEE 32A/5P" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={control} name="adapterOut" render={({ field }) => (<FormItem><FormLabel>Wyjście (OUT)</FormLabel><FormControl><Input placeholder="np. 2x CEE 16A/3P" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <FormField control={control} name="isThreePhase" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Adapter trójfazowy</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
    </>
  );

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
            <div className="grid grid-cols-2 gap-4">
                <FormField control={control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.name')}</FormLabel><FormControl><Input placeholder={t('devices.name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="manufacturer" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.manufacturer')}</FormLabel><FormControl><Input placeholder={t('devices.manufacturer_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            {category.subcategories && category.subcategories.length > 0 && (
              <FormField control={control} name="subcategory" render={({ field }) => (<FormItem><FormLabel>Podkategoria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz podkategorę..." /></SelectTrigger></FormControl><SelectContent>{category.subcategories?.map(sub => (<SelectItem key={sub.key} value={sub.key}>{t(`devices.subcategories.${sub.key}`, sub.label)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={control}
                    name="weightKg"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{subcategory === 'power_cables' ? 'Waga [kg/m]' : t('devices.table.weight')}</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.1" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={control} name="ipRating" render={({ field }) => (<FormItem><FormLabel>{t('devices.ip_rating')}</FormLabel><FormControl><Input placeholder="np. IP44" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            {subcategory === 'power_cables' && renderPowerCableFields()}
            {subcategory === 'distribution_boxes' && renderDistributionBoxFields()}
            {subcategory === 'adapters' && renderAdapterFields()}
            
            <Separator className="my-2"/>

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
