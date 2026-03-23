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
import { Switch } from '../ui/switch';
import { Checkbox } from '../ui/checkbox';

const NOMINAL_VOLTAGE = 230;

const getMultimediaFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('devices.validation.name_required')),
  manufacturer: z.string().min(1, t('devices.validation.manufacturer_required')),
  subcategory: z.string().optional(),
  powerW: z.coerce.number().min(0, t('devices.validation.power_positive')),
  currentA: z.coerce.number().min(0, t('devices.validation.current_positive')),
  weightKg: z.coerce.number().min(0, t('devices.validation.weight_positive')),
  ipRating: z.string().optional(),
  notes: z.string().optional(),

  // Projector
  technology: z.enum(['DLP', 'LCD', 'LCoS']).optional(),
  brightness: z.coerce.number().optional(),
  nativeResolution: z.string().optional(),
  throwRatio: z.string().optional(),
  signalInputs: z.array(z.string()).optional(),
  lensShift: z.boolean().optional(),
  interchangeableLenses: z.boolean().optional(),
  orientation: z.array(z.string()).optional(),

  // Projection Screen
  screenType: z.enum(['ramowy', 'elektryczny', 'tripod', 'fastfold']).optional(),
  screenFormat: z.enum(['16:9', '16:10', '4:3', 'custom']).optional(),
  screenSize: z.string().optional(),
  screenGain: z.coerce.number().optional(),
  screenProjection: z.enum(['front', 'rear', 'dual']).optional(),

  // TV
  vesa: z.string().optional(),

  // LED Screen
  pixelPitch: z.coerce.number().optional(),
  moduleResolution: z.string().optional(),
  ledPowerAvg: z.coerce.number().optional(),
  ledPowerType: z.enum(['230V', '400V']).optional(),
  isIndoor: z.boolean().optional(),
  maxModulesPerCircuit: z.coerce.number().optional(),
  maxModulesPerSignalPath: z.coerce.number().optional(),

  // Signal distribution
  distributionType: z.enum(['processor', 'scaler', 'switcher', 'splitter', 'converter']).optional(),
  inputsOutputs: z.string().optional(),
  supportedResolutions: z.string().optional(),
  latency: z.string().optional(),
});

type MultimediaDeviceFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Omit<Device, 'id'> & { id?: string };
  onSave: (device: Omit<Device, 'id' | 'category'> & { id?: string }) => void;
  category: DeviceCategory;
};

const signalInputOptions = ["HDMI", "SDI", "HDBaseT", "DisplayPort", "DVI", "VGA"];
const orientationOptions = ["front", "rear", "ceiling", "portrait", "landscape"];

