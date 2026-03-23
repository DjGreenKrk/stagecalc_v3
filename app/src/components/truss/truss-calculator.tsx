'use client';
import { useState, useEffect, useMemo } from 'react';
import type { Calculation, Device, Truss, TrussLoadChartEntry, CalculationGroup, TrussLoad, CalculationItem } from '@/lib/definitions';
import { useUser, useCollection } from '@/firebase';
import { pb } from '@/lib/pocketbase';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, Edit, AlertTriangle, HardDrive } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { useToast } from '@/hooks/use-toast';
import { TrussFormDialog } from './truss-form-dialog';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';
import { deviceCategories } from '@/lib/definitions';
import { Progress } from '../ui/progress';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { TrussLoadFormDialog } from './truss-load-form-dialog';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Input } from '../ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

type TrussCalculatorProps = {
  calculation: Calculation;
};

type InterpolationResult = {
  pointLoad: number | null;
  distribLoad: number | null;
  status: 'ok' | 'no-data' | 'extrapolated';
};

function interpolate(x: number, x1: number, y1: number, x2: number, y2: number): number {
  if (x1 === x2) return y1;
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

function getInterpolatedLimits(truss: Truss, trussDevice: Device | undefined): InterpolationResult {
  if (!trussDevice || !trussDevice.loadChart || trussDevice.loadChart.length === 0) {
    return { pointLoad: null, distribLoad: null, status: 'no-data' };
  }

  const sortedChart = [...trussDevice.loadChart].sort((a, b) => a.length - b.length);
  const targetLength = truss.length;

  const exactMatch = sortedChart.find(p => p.length === targetLength);
  if (exactMatch) {
    return { pointLoad: exactMatch.pointLoad, distribLoad: exactMatch.distribLoad, status: 'ok' };
  }

  let status: InterpolationResult['status'] = 'ok';
  let p1: TrussLoadChartEntry, p2: TrussLoadChartEntry;

  if (targetLength < sortedChart[0].length) {
    status = 'extrapolated';
    if (sortedChart.length < 2) {
      return { pointLoad: sortedChart[0].pointLoad, distribLoad: sortedChart[0].distribLoad, status: 'extrapolated' };
    }
    p1 = sortedChart[0];
    p2 = sortedChart[1];
  } else if (targetLength > sortedChart[sortedChart.length - 1].length) {
    status = 'extrapolated';
    if (sortedChart.length < 2) {
      return { pointLoad: sortedChart[0].pointLoad, distribLoad: sortedChart[0].distribLoad, status: 'extrapolated' };
    }
    p1 = sortedChart[sortedChart.length - 2];
    p2 = sortedChart[sortedChart.length - 1];
  } else {
    status = 'ok';
    p1 = sortedChart.filter(p => p.length < targetLength).pop()!;
    p2 = sortedChart.find(p => p.length > targetLength)!;
  }

  if (!p1 || !p2) {
    const singlePoint = sortedChart[0];
    return { pointLoad: singlePoint.pointLoad, distribLoad: singlePoint.distribLoad, status: targetLength === singlePoint.length ? 'ok' : 'extrapolated' };
  }

  const interpolatedPointLoad = interpolate(targetLength, p1.length, p1.pointLoad, p2.length, p2.pointLoad);
  const interpolatedDistribLoad = interpolate(targetLength, p1.length, p1.distribLoad, p2.length, p2.distribLoad);

  return { pointLoad: interpolatedPointLoad, distribLoad: interpolatedDistribLoad, status };
}

function getGroupWeight(group: CalculationGroup, catalog: Device[], riggingCatalog: Device[] | undefined): { baseWeight: number, hooksWeight: number, totalWeight: number, requiredHooks: number } {
  const baseWeight = group.items.reduce((acc, item) => {
    if (item.deviceId) {
      const device = catalog.find(d => d.id === item.deviceId);
      return acc + ((device?.weightKg || 0) * item.quantity);
    } else if (item.manualWeight) {
      return acc + (item.manualWeight * item.quantity);
    }
    return acc;
  }, 0);

  const requiredHooks = group.items.reduce((acc, item) => {
    if (item.deviceId) {
      const device = catalog.find(d => d.id === item.deviceId);
      if (device && device.riggingPoints) {
        return acc + (device.riggingPoints * item.quantity);
      }
    }
    return acc;
  }, 0);

  const hooksWeight = (group.assignedHooks || []).reduce((acc, assignedHook) => {
    const hookDevice = riggingCatalog?.find(d => d.id === assignedHook.hookId);
    const weight = hookDevice ? hookDevice.weightKg * assignedHook.quantity : 0;
    return acc + weight;
  }, 0);

  return { baseWeight, hooksWeight, totalWeight: baseWeight + hooksWeight, requiredHooks };
}


export function TrussCalculator({ calculation }: TrussCalculatorProps) {
  const { toast } = useToast();
  const { user } = useUser();

  const [trusses, setTrusses] = useState<Truss[]>([]);
  const [groups, setGroups] = useState<CalculationGroup[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTruss, setSelectedTruss] = useState<Truss | undefined>(undefined);
  const [isLoadFormOpen, setIsLoadFormOpen] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState<TrussLoad | undefined>(undefined);
  const [activeTrussForLoad, setActiveTrussForLoad] = useState<Truss | null>(null);

  const [deviceCatalog, setDeviceCatalog] = useState<Device[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  const [openTrussItems, setOpenTrussItems] = useState<string[]>([]);
  const [openGroupItems, setOpenGroupItems] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setIsLoadingCatalog(false);
      return;
    }

    setIsLoadingCatalog(true);

    const fetchAllCategories = async () => {
      try {
        const allDevices: Device[] = [];
        for (const cat of deviceCategories) {
          const records = await pb.collection(cat.collectionName).getFullList<Device>();
          allDevices.push(...records.map(r => ({ ...r, category: cat.name })));
        }
        setDeviceCatalog(allDevices);
      } catch (error) {
        console.error("Error loading device catalog:", error);
      } finally {
        setIsLoadingCatalog(false);
      }
    };

    fetchAllCategories();
  }, [user]);

  useEffect(() => {
    const initialTrusses = calculation.data.trusses || [];
    const initialGroups = calculation.data.groups || [];
    setTrusses(initialTrusses);
    setGroups(initialGroups);
    // Set all items to be open by default
    setOpenTrussItems(initialTrusses.map(t => t.id));
    setOpenGroupItems(initialGroups.map(g => g.tempId));
  }, [calculation]);


  const { data: riggingDevices } = useCollection<Device>(
    user ? 'rigging_devices' : null,
    useMemo(() => ({ sort: 'name' }), [])
  );
  const hooks = riggingDevices?.filter(d => d.subcategory === 'hooks') || [];

  const handleSaveCalculation = async (updatedTrusses: Truss[], updatedGroups: CalculationGroup[]) => {
    if (!user || !calculation) return;

    const updatedData = {
      ...calculation.data,
      trusses: updatedTrusses,
      groups: updatedGroups,
    };

    const dataToSave = {
      ...calculation,
      lastModified: new Date().toISOString(),
      data: updatedData,
    };

    // Sanitize the data to remove any 'undefined' values before saving
    const sanitizedData = JSON.parse(JSON.stringify(dataToSave));

    try {
      await pb.collection('calculations').update(calculation.id, sanitizedData);
      toast({ title: "Zaktualizowano kalkulację kratownic." });
    } catch (error) {
      toast({ variant: 'destructive', title: "Błąd zapisu." });
      console.error(error);
    }
  };

  const handleSaveTruss = (trussData: Truss) => {
    let newTrusses;
    if (trusses.some(t => t.id === trussData.id)) {
      newTrusses = trusses.map(t => t.id === trussData.id ? trussData : t);
    } else {
      newTrusses = [...trusses, trussData];
    }
    setTrusses(newTrusses);
    handleSaveCalculation(newTrusses, groups);
    setIsFormOpen(false);
  };

  const handleDeleteTruss = (trussId: string) => {
    const newTrusses = trusses.filter(t => t.id !== trussId);
    setTrusses(newTrusses);

    const unassignedGroups = groups.map(g => {
      if (g.assignedTrussId === trussId) {
        const { assignedTrussId, ...rest } = g;
        return rest;
      }
      return g;
    });
    setGroups(unassignedGroups);

    handleSaveCalculation(newTrusses, unassignedGroups);
  };

  const handleAssignTrussToGroup = (groupId: string, trussId: string) => {
    const newGroups = groups.map(g => {
      if (g.tempId === groupId) {
        if (trussId === 'none') {
          const { assignedTrussId, ...rest } = g;
          return rest;
        }
        return { ...g, assignedTrussId: trussId };
      }
      return g;
    });
    setGroups(newGroups);
    handleSaveCalculation(trusses, newGroups);
  };

  const handleAddHookType = (groupId: string) => {
    const newGroups = groups.map(g => {
      if (g.tempId === groupId) {
        const newHooks = [...(g.assignedHooks || []), { hookId: '', quantity: 1 }];
        return { ...g, assignedHooks: newHooks };
      }
      return g;
    });
    setGroups(newGroups);
  };

  const handleRemoveHook = (groupId: string, index: number) => {
    const newGroups = groups.map(g => {
      if (g.tempId === groupId) {
        const newHooks = [...(g.assignedHooks || [])];
        newHooks.splice(index, 1);
        return { ...g, assignedHooks: newHooks };
      }
      return g;
    });
    setGroups(newGroups);
    handleSaveCalculation(trusses, newGroups);
  };

  const handleHookChange = (groupId: string, index: number, hookId: string) => {
    const newGroups = groups.map(g => {
      if (g.tempId === groupId) {
        const newHooks = [...(g.assignedHooks || [])];
        newHooks[index].hookId = hookId;
        return { ...g, assignedHooks: newHooks };
      }
      return g;
    });
    setGroups(newGroups);
    handleSaveCalculation(trusses, newGroups);
  };

  const handleHookQuantityChange = (groupId: string, index: number, quantity: number) => {
    const newGroups = groups.map(g => {
      if (g.tempId === groupId) {
        const newHooks = [...(g.assignedHooks || [])];
        newHooks[index].quantity = quantity;
        return { ...g, assignedHooks: newHooks };
      }
      return g;
    });
    setGroups(newGroups);
    handleSaveCalculation(trusses, newGroups);
  };


  const handleAddClick = () => {
    setSelectedTruss(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (truss: Truss) => {
    setSelectedTruss(truss);
    setIsFormOpen(true);
  };

  const handleAddManualLoadClick = (truss: Truss) => {
    setActiveTrussForLoad(truss);
    setSelectedLoad(undefined);
    setIsLoadFormOpen(true);
  }

  const handleEditManualLoadClick = (truss: Truss, load: TrussLoad) => {
    setActiveTrussForLoad(truss);
    setSelectedLoad(load);
    setIsLoadFormOpen(true);
  }

  const handleSaveLoad = (load: TrussLoad) => {
    if (!activeTrussForLoad) return;

    const updatedTrusses = trusses.map(truss => {
      if (truss.id === activeTrussForLoad.id) {
        const existingLoadIndex = truss.loads.findIndex(l => l.id === load.id);
        let newLoads;
        if (existingLoadIndex > -1) {
          newLoads = [...truss.loads];
          newLoads[existingLoadIndex] = load;
        } else {
          newLoads = [...truss.loads, load];
        }
        return { ...truss, loads: newLoads };
      }
      return truss;
    });

    setTrusses(updatedTrusses);
    handleSaveCalculation(updatedTrusses, groups);
    setIsLoadFormOpen(false);
  }

  const handleDeleteLoad = (trussId: string, loadId: string) => {
    const updatedTrusses = trusses.map(truss => {
      if (truss.id === trussId) {
        return { ...truss, loads: truss.loads.filter(l => l.id !== loadId) };
      }
      return truss;
    });
    setTrusses(updatedTrusses);
    handleSaveCalculation(updatedTrusses, groups);
  }

  const handleToggleAll = () => {
    const allTrussesOpen = openTrussItems.length === trusses.length;
    const allGroupsOpen = openGroupItems.length === groups.length;

    if (allTrussesOpen && allGroupsOpen) {
      setOpenTrussItems([]);
      setOpenGroupItems([]);
    } else {
      setOpenTrussItems(trusses.map(t => t.id));
      setOpenGroupItems(groups.map(g => g.tempId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-headline">Kalkulacja: {calculation.name} - Nośność kratownic</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleToggleAll}>
            {(openTrussItems.length === trusses.length && openGroupItems.length === groups.length) ? 'Zwiń wszystkie' : 'Rozwiń wszystkie'}
          </Button>
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Dodaj kratę
          </Button>
        </div>
      </div>

      <Accordion type="multiple" value={openTrussItems} onValueChange={setOpenTrussItems} className="space-y-4">
        {trusses.length === 0 && (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Brak zdefiniowanych kratownic</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Dodaj pierwszą kratownicę, aby móc przypisywać do niej obciążenia.</p>
            </CardContent>
          </Card>
        )}
        {trusses.map(truss => {
          const trussDevice = riggingDevices?.find(d => d.id === truss.trussTypeId);
          const calculatedLimits = getInterpolatedLimits(truss, trussDevice);

          const assignedGroups = groups.filter(g => g.assignedTrussId === truss.id);
          const assignedGroupsWeight = assignedGroups.reduce((groupAcc, group) => {
            const { totalWeight } = getGroupWeight(group, deviceCatalog, riggingDevices || []);
            return groupAcc + totalWeight;
          }, 0);

          const manualLoadsWeight = truss.loads.reduce((acc, load) => {
            let itemWeight = 0;

            if (load.calculationItemId) {
              const item = calculation.data.groups.flatMap(g => g.items).find(i => i.tempId === load.calculationItemId);
              const device = item ? deviceCatalog.find(d => d.id === item.deviceId) : null;
              itemWeight = device?.weightKg || 0;
            } else if (load.deviceId) {
              const device = deviceCatalog.find(d => d.id === load.deviceId);
              itemWeight = device?.weightKg || 0;
            } else if (load.manualWeight) {
              itemWeight = load.manualWeight;
            }

            const totalItemWeight = itemWeight * load.quantity;
            return acc + totalItemWeight + (load.riggingWeight || 0);
          }, 0);

          const totalWeightOnTruss = assignedGroupsWeight + manualLoadsWeight;
          const loadPercentage = truss.totalLoadLimit > 0 ? (totalWeightOnTruss / truss.totalLoadLimit) * 100 : 0;

          const actualUDL = truss.length > 0 ? totalWeightOnTruss / truss.length : 0;
          const dbUDLLimit = calculatedLimits.distribLoad ?? 0;
          const udlPercentage = dbUDLLimit > 0 ? (actualUDL / dbUDLLimit) * 100 : 0;

          return (
            <AccordionItem value={truss.id} key={truss.id} className="border-b-0">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <AccordionTrigger className="flex-1 text-left p-0 hover:no-underline [&>svg]:ml-auto">
                    <div>
                      <CardTitle>{truss.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {trussDevice?.name || 'Nieznany typ'} | Długość: {truss.length}m | {truss.supportMode === 'suspended' ? 'Wisząca' : 'Podparta'}
                      </p>
                      {!openTrussItems.includes(truss.id) && (
                        <div className="flex items-center gap-2 text-xs mt-2 text-muted-foreground">
                          <span className="font-semibold">Obciążenie:</span>
                          <span className={cn(loadPercentage > 100 && "text-destructive font-bold")}>
                            {totalWeightOnTruss.toFixed(1)} kg / {truss.totalLoadLimit} kg
                          </span>
                          <Progress value={loadPercentage > 100 ? 100 : loadPercentage} className={cn("w-24 h-2", loadPercentage > 100 && "[&>div]:bg-destructive")} />
                          <span className={cn("font-bold", loadPercentage > 100 ? "text-destructive" : "text-primary")}>{loadPercentage.toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-2 pl-4">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(truss)}><Edit className="mr-2 h-4 w-4" /> Edytuj</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTruss(truss.id)}><Trash2 className="mr-2 h-4 w-4" /> Usuń</Button>
                  </div>
                </CardHeader>
                <AccordionContent>
                  <CardContent className="space-y-4 pt-0">
                    <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                      <h3 className="font-semibold">Obciążenia i limity</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 border rounded-md bg-background">
                          <p className="text-xs text-muted-foreground">Obciążenie całkowite (Total)</p>
                          <p className="text-lg font-bold">{totalWeightOnTruss.toFixed(1)} kg / {truss.totalLoadLimit} kg</p>
                          <Progress value={loadPercentage} className={cn(loadPercentage > 100 && "[&>div]:bg-destructive")} />
                          {loadPercentage > 100 && <p className="text-xs text-destructive mt-1">Przekroczono limit całkowity!</p>}
                        </div>
                        <div className="p-3 border rounded-md bg-background">
                          <p className="text-xs text-muted-foreground">Obciążenie rozłożone (UDL)</p>
                          <p className="text-lg font-bold">{actualUDL.toFixed(1)} kg/m / {dbUDLLimit > 0 ? dbUDLLimit.toFixed(1) : '-'} kg/m</p>
                          <Progress value={udlPercentage} className={cn(udlPercentage > 100 && "[&>div]:bg-destructive")} />
                          {udlPercentage > 100 && <p className="text-xs text-destructive mt-1">Przekroczono limit UDL!</p>}
                        </div>
                        <div className="p-3 border rounded-md bg-background">
                          <p className="text-xs text-muted-foreground">Limit obc. punktowego (wg bazy)</p>
                          <p className="text-lg font-bold">{calculatedLimits.pointLoad?.toFixed(1) ?? '-'} kg</p>
                          <p className="text-xs text-muted-foreground mt-1">Wartość informacyjna</p>
                        </div>
                      </div>

                      {calculatedLimits.status === 'extrapolated' && (
                        <div className="flex items-start gap-2 text-xs text-destructive p-3 border-l-4 border-destructive bg-destructive/10">
                          <AlertTriangle className="h-4 w-4 mt-0.5" />
                          <p><strong>Uwaga:</strong> Długość poza zakresem tabeli producenta. Obliczenia są ekstrapolacją i wymagają weryfikacji.</p>
                        </div>
                      )}

                      {calculatedLimits.status === 'no-data' && (
                        <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
                          <p>Brak danych nośności dla tego typu kratownicy w katalogu.</p>
                          <p className="text-xs">Uzupełnij tabelę nośności w edycji urządzenia, aby włączyć obliczenia.</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Obciążenia indywidualne</h3>
                        <Button variant="outline" size="sm" onClick={() => handleAddManualLoadClick(truss)}><PlusCircle className="mr-2 h-4 w-4" /> Dodaj</Button>
                      </div>
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nazwa</TableHead>
                              <TableHead>Typ</TableHead>
                              <TableHead>Pozycja</TableHead>
                              <TableHead>Waga</TableHead>
                              <TableHead><span className="sr-only">Akcje</span></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {truss.loads.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-20 text-muted-foreground">Brak obciążeń indywidualnych</TableCell></TableRow>}
                            {truss.loads.map(load => {
                              let name = load.manualName || 'Brak nazwy';
                              let subtext = 'Obciążenie ręczne';
                              let weight = (load.manualWeight || 0) * load.quantity;

                              if (load.calculationItemId) {
                                const item = calculation.data.groups.flatMap(g => g.items).find(i => i.tempId === load.calculationItemId);
                                const device = item ? deviceCatalog.find(d => d.id === item.deviceId) : null;
                                if (device) {
                                  name = device.name;
                                  subtext = `Z kalkulatora: ${device.manufacturer}`;
                                  weight = (device.weightKg || 0) * load.quantity;
                                }
                              } else if (load.deviceId) {
                                const device = deviceCatalog.find(d => d.id === load.deviceId);
                                if (device) {
                                  name = device.name;
                                  subtext = `Z katalogu: ${device.manufacturer}`;
                                  weight = (device.weightKg || 0) * load.quantity;
                                }
                              }

                              return (
                                <TableRow key={load.id}>
                                  <TableCell>
                                    <p>{name}</p>
                                    <p className="text-xs text-muted-foreground">{subtext}</p>
                                  </TableCell>
                                  <TableCell>{load.loadType === 'point' ? 'Punktowe' : 'Rozłożone'}</TableCell>
                                  <TableCell>{load.loadType === 'point' ? `${load.position} m` : 'N/A'}</TableCell>
                                  <TableCell>{weight.toFixed(1)} kg</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditManualLoadClick(truss, load)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteLoad(truss.id, load.id)}><Trash2 className="h-4 w-4" /></Button>
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )
        })}
      </Accordion>

      <div className="space-y-6 mt-12">
        <h2 className="text-xl font-bold font-headline">Przypisanie Grup do Konstrukcji</h2>
        {groups.length === 0 && (
          <Card className="text-center py-12">
            <CardHeader><CardTitle>Brak grup urządzeń</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Brak grup urządzeń w tej kalkulacji. Wróć do głównego kalkulatora, aby je dodać.</p>
            </CardContent>
          </Card>
        )}
        <Accordion type="multiple" value={openGroupItems} onValueChange={setOpenGroupItems} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {groups.map(group => {
            const { totalWeight: groupTotalWeight, requiredHooks } = getGroupWeight(group, deviceCatalog, riggingDevices || []);
            const totalAssignedHooks = (group.assignedHooks || []).reduce((acc, h) => acc + h.quantity, 0);

            return (
              <AccordionItem value={group.tempId} key={group.tempId} className="border-b-0">
                <Card>
                  <CardHeader>
                    <AccordionTrigger className="w-full p-0 text-left hover:no-underline [&>svg]:ml-auto">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <HardDrive className="h-5 w-5 text-primary" />
                          {group.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Całkowita waga grupy: <span className="font-bold">{groupTotalWeight.toFixed(1)} kg</span>
                        </p>
                      </div>
                    </AccordionTrigger>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent>
                      <h4 className="font-semibold text-sm mb-2">Urządzenia w grupie:</h4>
                      <div className="max-h-40 overflow-y-auto pr-2 border-t border-b py-2">
                        {group.items.length === 0 && <p className="text-xs text-muted-foreground text-center">Brak urządzeń w tej grupie.</p>}
                        <ul className="space-y-1">
                          {group.items.map(item => {
                            const device = item.deviceId ? deviceCatalog.find(d => d.id === item.deviceId) : null;
                            const name = device ? device.name : item.manualName;
                            return (
                              <li key={item.tempId} className="flex justify-between text-sm">
                                <span>{name || 'Nieznane urządzenie'}</span>
                                <span className="text-muted-foreground">{item.quantity} szt.</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-4">
                      <div className="w-full space-y-2">
                        <label className="text-sm font-medium">Przypisana konstrukcja</label>
                        <Select
                          value={group.assignedTrussId || 'none'}
                          onValueChange={(trussId) => handleAssignTrussToGroup(group.tempId, trussId)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Wybierz konstrukcję..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Brak przypisania</SelectItem>
                            {trusses.map(truss => (
                              <SelectItem key={truss.id} value={truss.id}>{truss.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {requiredHooks > 0 && (
                        <div className="w-full space-y-4">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-medium">Haki (Wymagane: {requiredHooks} / Przypisane: {totalAssignedHooks})</label>
                            <Button size="sm" variant="outline" onClick={() => handleAddHookType(group.tempId)}>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Dodaj
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {(group.assignedHooks || []).map((assignedHook, index) => (
                              <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                                <Select
                                  value={assignedHook.hookId}
                                  onValueChange={(hookId) => handleHookChange(group.tempId, index, hookId)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Wybierz hak..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {hooks.map(hook => (
                                      <SelectItem key={hook.id} value={hook.id}>{hook.name} ({hook.weightKg.toFixed(1)} kg)</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  className="w-20"
                                  value={assignedHook.quantity}
                                  onChange={(e) => handleHookQuantityChange(group.tempId, index, parseInt(e.target.value) || 0)}
                                  min="1"
                                />
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveHook(group.tempId, index)}>
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardFooter>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            )
          })}
        </Accordion>
      </div>

      <TrussFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSave={handleSaveTruss}
        truss={selectedTruss}
        riggingDevices={riggingDevices?.filter(d => d.subcategory === 'trusses') || []}
      />

      {activeTrussForLoad && (
        <TrussLoadFormDialog
          open={isLoadFormOpen}
          onOpenChange={setIsLoadFormOpen}
          onSave={handleSaveLoad}
          load={selectedLoad}
          trussLength={activeTrussForLoad.length}
          deviceCatalog={deviceCatalog}
        />
      )}
    </div>
  );
}
