'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useUser, useCollection, useDoc } from '@/firebase';
import { pb } from '@/lib/pocketbase';
import { useRouter, useParams } from 'next/navigation';
import type { Device, Calculation, CalculationGroup, CalculationItem, PowerConnector, Location, Client, UserFavoriteDevices, DeviceCategoryName, DeviceCategory, PowerConnectorGroup } from '@/lib/definitions';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { PlusCircle, Trash2, Weight, Zap, GripVertical, X, Package, Ampersand, PercentCircle, Edit, Shuffle, FileDown, ChevronsUpDown, Star, MapPin, Download, Link as LinkIcon, Plug, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { SummaryCard } from '../event/summary-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { useTranslation } from '@/context/language-context';
import { CSS } from '@dnd-kit/utilities';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Label } from '../ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { deviceCategories, ConnectorTypes, connectorTypeConfig } from '@/lib/definitions';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useToast } from '@/hooks/use-toast';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Separator } from '../ui/separator';

type ActiveConnector = PowerConnector & {
  instanceId: string;
  isManual?: boolean;
};

type ConnectorGroup = PowerConnectorGroup & {
  isLocationGroup?: boolean;
  deviceId?: string; // Link to device from catalog if created from it
};


function getConnectorDisplayName(connector: ActiveConnector, allConnectorsInCalc: ActiveConnector[]): string {
  const ofSameType = allConnectorsInCalc.filter(c => c.type === connector.type);
  if (ofSameType.length > 1) {
    const index = ofSameType.findIndex(c => c.instanceId === connector.instanceId);
    return `${connector.type} #${index + 1}`;
  }
  return connector.type;
}


function SortableDeviceRow({
  name,
  manufacturer,
  isCable,
  item,
  onRemove,
  onQuantityChange,
}: {
  name: string;
  manufacturer: string;
  isCable: boolean;
  item: CalculationItem;
  onRemove: () => void;
  onQuantityChange: (newQuantity: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.tempId });

  const [localQuantity, setLocalQuantity] = useState<string>(String(item.quantity || 1));

  useEffect(() => {
    setLocalQuantity(String(item.quantity || 1));
  }, [item.quantity]);

  const handleBlur = () => {
    const newQuantity = parseInt(localQuantity, 10);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      onRemove();
    } else {
      onQuantityChange(newQuantity);
    }
  };

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell className="cursor-grab p-2" {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </TableCell>
      <TableCell className="font-medium">
        <p>{name}</p>
        <p className="text-sm text-muted-foreground">
          {manufacturer}
        </p>
      </TableCell>
      <TableCell className="w-[100px]">
        <div className="flex items-center">
          <Input
            type="number"
            value={localQuantity}
            onChange={(e) => setLocalQuantity(e.target.value)}
            onBlur={handleBlur}
            className="h-8 w-16"
            min="1"
          />
          <span className="ml-2 text-muted-foreground">{isCable ? 'm' : 'szt.'}</span>
        </div>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}


