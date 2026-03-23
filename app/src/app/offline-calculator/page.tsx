'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Weight, Zap, X } from 'lucide-react';
import { SummaryCard } from '@/components/event/summary-card';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { PowerConnector } from '@/lib/definitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/context/language-context';

const NOMINAL_VOLTAGE = 230;

type TemporaryDevice = {
  id: string;
  name: string;
  powerW: number;
  currentA: number;
  weightKg: number;
  quantity: number;
  assignedConnectorId?: string;
};

type TemporaryConnector = Omit<PowerConnector, 'locationId'> & {
    instanceId: string;
    currentLoad: number;
    isOverloaded: boolean;
};

const connectorTypeConfig: { [key: string]: Pick<PowerConnector, 'maxCurrentA' | 'phases'> } = {
  '16A Uni-Schuko': { maxCurrentA: 16, phases: 1 },
  '16A CEE 3P': { maxCurrentA: 16, phases: 1 },
  '32A CEE 3P': { maxCurrentA: 32, phases: 1 },
  '16A CEE 5P': { maxCurrentA: 16, phases: 3 },
  '32A CEE 5P': { maxCurrentA: 32, phases: 3 },
  '63A CEE 5P': { maxCurrentA: 63, phases: 3 },
  '125A CEE 5P': { maxCurrentA: 125, phases: 3 },
};

const allAvailableConnectorTypes = Object.entries(connectorTypeConfig).map(([type, config]) => ({
  type: type as PowerConnector['type'],
  ...config,
}));

