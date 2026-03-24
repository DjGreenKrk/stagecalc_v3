
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Device } from '@/lib/definitions';
import { Badge } from '../ui/badge';
import { useTranslation } from '@/context/language-context';
import { Separator } from '../ui/separator';
import { Camera } from 'lucide-react';
import { connectorTypeConfig } from '@/lib/definitions';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import DOMPurify from 'dompurify';


type DeviceDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: Device;
};

const DetailItem = ({ label, value, sublabel }: { label: string; value: string | number | boolean | undefined | null, sublabel?: string }) => {
  if (!value && value !== 0 && value !== false) return null;

  const renderValue = () => {
    if (typeof value === 'boolean') {
      return value ? 'Tak' : 'Nie';
    }
    return `${value} ${sublabel || ''}`;
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{renderValue()}</p>
    </div>
  );
};

const chartConfig = {
  pointLoad: {
    label: 'Obc. punktowe (kg)',
    color: 'hsl(var(--chart-1))',
  },
  distribLoad: {
    label: 'Obc. rozł. (kg/m)',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

const weightChartConfig = {
  weight: {
    label: 'Waga (kg)',
    color: 'hsl(var(--chart-3))',
  },
} satisfies ChartConfig;


export function DeviceDetailsDialog({
  open,
  onOpenChange,
  device,
}: DeviceDetailsDialogProps) {
  const { t } = useTranslation();
  if (!device) return null;

  const mountTypes = Array.isArray(device.mountType)
    ? device.mountType
    : typeof device.mountType === 'string'
    ? [device.mountType]
    : [];
    
  const controlProtocols = Array.isArray(device.controlProtocols)
    ? device.controlProtocols
    : typeof device.controlProtocols === 'string'
    ? [device.controlProtocols]
    : [];
  
  const signalInputs = Array.isArray(device.signalInputs)
    ? device.signalInputs
    : typeof device.signalInputs === 'string'
    ? [device.signalInputs]
    : [];
    
  const distributionOutputs = device.distributionOutputs || [];
  
  const calculateMaxPower = (connectorType?: string) => {
    if (!connectorType || !connectorTypeConfig[connectorType]) return null;

    const config = connectorTypeConfig[connectorType];
    const voltage = config.phases === 1 ? 230 : 400;
    const power = voltage * config.maxCurrentA * (config.phases === 3 ? Math.sqrt(3) : 1);
    
    return (power / 1000).toFixed(1);
  };
  
  const maxPower = calculateMaxPower(device.distributionInput);
  
  const chartData = (device.loadChart || []).sort((a, b) => a.length - b.length);
  const weightChartData = (device.weightChart || []).sort((a, b) => a.length - b.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{device.name}</DialogTitle>
           {device.subcategory && <Badge variant="outline" className="w-fit">{t(`devices.subcategories.${device.subcategory}`, device.subcategory)}</Badge>}
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-2 gap-4">
            <DetailItem label={t('devices.table.manufacturer')} value={device.manufacturer} />
            <DetailItem label={t('devices.ip_rating')} value={device.ipRating} />
          </div>
          
          {device.category === 'Oświetlenie' && (
             <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Typ" value={device.lightSourceType} />
                <DetailItem label="System koloru" value={device.colorSystem} />
                {(device.colorSystem === 'Discharge' || device.colorSystem === 'Tungsten') && (
                  <DetailItem label="Rodzaj żarówki" value={device.bulbType} />
                )}
                <DetailItem label="Tryby DMX" value={device.dmxModes} />
                <DetailItem label="Zoom / Kąt" value={device.zoomRange} />
                <DetailItem label={t('devices.rigging_points')} value={device.riggingPoints} />
             </div>
          )}

          {device.category === 'Multimedia' && (
            <>
              {device.subcategory === 'projectors' && (
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Technologia" value={device.technology} />
                  <DetailItem label="Jasność" value={device.brightness} sublabel='ANSI lm' />
                  <DetailItem label="Rozdzielczość natywna" value={device.nativeResolution} />
                  <DetailItem label="Współczynnik rzutu" value={device.throwRatio} />
                  <DetailItem label="Lens Shift" value={device.lensShift} />
                  <DetailItem label="Wymienne obiektywy" value={device.interchangeableLenses} />
                </div>
              )}
               {device.subcategory === 'projection_screens' && (
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Typ ekranu" value={device.screenType} />
                  <DetailItem label="Format" value={device.screenFormat} />
                  <DetailItem label="Rozmiar" value={device.screenSize} />
                  <DetailItem label="Gain" value={device.screenGain} />
                  <DetailItem label="Projekcja" value={device.screenProjection} />
                </div>
              )}
              {device.subcategory === 'led_screens' && (
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Pixel pitch" value={device.pixelPitch} sublabel='mm' />
                  <DetailItem label="Rozdzielczość modułu" value={device.moduleResolution} />
                  <DetailItem label="Jasność" value={device.brightness} sublabel='nit' />
                  <DetailItem label="Pobór mocy (śr.)" value={device.ledPowerAvg} sublabel='W' />
                  <DetailItem label="Zastosowanie" value={device.isIndoor ? 'Wewnętrzne' : 'Zewnętrzne'} />
                  <DetailItem label="Maks. modułów na obwód zasilający" value={device.maxModulesPerCircuit} />
                  <DetailItem label="Maks. modułów na ścieżkę sygnałową" value={device.maxModulesPerSignalPath} />
                </div>
              )}
              {device.subcategory === 'tvs' && (
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Rozdzielczość" value={device.nativeResolution} />
                  <DetailItem label="Jasność" value={device.brightness} sublabel='nit' />
                  <DetailItem label="VESA" value={device.vesa} />
                </div>
              )}
               {device.subcategory === 'signal_distribution' && (
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Typ" value={device.distributionType} />
                  <DetailItem label="Wejścia / Wyjścia" value={device.inputsOutputs} />
                  <DetailItem label="Obsługiwane rozdzielczości" value={device.supportedResolutions} />
                  <DetailItem label="Opóźnienie" value={device.latency} />
                </div>
              )}
            </>
          )}

          {device.category === 'Rigging' && (
            <>
              {device.subcategory === 'trusses' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Typ" value={device.trussType} />
                    <DetailItem label="Wysokość" value={device.height} sublabel="mm" />
                    <DetailItem label="Szerokość" value={device.width} sublabel="mm" />
                    <DetailItem label="Grubość ścianki" value={device.wallThickness} sublabel="mm" />
                  </div>
                   {chartData.length > 0 && (
                    <div className="space-y-2 mt-4">
                       <p className="text-sm text-muted-foreground">Wykres nośności</p>
                       <ChartContainer config={chartConfig} className="w-full h-[250px]">
                            <LineChart accessibilityLayer data={chartData} margin={{ left: 12, right: 12 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="length" tickLine={false} axisLine={false} tickMargin={8} unit="m" />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} unit="kg" domain={[0, 'dataMax + 100']} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Line dataKey="pointLoad" type="monotone" stroke="var(--color-pointLoad)" strokeWidth={2} dot={{ fill: "var(--color-pointLoad)" }} activeDot={{ r: 6 }} />
                                <Line dataKey="distribLoad" type="monotone" stroke="var(--color-distribLoad)" strokeWidth={2} dot={{ fill: "var(--color-distribLoad)" }} activeDot={{ r: 6 }} />
                            </LineChart>
                       </ChartContainer>
                    </div>
                  )}
                  {weightChartData.length > 0 && (
                    <div className="space-y-2 mt-4">
                       <p className="text-sm text-muted-foreground">Wykres wagi</p>
                       <ChartContainer config={weightChartConfig} className="w-full h-[250px]">
                            <LineChart accessibilityLayer data={weightChartData} margin={{ left: 12, right: 12 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis dataKey="length" tickLine={false} axisLine={false} tickMargin={8} unit="m" />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} unit="kg" domain={[0, 'dataMax + 2']} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                                <Line dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={2} dot={{ fill: "var(--color-weight)" }} activeDot={{ r: 6 }} />
                            </LineChart>
                       </ChartContainer>
                    </div>
                  )}
                </>
              )}
              {device.subcategory === 'hoists' && (
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Waga urządzenia" value={device.weightKg} sublabel="kg" />
                  <DetailItem label="DOR (WLL)" value={device.wll} sublabel="kg" />
                  <DetailItem label="Prędkość" value={device.speed} sublabel="m/min" />
                  <DetailItem label="Dł. łańcucha" value={device.chainLength} sublabel="m" />
                  <DetailItem label="Klasa bezpieczeństwa" value={device.controlType} />
                </div>
              )}
              {device.subcategory === 'hooks' && (
                 <>
                  <DetailItem label="Waga" value={device.weightKg} sublabel="kg" />
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="DOR (WLL)" value={device.wll} sublabel="kg" />
                    <DetailItem label="Zakres średnicy" value={device.clampDiameterRange} />
                  </div>
                 </>
              )}
            </>
          )}

          {device.subcategory === 'power_cables' && (
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Typ kabla" value={device.cableType} />
              <DetailItem label="Przekrój" value={device.crossSection} sublabel='mm²' />
              <DetailItem label="Ilość żył" value={device.conductorCount} />
              <DetailItem label="Waga [kg/m]" value={device.weightKg} />
            </div>
          )}

          {device.subcategory === 'distribution_boxes' && (
            <div className="space-y-4">
              <Separator className="my-4" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">Zasilanie</h4>
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Wejście" value={device.distributionInput} />
                  {maxPower && <DetailItem label="Maksymalne obciążenie" value={maxPower} sublabel="kW" />}
                </div>
              </div>

              {distributionOutputs.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Wyjścia</h4>
                  <div className="rounded-md border p-2">
                    <ul className="divide-y divide-border">
                      {distributionOutputs.map((output, i) => (
                        <li key={i} className="flex justify-between items-center py-1.5 px-2">
                          <span className="font-medium">{output.type}</span>
                          <span className="text-muted-foreground">{output.quantity}x</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {device.subcategory === 'adapters' && (
            <div className="grid grid-cols-2 gap-4">
              <DetailItem label="Wejście (IN)" value={device.adapterIn} />
              <DetailItem label="Wyjście (OUT)" value={device.adapterOut} />
              <DetailItem label="Trójfazowy" value={device.isThreePhase} />
            </div>
          )}

          <Separator />
          
          {device.category !== 'Rigging' && device.subcategory !== 'distribution_boxes' && device.powerW > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <h3 className="col-span-2 font-semibold">Pobór mocy (maksymalny)</h3>
              <DetailItem label={t('devices.table.power')} value={device.powerW} sublabel="W" />
              <DetailItem label={t('devices.table.current')} value={device.currentA.toFixed(2)} sublabel="A" />
            </div>
          )}


          {(device.avgPowerW || device.avgCurrentA) && (
            <div className="grid grid-cols-2 gap-4">
                <h3 className="col-span-2 font-semibold">Pobór mocy (średni)</h3>
                <DetailItem label={t('devices.table.power')} value={device.avgPowerW} sublabel="W"/>
                <DetailItem label={t('devices.table.current')} value={device.avgCurrentA?.toFixed(2)} sublabel="A" />
            </div>
          )}

          {device.powerType && (
            <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
                <DetailItem label="Typ zasilania" value={device.powerType} />
            </div>
            </>
          )}

          {mountTypes.length > 0 && (
              <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Sposób montażu</p>
                  <div className="flex flex-wrap gap-1">
                      {mountTypes.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                  </div>
              </div>
          )}

          {device.orientation && device.orientation.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Dozwolona orientacja</p>
              <div className="flex flex-wrap gap-1">
                {device.orientation.map(o => <Badge key={o} variant="secondary">{o}</Badge>)}
              </div>
            </div>
          )}

           {device.powerConnectorsIn && device.powerConnectorsIn.length > 0 && (
             <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Złącza zasilania</p>
                <div className="flex flex-wrap gap-1">
                    {device.powerConnectorsIn?.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
            </div>
           )}

          {device.protocols && device.protocols.length > 0 && (
            <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Protokoły</p>
                <div className="flex flex-wrap gap-1">
                    {device.protocols?.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
            </div>
          )}

           {controlProtocols.length > 0 && (
            <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Protokoły sterowania</p>
                <div className="flex flex-wrap gap-1">
                    {controlProtocols.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
            </div>
          )}
          
          {signalInputs.length > 0 && (
            <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Wejścia sygnałowe</p>
                <div className="flex flex-wrap gap-1">
                    {signalInputs.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}
                </div>
            </div>
          )}

          <Separator />
          
          <div className="grid grid-cols-2 gap-4">
            {device.category !== 'Rigging' && device.subcategory !== 'power_cables' && (
                  <DetailItem label={t('devices.table.weight')} value={device.weightKg.toFixed(1)} sublabel="kg" />
              )}
              {device.spl && (
                <DetailItem label="SPL (dB)" value={`${device.spl} dB`} />
              )}
          </div>
          
          {device.cameraReady && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground border p-2 rounded-md bg-muted/50">
                  <Camera className="h-4 w-4 text-primary" />
                  <span>Urządzenie przyjazne pracy z kamerą</span>
              </div>
          )}
          
          {device.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('common.notes')}</p>
              <div 
                className="text-sm bg-muted/50 p-3 rounded-md overflow-x-auto min-h-[60px] 
                           [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 
                           [&_a]:text-primary [&_a]:underline [&_strong]:font-bold 
                           [&_u]:underline"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(device.notes || '') }} 
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