export function QuickCalculator({ initialData }: { initialData?: Calculation }) {
  const { t } = useTranslation();
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [deviceCatalog, setDeviceCatalog] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for the calculator itself
  const [groups, setGroups] = useState<CalculationGroup[]>([]);
  const [connectorGroups, setConnectorGroups] = useState<ConnectorGroup[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Form input state
  const [deviceToAdd, setDeviceToAdd] = useState('');
  const [quantityToAdd, setQuantityToAdd] = useState<number | ''>(1);
  const [targetGroup, setTargetGroup] = useState('');
  const [manualConnectorType, setManualConnectorType] = useState<string>('16A Uni-Schuko');

  // UI state
  const [openMultiSelects, setOpenMultiSelects] = useState<{ [key: string]: boolean }>({});
  const [isDevicePopoverOpen, setIsDevicePopoverOpen] = useState(false);
  const [isDistroPopoverOpen, setIsDistroPopoverOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [calculationName, setCalculationName] = useState(initialData?.name || '');
  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [isDeleteGroupConfirmOpen, setIsDeleteGroupConfirmOpen] = useState(false);
  const [groupToDeleteId, setGroupToDeleteId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DeviceCategory | null>(null);


  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let loadedCount = 0;

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
        setIsLoading(false);
      }
    };

    fetchAllCategories();
  }, [user]);


  const { data: allLocations } = useCollection<Location>(
    user ? 'locations' : null,
    useMemo(() => ({ sort: 'name' }), [])
  );

  const favoriteDeviceIds = useMemo(() => new Set(user?.favorites || []), [user]);

  useEffect(() => {
    if (initialData) {
      setGroups(initialData.data.groups || []);
      setConnectorGroups(initialData.data.connectorGroups || []);
      setSelectedLocationId(initialData.data.selectedLocationId || null);
      setCalculationName(initialData.name || '');
      if (initialData.data.groups.length > 0) {
        setTargetGroup(initialData.data.groups[0].tempId);
      }
    } else {
      if (groups.length === 0) {
        const initialGroupId = crypto.randomUUID();
        setGroups([{ tempId: initialGroupId, name: 'Domyślna grupa', items: [] }]);
        setTargetGroup(initialGroupId);
      }
    }
  }, [initialData, groups.length]);


  const handleSave = async () => {
    if (!user) {
      toast({ title: 'Musisz być zalogowany, aby zapisać.', variant: 'destructive' });
      return;
    }

    const calculationData = {
      groups,
      connectorGroups,
      selectedLocationId,
    };

    const dataToSave = {
      name: calculationName,
      ownerUserId: user.id,
      lastModified: new Date().toISOString(),
      data: calculationData,
    };

    // Sanitize the data to remove any 'undefined' values before saving
    const sanitizedData = JSON.parse(JSON.stringify(dataToSave));

    setIsSaveDialogOpen(false);

    try {
      if (params.id && params.id !== 'new' && params.id !== 'new-calculator') {
        await pb.collection('calculations').update(params.id as string, sanitizedData);
        toast({ title: "Kalkulacja zaktualizowana!" });
      } else {
        const newRecord = await pb.collection('calculations').create(sanitizedData);
        toast({ title: "Kalkulacja zapisana!" });
        if (newRecord.id) {
          router.push(`/calculators/${newRecord.id}`);
        }
      }
    } catch (error: any) {
      console.error("Błąd zapisu kalkulacji:", error);
      toast({
        variant: "destructive",
        title: "Błąd zapisu",
        description: "Nie udało się zapisać kalkulacji. Sprawdź poprawność danych i spróbuj ponownie."
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let newConnectorGroups: ConnectorGroup[] = [];

    const manualGroups = connectorGroups.filter(g => !g.isLocationGroup);

    if (selectedLocationId) {
      const location = allLocations?.find(l => l.id === selectedLocationId);
      if (location && location.powerConnectorGroups) {
        newConnectorGroups.push(...location.powerConnectorGroups.map(group => ({
          ...group,
          id: `loc-${group.id}`,
          isLocationGroup: true,
          connectors: (group.connectors || []).flatMap(pc =>
            Array.from({ length: pc.quantity || 1 }, (_, i) => ({
              ...pc,
              instanceId: `${pc.id}-${i}`,
              isManual: false,
            }))
          )
        })));
      }
    }

    newConnectorGroups.push(...manualGroups);

    if (newConnectorGroups.length === 0) {
      newConnectorGroups.push({
        id: crypto.randomUUID(),
        name: 'Dodatkowe przyłącza',
        connectors: [],
        isLocationGroup: false,
      });
    }

    if (JSON.stringify(newConnectorGroups) !== JSON.stringify(connectorGroups)) {
      setConnectorGroups(newConnectorGroups);
    }
  }, [selectedLocationId, allLocations, connectorGroups]);


  const activeConnectors = useMemo(() => {
    return connectorGroups.flatMap(group => group.connectors.map(c => ({ ...c, groupId: group.id })));
  }, [connectorGroups]);


  const usedConnectorIds = useMemo(() => {
    const usedIds = new Set<string>();

    groups.forEach(group => {
      group.assignedConnectorIds?.forEach(id => usedIds.add(id));
    });

    connectorGroups.forEach(group => {
      if (group.sourceInput?.parentConnectorId) {
        usedIds.add(group.sourceInput.parentConnectorId);
      }
    });

    return usedIds;
  }, [groups, connectorGroups]);

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const primaryColorHex = '#3da542';

    doc.setFont('helvetica');

    let finalY = 20;
    const leftMargin = 15;

    doc.setFontSize(22);
    doc.text('Podsumowanie Kalkulacji', leftMargin, finalY);
    finalY += 8;

    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString('pl-PL'), leftMargin, finalY);
    finalY += 15;

    doc.setFontSize(12);
    doc.text('Podsumowanie ogólne', leftMargin, finalY);
    finalY += 6;

    const summaryData = [
      [`Całkowita moc: ${(totals.powerW / 1000).toFixed(2)} kW`],
      [`Całkowity prąd: ${totals.currentA.toFixed(2)} A`],
      [`Całkowita waga: ${totals.weightKg.toFixed(2)} kg`],
    ];

    autoTable(doc, {
      body: summaryData,
      startY: finalY,
      theme: 'plain',
      styles: { fontSize: 11, font: 'helvetica' },
      columnStyles: { 0: { fontStyle: 'normal' } },
      margin: { left: leftMargin },
    });
    finalY = (doc as any).lastAutoTable.finalY + 15;

    if (fullCalculationList.length > 0) {
      doc.setFontSize(16);
      doc.text('Grupy urządzeń', leftMargin, finalY);
      finalY += 8;
    }

    fullCalculationList.forEach(group => {
      doc.setFontSize(12);
      doc.text(group.name, leftMargin, finalY);
      finalY += 6;

      const tableBody = group.items.map(item => {
        const device = item.item.deviceId ? deviceCatalog.find(d => d.id === item.item.deviceId) : null;
        const name = device ? device.name : item.item.manualName;
        const manufacturer = device ? device.manufacturer : "Wpis ręczny";
        const current = device ? device.currentA.toFixed(1) + ' A' : '-';
        return [name, manufacturer, current, 'None'];
      });

      autoTable(doc, {
        head: [['Urządzenie', 'Producent', 'Prąd', 'Przypisane złącze']],
        body: tableBody.map(row => row.map(cell => cell || '')),
        startY: finalY,
        theme: 'striped',
        styles: { font: 'helvetica' },
        headStyles: { fillColor: primaryColorHex, textColor: 255, font: 'helvetica' },
        margin: { left: leftMargin },
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    });

    connectorStatus.forEach(group => {
      if (finalY > doc.internal.pageSize.height - 40) { doc.addPage(); finalY = 20; }
      doc.setFontSize(16);
      doc.text(`Status przyłączy - ${group.name}`, leftMargin, finalY);
      finalY += 8;

      const connectorBody = group.connectors.map(c => {
        return [c.name, `${c.totalLoad.toFixed(1)}A / ${c.totalCapacity}A`, '-', '-'];
      });

      autoTable(doc, {
        head: [['Przyłącze', 'Całkowite obciążenie', '', '']],
        body: connectorBody,
        startY: finalY,
        theme: 'grid',
        styles: { font: 'helvetica' },
        headStyles: { fillColor: primaryColorHex, textColor: 255, font: 'helvetica' },
        margin: { left: leftMargin },
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save(`stagecalc-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleAddManualConnector = (targetGroupId: string) => {
    const config = connectorTypeConfig[manualConnectorType as keyof typeof connectorTypeConfig];
    if (!config) return;

    const newConnector: ActiveConnector = {
      id: crypto.randomUUID(),
      instanceId: crypto.randomUUID(),
      type: manualConnectorType as PowerConnector['type'],
      phases: config.phases as 1 | 3,
      maxCurrentA: config.maxCurrentA,
      quantity: 1,
      isManual: true,
    };

    setConnectorGroups(prev => prev.map(group => {
      if (group.id === targetGroupId) {
        return { ...group, connectors: [...group.connectors, newConnector] };
      }
      return group;
    }));
  };

  const handleAddDistroFromCatalog = (deviceId: string) => {
    const device = deviceCatalog.find(d => d.id === deviceId);
    if (!device || device.subcategory !== 'distribution_boxes') return;

    const newConnectors: ActiveConnector[] = (device.distributionOutputs || []).map(output => {
      const config = connectorTypeConfig[output.type as keyof typeof connectorTypeConfig];
      return Array.from({ length: output.quantity }, (_, i) => ({
        id: crypto.randomUUID(),
        instanceId: crypto.randomUUID(),
        type: output.type as PowerConnector['type'],
        phases: config?.phases as 1 | 3 || 1,
        maxCurrentA: config?.maxCurrentA || 0,
        quantity: 1,
        isManual: true,
      }));
    }).flat();

    const newGroup: ConnectorGroup = {
      id: crypto.randomUUID(),
      name: device.name,
      connectors: newConnectors,
      isLocationGroup: false,
      deviceId: device.id,
      inputConnectorType: device.distributionInput
    };

    setConnectorGroups(prev => [...prev, newGroup]);
    setIsDistroPopoverOpen(false);
  }

  const handleAddConnectorGroup = () => {
    setConnectorGroups(prev => [...prev, {
      id: crypto.randomUUID(),
      name: `Nowa grupa przyłączy`,
      connectors: [],
      isLocationGroup: false,
    }]);
  };

  const handleRemoveConnectorGroup = (groupId: string) => {
    setGroupToDeleteId(groupId);
    setIsDeleteGroupConfirmOpen(true);
  };

  const confirmDeleteGroup = () => {
    if (groupToDeleteId) {
      setConnectorGroups(prev => prev.filter(g => g.id !== groupToDeleteId));
    }
    setIsDeleteGroupConfirmOpen(false);
    setGroupToDeleteId(null);
  };

  const handleConnectorGroupNameChange = (groupId: string, newName: string) => {
    setConnectorGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newName } : g));
  };


  const handleRemoveManualConnector = (groupId: string, instanceId: string) => {
    setConnectorGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, connectors: g.connectors.filter(c => c.instanceId !== instanceId) };
      }
      return g;
    }));

    setGroups(prevGroups => prevGroups.map(g => ({
      ...g,
      items: g.items.map(item => item)
    })));
  };

  const handleGroupPowerSourceChange = (groupId: string, source: string) => {
    setConnectorGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        if (source === 'none') {
          const { sourceInput, ...rest } = g;
          return rest;
        }
        const [parentGroupId, parentConnectorId] = source.split('|');
        return { ...g, sourceInput: { parentGroupId, parentConnectorId } };
      }
      return g;
    }))
  }

  const toggleMultiSelect = (groupId: string, open: boolean) => {
    setOpenMultiSelects(prev => ({ ...prev, [groupId]: open }));
  }

  const handleAddGroup = () => {
    const newGroupName = `Grupa ${groups.length + 1}`;
    const newGroup = { tempId: crypto.randomUUID(), name: newGroupName, items: [] };
    setGroups([...groups, newGroup]);
    setTargetGroup(newGroup.tempId);
  };

  const handleRemoveGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.tempId !== groupId));
  };

  const handleGroupNameChange = (groupId: string, newName: string) => {
    setGroups(groups.map(g => g.tempId === groupId ? { ...g, name: newName } : g));
  };

  const handleGroupConnectorChange = (groupId: string, connectorInstanceIds: string[]) => {
    setGroups(groups.map(g => {
      if (g.tempId === groupId) {
        return { ...g, assignedConnectorIds: connectorInstanceIds };
      }
      return g;
    }));
  }


  const handleAddDevice = () => {
    const quantity = typeof quantityToAdd === 'number' ? quantityToAdd : 1;
    if (!deviceToAdd || !targetGroup || quantity < 1) return;

    const device = deviceCatalog.find(d => d.id === deviceToAdd);
    if (!device) return;

    const isCable = device.subcategory === 'power_cables';

    setGroups(groups.map(group => {
      if (group.tempId === targetGroup) {
        const existingItemIndex = isCable ? -1 : group.items.findIndex(item => item.deviceId === deviceToAdd);

        if (existingItemIndex > -1) {
          const newItems = [...group.items];
          newItems[existingItemIndex].quantity += quantity;
          return { ...group, items: newItems };
        } else {
          const newItem: CalculationItem = {
            tempId: crypto.randomUUID(),
            deviceId: deviceToAdd,
            quantity: quantity
          };
          return { ...group, items: [...group.items, newItem] };
        }
      }
      return group;
    }));

    setQuantityToAdd(1);
    setDeviceToAdd('');
  };

  const handleRemoveDevice = (groupId: string, tempId: string) => {
    setGroups(groups.map(group =>
      group.tempId === groupId
        ? { ...group, items: group.items.filter(item => item.tempId !== tempId) }
        : group
    ));
  };

  const handleDeviceQuantityChange = (groupId: string, tempId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveDevice(groupId, tempId);
      return;
    }
    setGroups(groups.map(group => {
      if (group.tempId === groupId) {
        return {
          ...group,
          items: group.items.map(item =>
            item.tempId === tempId
              ? { ...item, quantity: newQuantity }
              : item
          )
        };
      }
      return group;
    }));
  };

  const fullCalculationList = useMemo(() => {
    if (!deviceCatalog) return [];
    return groups.map(group => {
      const itemsWithData = group.items.map(item => {
        if (item.deviceId) {
          const device = deviceCatalog.find(d => d.id === item.deviceId);
          return device ? {
            item,
            name: device.name,
            manufacturer: device.manufacturer,
            isCable: device.subcategory === 'power_cables'
          } : null;
        } else {
          return {
            item,
            name: item.manualName || 'Brak nazwy',
            manufacturer: 'Wpis ręczny',
            isCable: false
          };
        }
      }).filter((i): i is NonNullable<typeof i> => !!i);

      return { ...group, items: itemsWithData };
    });
  }, [groups, deviceCatalog]);


  const totals = useMemo(() => {
    return fullCalculationList.flat().flatMap(g => g.items).reduce(
      (acc, { item }) => {
        if (item.deviceId) {
          const device = deviceCatalog.find(d => d.id === item.deviceId);
          if (device) {
            const quantity = item.quantity || 1;
            acc.powerW += device.powerW * quantity;
            acc.currentA += device.currentA * quantity;
            acc.weightKg += device.weightKg * quantity;
          }
        } else if (item.manualWeight) {
          acc.weightKg += item.manualWeight * item.quantity;
        }
        return acc;
      },
      { powerW: 0, currentA: 0, weightKg: 0 }
    );
  }, [fullCalculationList, deviceCatalog]);

  const connectorStatus = useMemo(() => {
    const allItems = fullCalculationList.flatMap(g => g.items);

    const directConnectorLoads: { [instanceId: string]: number } = {};
    allItems.forEach(({ item }) => {
      const itemGroup = fullCalculationList.find(g => g.items.some(i => i.item.tempId === item.tempId));
      const device = item.deviceId ? deviceCatalog.find(d => d.id === item.deviceId) : null;
      if (itemGroup?.assignedConnectorIds && itemGroup.assignedConnectorIds.length > 0 && device) {
        const loadPerConnector = (device.currentA * item.quantity) / itemGroup.assignedConnectorIds.length;
        itemGroup.assignedConnectorIds.forEach(connectorId => {
          directConnectorLoads[connectorId] = (directConnectorLoads[connectorId] || 0) + loadPerConnector;
        });
      }
    });

    const getDistroLoad = (groupId: string): number => {
      const group = connectorGroups.find(g => g.id === groupId);
      if (!group) return 0;

      let ownLoad = group.connectors.reduce((acc, c) => acc + (directConnectorLoads[c.instanceId!] || 0), 0);

      const childDistros = connectorGroups.filter(child =>
        child.sourceInput && group.connectors.some(c => c.instanceId === child.sourceInput?.parentConnectorId)
      );

      childDistros.forEach(childDistro => {
        ownLoad += getDistroLoad(childDistro.id);
      });

      return ownLoad;
    };

    connectorGroups.forEach(group => {
      if (group.sourceInput) {
        directConnectorLoads[group.sourceInput.parentConnectorId!] = (directConnectorLoads[group.sourceInput.parentConnectorId!] || 0) + getDistroLoad(group.id);
      }
    });

    return connectorGroups.map(group => {
      return {
        ...group,
        connectors: group.connectors.map(connector => {
          const totalLoad = directConnectorLoads[connector.instanceId!] || 0;
          const totalCapacity = connector.phases === 3 ? connector.maxCurrentA * 3 : connector.maxCurrentA;
          const isOverloaded = totalLoad > totalCapacity;

          return {
            ...connector,
            name: getConnectorDisplayName(connector as ActiveConnector, activeConnectors as ActiveConnector[]),
            isOverloaded,
            totalLoad,
            totalCapacity,
          };
        }),
      };
    });
  }, [fullCalculationList, connectorGroups, activeConnectors, deviceCatalog]);


  // const favoriteDeviceIds = useMemo(() => new Set(user?.favorites || []), [user]);

  const { devicesToShow, subcategoryGroups } = useMemo(() => {
    if (!selectedCategory) {
      return { devicesToShow: [], subcategoryGroups: [] };
    }

    const isSearching = deviceSearchQuery.trim() !== '';

    let filteredDevices = deviceCatalog.filter(d => d.category === selectedCategory.name);

    if (isSearching) {
      const lowerCaseQuery = deviceSearchQuery.toLowerCase();
      filteredDevices = filteredDevices.filter(d =>
        d.name.toLowerCase().includes(lowerCaseQuery) ||
        d.manufacturer.toLowerCase().includes(lowerCaseQuery)
      );
    } else {
      filteredDevices = filteredDevices.filter(d => favoriteDeviceIds.has(d.id));
    }

    const groups: { [key: string]: Device[] } = {};
    if (selectedCategory.subcategories && selectedCategory.subcategories.length > 0) {
      filteredDevices.forEach(device => {
        const subKey = device.subcategory || 'other';
        if (!groups[subKey]) {
          groups[subKey] = [];
        }
        groups[subKey].push(device);
      });
    } else {
      groups['all'] = filteredDevices;
    }

    const subcategoryGroupsResult = (selectedCategory.subcategories || [{ key: 'all', label: t(`categories.${selectedCategory.slug}`) }])
      .map(sub => ({
        ...sub,
        devices: groups[sub.key] || []
      }))
      .filter(group => group.devices.length > 0);

    return { devicesToShow: filteredDevices, subcategoryGroups: subcategoryGroupsResult };
  }, [deviceCatalog, selectedCategory, deviceSearchQuery, favoriteDeviceIds, t]);

  const distroDevices = useMemo(() => {
    return deviceCatalog.filter(d => d.subcategory === 'distribution_boxes');
  }, [deviceCatalog]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setGroups((currentGroups) => {
        const newGroups = JSON.parse(JSON.stringify(currentGroups)) as CalculationGroup[];
        const activeGroupIndex = newGroups.findIndex(g => g.items.some(i => i.tempId === active.id));
        const overGroupIndex = newGroups.findIndex(g => g.items.some(i => i.tempId === over.id));

        if (activeGroupIndex !== -1 && overGroupIndex !== -1 && activeGroupIndex === overGroupIndex) {
          const activeGroup = newGroups[activeGroupIndex];
          const oldIndex = activeGroup.items.findIndex(i => i.tempId === active.id);
          const newIndex = activeGroup.items.findIndex(i => i.tempId === over.id);
          if (oldIndex !== -1 && newIndex !== -1) {
            activeGroup.items = arrayMove(activeGroup.items, oldIndex, newIndex);
          }
        }
        return newGroups;
      });
    }
  }

  if (isLoading) {
    return <div className="text-center">Ładowanie katalogu urządzeń...</div>;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard title="Całkowita moc" value={`${(totals.powerW / 1000).toFixed(2)} kW`} icon={Zap} />
            <SummaryCard title="Całkowity prąd" value={`${totals.currentA.toFixed(2)} A`} icon={Zap} variant="secondary" />
            <SummaryCard title="Całkowita waga" value={`${totals.weightKg.toFixed(2)} kg`} icon={Weight} />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Lokalizacja</CardTitle>
              </CardHeader>
              <CardContent>
                <Select onValueChange={(val) => setSelectedLocationId(val === 'none' ? null : val)} value={selectedLocationId || 'none'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz lokalizację..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Brak (ręczna konfiguracja)</SelectItem>
                    {allLocations && allLocations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{location.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button onClick={handleDownloadPdf} variant="outline" className="w-full md:w-auto">
              <FileDown className="mr-2 h-4 w-4" />
              Eksportuj do PDF
            </Button>
            <Button onClick={() => setIsSaveDialogOpen(true)} className="w-full md:w-auto">
              <Save className="mr-2 h-4 w-4" />
              Zapisz
            </Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Accordion type="multiple" defaultValue={['devices']} className="w-full space-y-6">
                <AccordionItem value="devices" className="border-none">
                  <Card>
                    <AccordionTrigger className="p-4 hover:no-underline">
                      <CardTitle>Dodaj urządzenie z katalogu</CardTitle>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start">
                        <Select onValueChange={(slug) => {
                          const category = deviceCategories.find(c => c.slug === slug);
                          setSelectedCategory(category || null);
                          setDeviceToAdd('');
                        }}>
                          <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Wybierz kategorię..." />
                          </SelectTrigger>
                          <SelectContent>
                            {deviceCategories.map(c => (
                              <SelectItem key={c.slug} value={c.slug}>{t(`categories.${c.slug}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Popover open={isDevicePopoverOpen} onOpenChange={setIsDevicePopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isDevicePopoverOpen}
                              className="w-full sm:w-[250px] justify-between"
                              disabled={!selectedCategory}
                            >
                              <span className="truncate">
                                {deviceToAdd && deviceCatalog
                                  ? deviceCatalog.find((d) => d.id === deviceToAdd)?.name
                                  : "Wybierz urządzenie..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Szukaj urządzenia..."
                                value={deviceSearchQuery}
                                onValueChange={setDeviceSearchQuery}
                              />
                              <CommandList>
                                <ScrollArea className="h-72">
                                  {subcategoryGroups.length === 0 ? (
                                    <CommandEmpty>
                                      {deviceSearchQuery.trim() === '' ? 'Brak ulubionych w tej kategorii. Zacznij pisać, aby wyszukać.' : 'Nie znaleziono urządzeń.'}
                                    </CommandEmpty>
                                  ) : (
                                    subcategoryGroups.map(group => (
                                      <CommandGroup key={group.key} heading={t(`devices.subcategories.${group.key}`) || group.label}>
                                        {group.devices.map((d) => (
                                          <CommandItem
                                            key={d.id}
                                            value={d.id}
                                            onSelect={(currentValue) => {
                                              setDeviceToAdd(currentValue === deviceToAdd ? "" : currentValue);
                                              setIsDevicePopoverOpen(false);
                                              setDeviceSearchQuery('');
                                            }}
                                          >
                                            <Check className={cn("mr-2 h-4 w-4", deviceToAdd === d.id ? "opacity-100" : "opacity-0")} />
                                            {d.name}
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    ))
                                  )}
                                </ScrollArea>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <Input
                          type="number"
                          value={quantityToAdd}
                          onChange={(e) => {
                            const value = e.target.value;
                            setQuantityToAdd(value === '' ? '' : parseInt(value, 10));
                          }}
                          onBlur={() => {
                            if (quantityToAdd === '' || (typeof quantityToAdd === 'number' && quantityToAdd < 1)) {
                              setQuantityToAdd(1);
                            }
                          }}
                          className="w-full sm:w-20"
                          min="1"
                          placeholder="1"
                        />
                        <Select value={targetGroup} onValueChange={setTargetGroup}>
                          <SelectTrigger className='w-full sm:w-[250px]'><SelectValue placeholder="Wybierz grupę..." /></SelectTrigger>
                          <SelectContent>{groups.map((group) => <SelectItem key={group.tempId} value={group.tempId}>{group.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <div className="flex flex-wrap w-full sm:w-auto gap-2">
                          <Button onClick={handleAddDevice} disabled={!deviceToAdd || !targetGroup} className="flex-1 sm:flex-none"><PlusCircle className="mr-2 h-4 w-4" />Dodaj</Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              </Accordion>

              <Accordion type="multiple" defaultValue={groups.map(g => g.tempId)} className="w-full">
                {fullCalculationList.map((group) => {
                  const groupTotals = group.items.reduce((acc, { item }) => {
                    let powerW = 0, currentA = 0, weightKg = 0;
                    if (item.deviceId) {
                      const device = deviceCatalog.find(d => d.id === item.deviceId);
                      if (device) {
                        powerW = device.powerW;
                        currentA = device.currentA;
                        weightKg = device.weightKg;
                      }
                    } else if (item.manualWeight) {
                      weightKg = item.manualWeight;
                    }

                    const quantity = item.quantity || 1;
                    acc.powerW += powerW * quantity;
                    acc.currentA += currentA * quantity;
                    acc.weightKg += weightKg * quantity;
                    return acc;
                  }, { powerW: 0, currentA: 0, weightKg: 0 });

                  const assignedGroupConnectors = activeConnectors.filter(c => !!group.assignedConnectorIds?.includes(c.instanceId!));
                  const totalMaxCurrent = assignedGroupConnectors.reduce((acc, c) => acc + (c.maxCurrentA * (c.phases === 3 ? 3 : 1)), 0);
                  const loadPercentage = totalMaxCurrent > 0 ? (groupTotals.currentA / totalMaxCurrent) * 100 : 0;

                  const itemIds = group.items.map(i => i.item.tempId);

                  return (
                    <AccordionItem value={group.tempId} key={group.tempId} className="border-none group">
                      <Card>
                        <CardHeader className="p-4 flex flex-col gap-2">
                          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
                            <AccordionTrigger className="w-full p-0 hover:no-underline">
                              <div className="flex items-center gap-4 w-full">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                                <Input value={group.name} onChange={(e) => handleGroupNameChange(group.tempId, e.target.value)} className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent flex-1 w-auto" />
                              </div>
                            </AccordionTrigger>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <Popover open={openMultiSelects[group.tempId]} onOpenChange={(open) => toggleMultiSelect(group.tempId, open)}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" aria-expanded={openMultiSelects[group.tempId]} className="w-[150px] sm:w-[200px] justify-between h-9">
                                    <span className="truncate">{(group.assignedConnectorIds?.length || 0) > 0 ? `${group.assignedConnectorIds!.length} wybrano` : 'Przypisz przyłącza...'}</span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                  <Command>
                                    <CommandInput placeholder="Szukaj przyłączy..." />
                                    <CommandList>
                                      <CommandEmpty>Brak dostępnych przyłączy.</CommandEmpty>
                                      {connectorGroups.map(connectorGroup => (
                                        <CommandGroup key={connectorGroup.id} heading={connectorGroup.name}>
                                          {connectorGroup.connectors
                                            .filter(c => !usedConnectorIds.has(c.instanceId!) || group.assignedConnectorIds?.includes(c.instanceId!))
                                            .map((c) => (
                                              <CommandItem
                                                key={c.instanceId}
                                                value={c.instanceId}
                                                onSelect={() => {
                                                  const currentIds = group.assignedConnectorIds || [];
                                                  const newIds = currentIds.includes(c.instanceId!)
                                                    ? currentIds.filter(id => id !== c.instanceId!)
                                                    : [...currentIds, c.instanceId!];
                                                  handleGroupConnectorChange(group.tempId, newIds);
                                                }}
                                              >
                                                <Check className={cn("mr-2 h-4 w-4", group.assignedConnectorIds?.includes(c.instanceId!) ? "opacity-100" : "opacity-0")} />
                                                {getConnectorDisplayName(c as ActiveConnector, activeConnectors as ActiveConnector[])}
                                              </CommandItem>
                                            ))}
                                        </CommandGroup>
                                      ))}
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground" onClick={() => handleRemoveGroup(group.tempId)} disabled={groups.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground px-10">
                            <span>{group.items.length} urządzeń</span>
                            <Ampersand className="h-4 w-4 hidden sm:block" />
                            <div className='flex items-center gap-1'><Zap className='h-4 w-4' /> <span>{(groupTotals.powerW / 1000).toFixed(2)} kW</span></div>
                            <div className='flex items-center gap-1'><Zap className='h-4 w-4' /> <span>{groupTotals.currentA.toFixed(2)} A</span></div>
                            <div className='flex items-center gap-1'><Weight className='h-4 w-4' /> <span>{groupTotals.weightKg.toFixed(1)} kg</span></div>
                            {assignedGroupConnectors.length > 0 && (
                              <>
                                <Ampersand className="h-4 w-4 hidden sm:block" />
                                <div className='flex items-center gap-1'><PercentCircle className='h-4 w-4' /> <span>{loadPercentage.toFixed(0)}% obciążenia</span></div>
                              </>
                            )}
                          </div>
                        </CardHeader>
                        <AccordionContent className="px-4 pb-4">
                          <div className="rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8 p-2"><span className="sr-only">Przesuń</span></TableHead>
                                  <TableHead>Urządzenie</TableHead>
                                  <TableHead className="w-[100px]">Ilość</TableHead>
                                  <TableHead className="w-[50px]"><span className="sr-only">Akcje</span></TableHead>
                                </TableRow>
                              </TableHeader>
                              <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                                <TableBody>
                                  {group.items.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24">Przeciągnij lub dodaj urządzenia do tej grupy.</TableCell></TableRow>}
                                  {group.items.map(({ item, name, manufacturer, isCable }) => (
                                    <SortableDeviceRow
                                      key={item.tempId}
                                      item={item}
                                      name={name}
                                      manufacturer={manufacturer}
                                      isCable={isCable}
                                      onRemove={() => handleRemoveDevice(group.tempId, item.tempId)}
                                      onQuantityChange={(newQuantity) => handleDeviceQuantityChange(group.tempId, item.tempId, newQuantity)}
                                    />
                                  ))}
                                </TableBody>
                              </SortableContext>
                            </Table>
                          </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  )
                })}
              </Accordion>
              <Button onClick={handleAddGroup} variant="outline" className="w-full mt-4"><PlusCircle className="mr-2 h-4 w-4" />Dodaj nową grupę</Button>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stan przyłączy</CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" defaultValue={connectorGroups.map(g => g.id)} className="w-full space-y-4">
                    {connectorGroups.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Wybierz lokalizację lub dodaj ręcznie przyłącze.</p>}
                    {connectorStatus.map((group) => {
                      const findDownstreamGroups = (startGroupId: string): Set<string> => {
                        const downstream = new Set<string>([startGroupId]);
                        const queue = [startGroupId];
                        while (queue.length > 0) {
                          const currentId = queue.shift()!;
                          const children = connectorGroups.filter(g => g.sourceInput?.parentGroupId === currentId);
                          for (const child of children) {
                            if (!downstream.has(child.id)) {
                              downstream.add(child.id);
                              queue.push(child.id);
                            }
                          }
                        }
                        return downstream;
                      };
                      const downstreamIds = findDownstreamGroups(group.id);

                      const availablePowerSources = connectorGroups
                        .filter(cg => !downstreamIds.has(cg.id))
                        .flatMap(parentGroup =>
                          parentGroup.connectors
                            .filter(pc => !usedConnectorIds.has(pc.instanceId!) || pc.instanceId === group.sourceInput?.parentConnectorId)
                            .filter(pc => !group.inputConnectorType || pc.type === group.inputConnectorType)
                            .map(pc => ({
                              parentGroup,
                              connector: pc
                            }))
                        );

                      return (
                        <AccordionItem value={group.id} key={group.id} className="border-none">
                          <Card className="bg-muted/30">
                            <CardHeader className="p-3">
                              <div className="flex items-center justify-between">
                                <AccordionTrigger className="p-0 w-full hover:no-underline">
                                  <div className="flex items-center gap-2 w-full">
                                    {group.isLocationGroup ? (
                                      <span className="font-semibold">{group.name}</span>
                                    ) : (
                                      <Input
                                        value={group.name}
                                        onChange={(e) => handleConnectorGroupNameChange(group.id, e.target.value)}
                                        className="font-semibold border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    )}
                                  </div>
                                </AccordionTrigger>
                                {!group.isLocationGroup && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleRemoveConnectorGroup(group.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              {!group.isLocationGroup && (
                                <div className="mt-2">
                                  <Label className="text-xs text-muted-foreground">Zasilanie wejściowe {group.inputConnectorType && <Badge variant="secondary" className="ml-1">{group.inputConnectorType}</Badge>}</Label>
                                  <Select
                                    onValueChange={(val) => handleGroupPowerSourceChange(group.id, val)}
                                    value={group.sourceInput ? `${group.sourceInput.parentGroupId}|${group.sourceInput.parentConnectorId}` : 'none'}
                                  >
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue placeholder="Wybierz zasilanie..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Brak (źródło pierwotne)</SelectItem>
                                      {availablePowerSources.map(({ parentGroup, connector }) => (
                                        <SelectItem key={connector.instanceId} value={`${parentGroup.id}|${connector.instanceId}`}>
                                          {`${parentGroup.name} - ${getConnectorDisplayName(connector as ActiveConnector, activeConnectors as ActiveConnector[])}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </CardHeader>
                            <AccordionContent className="px-3 pb-3">
                              <div className="grid gap-4">
                                {!group.isLocationGroup && !group.deviceId && (
                                  <div className="space-y-2">
                                    <Label>Dodaj przyłącze do tej grupy</Label>
                                    <div className="flex gap-2">
                                      <Select value={manualConnectorType} onValueChange={setManualConnectorType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          {ConnectorTypes.map(type => (
                                            <SelectItem key={type} value={type}>{type}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button onClick={() => handleAddManualConnector(group.id)}>
                                        <PlusCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {group.connectors.map((connector) => (
                                  <div key={connector.instanceId} className={cn("p-4 border rounded-lg relative bg-background", connector.isOverloaded && "border-destructive bg-destructive/10")}>
                                    {connector.isManual && !group.deviceId && (
                                      <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 text-muted-foreground" onClick={() => handleRemoveManualConnector(group.id, connector.instanceId!)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <p className="font-medium pr-6">{getConnectorDisplayName(connector as ActiveConnector, activeConnectors as ActiveConnector[])}</p>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Obciążenie</p>
                                      <p className={cn("font-bold", connector.isOverloaded && "text-destructive")}>
                                        {connector.totalLoad.toFixed(1)}A / {connector.totalCapacity}A
                                      </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                      {connector.phases === 3 ? `(3x${connector.maxCurrentA}A)` : `Maks. ${connector.maxCurrentA}A na fazę`}
                                    </p>
                                    {connector.isOverloaded && <Badge variant="destructive" className="mt-1">Przeciążenie</Badge>}
                                  </div>
                                ))}
                                {group.connectors.length === 0 && <p className="text-xs text-center text-muted-foreground py-2">Brak przyłączy w tej grupie.</p>}
                              </div>
                            </AccordionContent>
                          </Card>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button variant="outline" className="w-full" onClick={handleAddConnectorGroup}>
                      <PlusCircle className="mr-2 h-4 w-4" />Dodaj grupę przyłączy (np. agregat)
                    </Button>
                    <Popover open={isDistroPopoverOpen} onOpenChange={setIsDistroPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full"
                        >
                          <Plug className="mr-2 h-4 w-4" /> Dodaj rozdzielnicę z katalogu
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Szukaj rozdzielnicy..." />
                          <CommandList>
                            <CommandEmpty>Brak rozdzielnic w katalogu.</CommandEmpty>
                            {distroDevices.map((d) => (
                              <CommandItem
                                key={d.id}
                                value={d.id}
                                onSelect={() => handleAddDistroFromCatalog(d.id)}
                              >
                                {d.name}
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DndContext>

      <AlertDialog open={isDeleteGroupConfirmOpen} onOpenChange={setIsDeleteGroupConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.are_you_sure')}</AlertDialogTitle>
            <AlertDialogDescription>
              Tej akcji nie można cofnąć. To trwale usunie grupę przyłączy i wszystkie jej złącza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteGroupConfirmOpen(false)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteGroup}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zapisz kalkulację</DialogTitle>
            <DialogDescription>
              Podaj nazwę dla swojej kalkulacji. Będziesz mógł ją później wczytać i edytować.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nazwa
              </Label>
              <Input id="name" value={calculationName} onChange={(e) => setCalculationName(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsSaveDialogOpen(false)}>Anuluj</Button>
            <Button onClick={handleSave} disabled={!calculationName}>Zapisz</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