export default function OfflineCalculatorPage() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<TemporaryDevice[]>([]);
  const [connectors, setConnectors] = useState<TemporaryConnector[]>([]);

  // Device form state
  const [name, setName] = useState('');
  const [powerW, setPowerW] = useState<number | string>('');
  const [weightKg, setWeightKg] = useState<number | string>(1);
  const [quantity, setQuantity] = useState<number | string>(1);
  
  // Connector form state
  const [connectorTypeToAdd, setConnectorTypeToAdd] = useState('');

  const currentA = useMemo(() => {
    if (typeof powerW === 'number' && powerW > 0) {
      const newCurrent = powerW / NOMINAL_VOLTAGE;
      return !isNaN(newCurrent) && isFinite(newCurrent) ? parseFloat(newCurrent.toFixed(2)) : '';
    }
    return '';
  }, [powerW]);

  const handleAddDevice = () => {
    if (!name || typeof powerW !== 'number' || powerW <= 0 || typeof quantity !== 'number' || quantity <= 0) {
      return;
    }
    const newDevice: TemporaryDevice = {
      id: crypto.randomUUID(),
      name,
      powerW,
      currentA: typeof currentA === 'number' ? currentA : 0,
      weightKg: typeof weightKg === 'number' ? weightKg : 0,
      quantity,
    };
    setDevices(prev => [...prev, newDevice]);
    // Reset form
    setName('');
    setPowerW('');
    setWeightKg(1);
    setQuantity(1);
  };

  const handleRemoveDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
  };
  
  const handleQuantityChange = (id: string, newQuantity: number) => {
    setDevices(devices.map(d => d.id === id ? { ...d, quantity: Math.max(1, newQuantity) } : d));
  }
  
  const handleAssignmentChange = (deviceId: string, newConnectorId: string | 'none') => {
     setDevices(devices.map(d => d.id === deviceId ? { ...d, assignedConnectorId: newConnectorId === 'none' ? undefined : newConnectorId } : d));
  }

  const handleAddConnector = () => {
    if (!connectorTypeToAdd) return;
    const config = connectorTypeConfig[connectorTypeToAdd];
    if (config) {
      const newConnector: TemporaryConnector = {
        id: crypto.randomUUID(),
        instanceId: crypto.randomUUID(),
        type: connectorTypeToAdd as PowerConnector['type'],
        phases: config.phases as 1 | 3,
        maxCurrentA: config.maxCurrentA,
        quantity: 1, // In demo, we add one by one
        currentLoad: 0,
        isOverloaded: false,
      };
      setConnectors(prev => [...prev, newConnector]);
    }
  }

  const handleRemoveConnector = (instanceId: string) => {
      setConnectors(prev => prev.filter(c => c.instanceId !== instanceId));
      // Un-assign devices from the removed connector
      setDevices(prev => prev.map(d => d.assignedConnectorId === instanceId ? {...d, assignedConnectorId: undefined} : d));
  }

  const totals = useMemo(() => {
    return devices.reduce(
      (acc, device) => {
        acc.powerW += device.powerW * device.quantity;
        acc.currentA += device.currentA * device.quantity;
        acc.weightKg += device.weightKg * device.quantity;
        return acc;
      },
      { powerW: 0, currentA: 0, weightKg: 0 }
    );
  }, [devices]);

  const connectorStatus = useMemo(() => {
      const loads: { [key: string]: number } = {};
      devices.forEach(device => {
        if(device.assignedConnectorId) {
            loads[device.assignedConnectorId] = (loads[device.assignedConnectorId] || 0) + (device.currentA * device.quantity);
        }
      });

      return connectors.map(c => {
          const load = loads[c.instanceId] || 0;
          return {
              ...c,
              currentLoad: load,
              isOverloaded: load > c.maxCurrentA
          }
      }).sort((a,b) => a.type.localeCompare(b.type));
  }, [devices, connectors]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
          <div className='flex items-center gap-2'>
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold font-headline">{t('offline_calculator.title_demo')}</h1>
          </div>
          <Button asChild>
            <Link href="/login">{t('offline_calculator.login_or_register')}</Link>
          </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t('offline_calculator.add_temp_device')}</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid gap-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                              <Label htmlFor="name">{t('devices.table.name')}</Label>
                              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('offline_calculator.device_name_placeholder')} />
                          </div>
                          <div>
                              <Label htmlFor="quantity">{t('offline_calculator.quantity')}</Label>
                              <Input id="quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))} min="1" />
                          </div>
                      </div>
                       <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                              <Label htmlFor="powerW">{t('devices.table.power')}</Label>
                              <Input id="powerW" type="number" value={powerW} onChange={(e) => setPowerW(e.target.value === '' ? '' : parseInt(e.target.value, 10))} placeholder="150" />
                          </div>
                          <div>
                              <Label htmlFor="currentA">{t('devices.table.current')}</Label>
                              <Input id="currentA" type="number" value={currentA} disabled placeholder={(150 / 230).toFixed(2)} />
                          </div>
                          <div>
                              <Label htmlFor="weightKg">{t('devices.table.weight')}</Label>
                              <Input id="weightKg" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value === '' ? '' : parseFloat(e.target.value))} min="0" step="0.1" />
                          </div>
                       </div>
                      <Button onClick={handleAddDevice} className="w-full sm:w-auto">
                          <PlusCircle className="mr-2 h-4 w-4" />
                          {t('offline_calculator.add_to_list')}
                      </Button>
                  </div>
              </CardContent>
            </Card>
            
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard title={t('summary.power')} value={`${(totals.powerW / 1000).toFixed(2)} kW`} icon={Zap} />
              <SummaryCard title={t('summary.current')} value={`${totals.currentA.toFixed(2)} A`} icon={Zap} variant="secondary" />
              <SummaryCard title={t('summary.weight')} value={`${totals.weightKg.toFixed(2)} kg`} icon={Weight} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('offline_calculator.device_list')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('devices.table.name')}</TableHead>
                      <TableHead className="w-[100px]">{t('offline_calculator.quantity')}</TableHead>
                      <TableHead className="w-[200px]">{t('offline_calculator.connector')}</TableHead>
                      <TableHead className="w-[50px]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                          {t('offline_calculator.add_first_device')}
                        </TableCell>
                      </TableRow>
                    )}
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium">{device.name}</TableCell>
                        <TableCell>
                           <Input
                              type="number"
                              value={device.quantity}
                              onChange={(e) => handleQuantityChange(device.id, parseInt(e.target.value, 10))}
                              className="h-8 w-20"
                              min="1"
                            />
                        </TableCell>
                         <TableCell>
                            <Select onValueChange={(val) => handleAssignmentChange(device.id, val)} value={device.assignedConnectorId || 'none'}>
                                <SelectTrigger className="h-8">
                                <SelectValue placeholder={t('offline_calculator.assign_placeholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">{t('common.none')}</SelectItem>
                                    {connectors.map((c) => (
                                        <SelectItem key={c.instanceId} value={c.instanceId}>
                                            {c.type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => handleRemoveDevice(device.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader><CardTitle>{t('offline_calculator.available_connectors')}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                    <Label htmlFor="connector-type">{t('offline_calculator.connector_type')}</Label>
                    <div className="flex gap-2">
                        <Select value={connectorTypeToAdd} onValueChange={setConnectorTypeToAdd}>
                            <SelectTrigger id="connector-type" className="flex-1"><SelectValue placeholder={t('offline_calculator.select_type')} /></SelectTrigger>
                            <SelectContent>{allAvailableConnectorTypes.map(c => <SelectItem key={c.type} value={c.type}>{c.type}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={handleAddConnector} disabled={!connectorTypeToAdd}><PlusCircle className="mr-2 h-4 w-4" />{t('common.add')}</Button>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>{t('offline_calculator.connector_status')}</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="grid gap-4">
                    {connectorStatus.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">{t('offline_calculator.add_connector_to_monitor')}</p>}
                    {connectorStatus.map((connector) => (
                        <div key={connector.instanceId} className={cn("p-4 border rounded-lg relative", connector.isOverloaded && "border-destructive bg-destructive/10")}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground absolute top-1 right-1" onClick={() => handleRemoveConnector(connector.instanceId)}><X className="h-4 w-4" /></Button>
                            <p className="font-medium pr-6">{connector.type}</p>

                             <div>
                                <p className="text-xs text-muted-foreground">{t('offline_calculator.load_phase', { phases: connector.phases })}</p>
                                <p className={cn("font-bold text-lg", connector.isOverloaded && "text-destructive")}>
                                    {connector.currentLoad.toFixed(1)}A / {connector.maxCurrentA}A
                                </p>
                            </div>
                            {connector.isOverloaded && <Badge variant="destructive" className="mt-1">{t('offline_calculator.overload')}</Badge>}
                        </div>
                    ))}
                </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