export function MultimediaDeviceForm({
  open,
  onOpenChange,
  device,
  onSave,
  category,
}: MultimediaDeviceFormProps) {
  const { t } = useTranslation();
  const formSchema = getMultimediaFormSchema(t);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const { watch, setValue, control, reset } = form;
  const powerW = watch('powerW');
  const currentA = watch('currentA');
  const subcategory = watch('subcategory');
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
      const defaultValues = {
        name: '', manufacturer: '', subcategory: '',
        powerW: 0, currentA: 0, weightKg: 0, ipRating: '', notes: '',
        technology: undefined, brightness: undefined, nativeResolution: '', throwRatio: '',
        signalInputs: [], lensShift: false, interchangeableLenses: false, orientation: [],
        screenType: undefined, screenFormat: undefined, screenSize: '', screenGain: undefined, screenProjection: undefined,
        vesa: '',
        pixelPitch: undefined, moduleResolution: '', ledPowerAvg: undefined,
        ledPowerType: undefined, isIndoor: true,
        distributionType: undefined, inputsOutputs: '', supportedResolutions: '', latency: '',
        maxModulesPerCircuit: undefined, maxModulesPerSignalPath: undefined,
      };
      
      if (device) {
        reset({ ...defaultValues, ...device });
      } else {
        reset(defaultValues);
      }
      lastChanged.current = null;
    }
  }, [device, open, reset]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const sanitizedValues = JSON.parse(JSON.stringify(values));
    const dataToSave = { ...sanitizedValues, id: device?.id };
    onSave(dataToSave);
  };
  
  const renderProjectorFields = () => (
    <>
      <Separator className="my-4" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField control={control} name="technology" render={({ field }) => (<FormItem><FormLabel>Technologia</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="DLP">DLP</SelectItem><SelectItem value="LCD">LCD</SelectItem><SelectItem value="LCoS">LCoS</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={control} name="brightness" render={({ field }) => (<FormItem><FormLabel>Jasność (ANSI lm)</FormLabel><FormControl><Input type="number" placeholder="5000" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="nativeResolution" render={({ field }) => (<FormItem><FormLabel>Rozdzielczość natywna</FormLabel><FormControl><Input placeholder="1920x1080" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      </div>
      <FormField control={control} name="throwRatio" render={({ field }) => (<FormItem><FormLabel>Współczynnik rzutu (throw ratio)</FormLabel><FormControl><Input placeholder="np. 1.2-1.8" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={control} name="signalInputs" render={() => (
        <FormItem>
            <FormLabel>Wejścia sygnałowe</FormLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {signalInputOptions.map((item) => (
                <FormField key={item} control={control} name="signalInputs" render={({ field }) => (<FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item))}} /></FormControl><FormLabel className="font-normal">{item}</FormLabel></FormItem>)} />
            ))}
            </div><FormMessage />
        </FormItem>
        )}
      />
      <div className="flex space-x-4">
        <FormField control={control} name="lensShift" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1"><div className="space-y-0.5"><FormLabel>Lens Shift</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
        <FormField control={control} name="interchangeableLenses" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm flex-1"><div className="space-y-0.5"><FormLabel>Wymienne obiektywy</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)}/>
      </div>
    </>
  );

  const renderProjectionScreenFields = () => (
    <>
      <Separator className="my-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={control} name="screenType" render={({ field }) => (<FormItem><FormLabel>Typ ekranu</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="ramowy">Ramowy</SelectItem><SelectItem value="elektryczny">Elektryczny</SelectItem><SelectItem value="tripod">Na statywie (tripod)</SelectItem><SelectItem value="fastfold">Szybki montaż (fastfold)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
        <FormField control={control} name="screenFormat" render={({ field }) => (<FormItem><FormLabel>Format</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="16:9">16:9</SelectItem><SelectItem value="16:10">16:10</SelectItem><SelectItem value="4:3">4:3</SelectItem><SelectItem value="custom">Niestandardowy</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
      </div>
      <FormField control={control} name="screenSize" render={({ field }) => (<FormItem><FormLabel>Przekątna / wymiary [m]</FormLabel><FormControl><Input placeholder='200" lub 4x3m' {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={control} name="screenGain" render={({ field }) => (<FormItem><FormLabel>Gain</FormLabel><FormControl><Input type="number" step="0.1" placeholder="1.0" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="screenProjection" render={({ field }) => (<FormItem><FormLabel>Projekcja</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="front">Przednia (front)</SelectItem><SelectItem value="rear">Tylna (rear)</SelectItem><SelectItem value="dual">Obustronna</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
      </div>
    </>
  );

  const renderTvFields = () => (
    <>
        <Separator className="my-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={control} name="nativeResolution" render={({ field }) => (<FormItem><FormLabel>Rozdzielczość</FormLabel><FormControl><Input placeholder="np. 3840x2160" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={control} name="brightness" render={({ field }) => (<FormItem><FormLabel>Jasność (nity)</FormLabel><FormControl><Input type="number" placeholder="400" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={control} name="vesa" render={({ field }) => (<FormItem><FormLabel>VESA</FormLabel><FormControl><Input placeholder="np. 400x400" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={control} name="orientation" render={() => (
                <FormItem>
                    <FormLabel>Orientacja</FormLabel>
                    <div className="flex gap-4 pt-2">
                    {['portrait', 'landscape'].map((item) => (
                        <FormField key={item} control={control} name="orientation" render={({ field }) => (<FormItem key={item} className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(item)} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), item]) : field.onChange(field.value?.filter((value) => value !== item))}} /></FormControl><FormLabel className="font-normal">{item.charAt(0).toUpperCase() + item.slice(1)}</FormLabel></FormItem>)} />
                    ))}
                    </div><FormMessage />
                </FormItem>
            )}/>
        </div>
    </>
  );

  const renderLedScreenFields = () => (
     <>
      <Separator className="my-4" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField control={control} name="pixelPitch" render={({ field }) => (<FormItem><FormLabel>Pixel pitch</FormLabel><FormControl><Input type="number" step="0.1" placeholder="2.6" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="moduleResolution" render={({ field }) => (<FormItem><FormLabel>Rozdzielczość modułu</FormLabel><FormControl><Input placeholder="np. 128x128" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="brightness" render={({ field }) => (<FormItem><FormLabel>Jasność (nity)</FormLabel><FormControl><Input type="number" placeholder="1000" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={control} name="ledPowerAvg" render={({ field }) => (<FormItem><FormLabel>Pobór mocy (śr.) [W]</FormLabel><FormControl><Input type="number" placeholder="150" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField control={control} name="maxModulesPerCircuit" render={({ field }) => (<FormItem><FormLabel>Maks. modułów / obwód zasilający</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name="maxModulesPerSignalPath" render={({ field }) => (<FormItem><FormLabel>Maks. modułów / ścieżka sygnałowa</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      </div>
      <FormField control={control} name="isIndoor" render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
          <div className="space-y-0.5"><FormLabel>Urządzenie wewnętrzne (indoor)</FormLabel></div>
          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
        </FormItem>
      )}/>
    </>
  );
  
  const renderSignalDistributionFields = () => (
     <>
      <Separator className="my-4" />
      <FormField control={control} name="distributionType" render={({ field }) => (<FormItem><FormLabel>Typ urządzenia</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="processor">Procesor</SelectItem><SelectItem value="scaler">Skaler</SelectItem><SelectItem value="switcher">Switcher</SelectItem><SelectItem value="splitter">Splitter</SelectItem><SelectItem value="converter">Konwerter</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
      <FormField control={control} name="inputsOutputs" render={({ field }) => (<FormItem><FormLabel>Wejścia / Wyjścia</FormLabel><FormControl><Input placeholder="np. 4x HDMI, 2x SDI" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={control} name="supportedResolutions" render={({ field }) => (<FormItem><FormLabel>Obsługiwane rozdzielczości</FormLabel><FormControl><Input placeholder="np. do 4K@60Hz" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
      <FormField control={control} name="latency" render={({ field }) => (<FormItem><FormLabel>Opóźnienie (latency)</FormLabel><FormControl><Input placeholder="np. < 1 frame" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
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
              <FormField control={control} name="subcategory" render={({ field }) => (<FormItem><FormLabel>Podkategoria</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz podkategorię..." /></SelectTrigger></FormControl><SelectContent>{category.subcategories?.map(sub => (<SelectItem key={sub.key} value={sub.key}>{t(`devices.subcategories.${sub.key}`, sub.label)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
            )}
            
            <Separator className="my-2"/>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={control} name="powerW" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.power')}</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => { lastChanged.current = 'power'; field.onChange(e); }} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="currentA" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.current')}</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={(e) => { lastChanged.current = 'current'; field.onChange(e); }} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="weightKg" render={({ field }) => (<FormItem><FormLabel>{t('devices.table.weight')}</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <FormField control={control} name="ipRating" render={({ field }) => (<FormItem><FormLabel>{t('devices.ip_rating')}</FormLabel><FormControl><Input placeholder="np. IP20" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />

            {subcategory === 'projectors' && renderProjectorFields()}
            {subcategory === 'projection_screens' && renderProjectionScreenFields()}
            {subcategory === 'tvs' && renderTvFields()}
            {subcategory === 'led_screens' && renderLedScreenFields()}
            {subcategory === 'signal_distribution' && renderSignalDistributionFields()}
            
            <Separator className="my-2"/>
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
