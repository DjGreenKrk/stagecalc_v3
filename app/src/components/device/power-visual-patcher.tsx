'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Plus, Loader2, Lightbulb, Music, Cable, Layers, Box, Info, Trash2, Edit3, X, Save, Speaker, Package } from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import type { PowerPreset, Connection, Device, Outlet, Calculation, CalculationGroup } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn, generateId } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import DOMPurify from 'dompurify';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VisualPowerPatcherProps {
  catalogDeviceId: string;
  instanceId: string;
  calculationId: string;
  onConnectionsChange?: (connections: Connection[]) => void;
  initialConnections?: Connection[];
  customPreset?: PowerPreset;
  availableDistros?: { id: string, name: string }[];
}

type PatchFilter = 'all' | 'groups' | 'items' | 'unpatched' | 'lighting' | 'sound' | 'multimedia' | 'cabling' | 'rigging' | 'other' | 'distro';

export function VisualPowerPatcher({
  catalogDeviceId,
  instanceId,
  calculationId,
  onConnectionsChange,
  initialConnections,
  customPreset,
  availableDistros = [],
}: VisualPowerPatcherProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PowerPreset | null>(null);
  const [connections, setConnections] = useState<Connection[]>(initialConnections || []);
  const [calculationDevices, setCalculationDevices] = useState<Device[]>([]);
  const [calculationGroups, setCalculationGroups] = useState<CalculationGroup[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [patchDrawerOpen, setPatchDrawerOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [patchFilter, setPatchFilter] = useState<PatchFilter>('all');
  const [connectionNotes, setConnectionNotes] = useState('');

  // Summarize Load
  const phaseLoad = useMemo(() => {
    const summary = { L1: 0, L2: 0, L3: 0, totalW: 0 };
    if (!preset) return summary;

    connections.forEach(conn => {
      const outlet = preset.outlets.find(o => o.id === conn.sourceOutletId);
      if (!outlet) return;

      let powerW = 0;
      if (conn.targetGroupId) {
        const group = calculationGroups.find(g => g.tempId === conn.targetGroupId);
        group?.items.forEach(item => {
          const dev = calculationDevices.find(d => d.id === item.deviceId);
          powerW += (dev?.powerW || 0) * (item.quantity || 1);
        });
      } else if (conn.targetDeviceId) {
        const dev = calculationDevices.find(d => d.id === conn.targetDeviceId);
        powerW += (dev?.powerW || 0);
      }

      if (outlet.phase === 'All') {
        const perPhase = powerW / 3;
        summary.L1 += perPhase;
        summary.L2 += perPhase;
        summary.L3 += perPhase;
      } else if (String(outlet.phase).startsWith('L')) {
        const p = outlet.phase as 'L1' | 'L2' | 'L3';
        summary[p] += powerW;
      }
      summary.totalW += powerW;
    });
    return summary;
  }, [connections, preset, calculationGroups, calculationDevices]);

  // 1. Fetch Data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        if (customPreset) {
          setPreset(customPreset);
        } else if (catalogDeviceId) {
          const distro = await pb.collection('cabling_devices').getOne(catalogDeviceId);
          if (distro.presetId) {
            const p = await pb.collection('power_presets').getOne(distro.presetId);
            setPreset(p as unknown as PowerPreset);
          } else {
            setError("To urządzenie nie ma przypisanego presetu gniazd. Edytuj je w katalogu.");
          }
        } else {
          setError("Brak ID urządzenia z katalogu oraz brak presetu tymczasowego.");
        }

        const connList = await pb.collection('connections').getFullList<Connection>({
          filter: `calculationId = "${calculationId}" && sourceDeviceId = "${instanceId}"`,
        });
        setConnections(connList);

        const calc = await pb.collection('calculations').getOne<Calculation>(calculationId);
        if (calc && calc.data?.groups) {
          setCalculationGroups(calc.data.groups);
          const deviceIds = new Set<string>();
          calc.data.groups.forEach(g => g.items.forEach(item => { if (item.deviceId) deviceIds.add(item.deviceId); }));

          const devices: Device[] = [];
          const collections = ['lighting_devices', 'sound_devices', 'multimedia_devices', 'cabling_devices', 'rigging_devices', 'other_devices'];
          for (const collection of collections) {
            try {
              const records = await pb.collection(collection).getFullList<Device>({
                filter: Array.from(deviceIds).map(id => `id = "${id}"`).join(' || ')
              });
              devices.push(...records.map(r => ({ ...r, category: collection.split('_')[0] as any })));
            } catch (err) {}
          }
          setCalculationDevices(devices);
        }
      } catch (error) {
        toast({ title: 'Błąd danych', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    if (calculationId !== 'new') {
      pb.collection('connections').subscribe('*', (e) => {
        if (e.action === 'create' || e.action === 'update') {
          const newConn = e.record as unknown as Connection;
          if (newConn.calculationId === calculationId && newConn.sourceDeviceId === instanceId) {
            setConnections(prev => {
              const index = prev.findIndex(c => c.id === newConn.id);
              if (index > -1) {
                const updated = [...prev];
                updated[index] = newConn;
                return updated;
              }
              const next = [...prev, newConn];
              return next;
            });
          }
        } else if (e.action === 'delete') {
          setConnections(prev => prev.filter(c => c.id !== e.record.id));
        }
      });
    }

    return () => { if (calculationId !== 'new') pb.collection('connections').unsubscribe('*'); };
  }, [catalogDeviceId, instanceId, calculationId, customPreset]);

  // 3. Helpers
  const getPatchedInfo = (outletId: string) => {
    const conn = connections.find(c => c.sourceOutletId === outletId);
    if (!conn) return null;
    
    if (conn.targetGroupId) {
      const group = calculationGroups.find(g => g.tempId === conn.targetGroupId);
      return { type: 'group', name: group?.name || 'Grupa', id: conn.targetGroupId, connection: conn };
    }
    
    if (conn.targetDeviceId) {
      if (availableDistros.some(d => d.id === conn.targetDeviceId)) {
        const distro = availableDistros.find(d => d.id === conn.targetDeviceId);
        return { type: 'distro', name: distro?.name || 'Rozdzielnica', id: conn.targetDeviceId, connection: conn };
      }
      const device = calculationDevices.find(d => d.id === conn.targetDeviceId);
      return { type: 'device', name: device?.name || 'Urządzenie', id: conn.targetDeviceId, category: device?.category, connection: conn };
    }
    return null;
  };

  const getCategoryIcon = (cat?: string) => {
    if (cat === 'lighting') return <Lightbulb className="h-4 w-4" />;
    if (cat === 'sound') return <Speaker className="h-4 w-4" />;
    if (cat === 'cabling') return <Cable className="h-4 w-4" />;
    if (cat === 'rigging') return <Layers className="h-4 w-4" />;
    if (cat === 'multimedia') return <Music className="h-4 w-4" />;
    return <Box className="h-4 w-4" />;
  };

  const getPatchedIcon = (info: any) => {
    if (info.type === 'distro') return <Zap className="h-4 w-4" />;
    if (info.type === 'group') return <Package className="h-4 w-4" />;
    return getCategoryIcon(info.category);
  };

  const handleOutletClick = (outlet: Outlet) => {
    const info = getPatchedInfo(outlet.id);
    setSelectedOutlet(outlet);
    if (info) {
      setConnectionNotes(info.connection.notes || '');
      setDetailsDialogOpen(true);
    } else {
      setConnectionNotes('');
      setPatchDrawerOpen(true);
    }
  };

  const handleConnect = async (targetId: string, type: 'group' | 'device' | 'distro') => {
    if (!selectedOutlet) return;
    
    const newConnData: Partial<Connection> = {
      id: calculationId === 'new' ? generateId() : undefined,
      calculationId,
      sourceDeviceId: instanceId,
      sourceOutletId: selectedOutlet.id,
      ...(type === 'group' ? { targetGroupId: targetId } : { targetDeviceId: targetId }),
      notes: connectionNotes,
    };

    if (calculationId === 'new') {
      const next = [...connections, newConnData as Connection];
      setConnections(next);
      if (onConnectionsChange) onConnectionsChange(next);
      setPatchDrawerOpen(false);
      return;
    }

    try {
      // Optimistic Update
      const tempId = 'temp_' + generateId();
      const tempConn = { ...newConnData, id: tempId } as Connection;
      const optimisticNext = [...connections, tempConn];
      setConnections(optimisticNext);
      if (onConnectionsChange) onConnectionsChange(optimisticNext);
      setPatchDrawerOpen(false); // Close immediately for feedback

      const res = await pb.collection('connections').create(newConnData);
      
      // Update with real ID after DB confirmation
      const realNext = optimisticNext.map(c => c.id === tempId ? (res as unknown as Connection) : c);
      setConnections(realNext);
      if (onConnectionsChange) onConnectionsChange(realNext);
      
      setConnectionNotes('');
      toast({ title: 'Połączono', description: `Gniazdo ${selectedOutlet.name} zajęte.` });
    } catch (error) {
       console.error(error);
       toast({ title: 'Błąd krosowania', variant: 'destructive' });
       // Rollback on fail
       setConnections(connections);
       if (onConnectionsChange) onConnectionsChange(connections);
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedOutlet) return;
    const info = getPatchedInfo(selectedOutlet.id);
    if (!info) return;

    try {
      await pb.collection('connections').update(info.connection.id, {
        notes: connectionNotes,
      });
      setDetailsDialogOpen(false);
      toast({ title: 'Zaktualizowano notatki' });
    } catch (error) {
      toast({ title: 'Błąd zapisu', variant: 'destructive' });
    }
  };

  const handleDisconnect = async () => {
    if (!selectedOutlet) return;
    const info = getPatchedInfo(selectedOutlet.id);
    if (!info) return;

    if (calculationId === 'new' || info.connection.id.startsWith('temp_')) {
      const next = connections.filter(c => c.id !== info.connection.id);
      setConnections(next);
      if (onConnectionsChange) onConnectionsChange(next);
      setDetailsDialogOpen(false);
      toast({ title: 'Odłączono urządzenie' });
      return;
    }

    try {
      // Optimistic Update
      const optimisticNext = connections.filter(c => c.id !== info.connection.id);
      setConnections(optimisticNext);
      if (onConnectionsChange) onConnectionsChange(optimisticNext);
      setDetailsDialogOpen(false); // Close immediately
      toast({ title: 'Odłączono urządzenie' });

      await pb.collection('connections').delete(info.connection.id);
    } catch (error) {
      console.error(error);
      toast({ title: 'Błąd usuwania połączenia', variant: 'destructive' });
      // Rollback on fail
      setConnections(connections);
      if (onConnectionsChange) onConnectionsChange(connections);
    }
  };

  if (loading) return <div className="flex h-32 items-center justify-center bg-background/80 backdrop-blur-sm rounded-3xl"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
 
  if (error) return <Card className="p-8 text-center bg-destructive/5 border-destructive/20 rounded-3xl"><p className="text-destructive font-medium mb-2">Błąd danych</p><p className="text-sm text-muted-foreground">{error}</p></Card>;

  if (!preset) return <Card className="p-8 text-center bg-muted/20 border-dashed rounded-3xl"><p className="text-muted-foreground font-medium">Brak presetu.</p><p className="text-xs text-muted-foreground mt-1">Skonfiguruj gniazda dla tego urządzenia w katalogu.</p></Card>;

  const getGroupTotals = (group: CalculationGroup) => {
    return group.items.reduce((acc, item) => {
      const dev = calculationDevices.find(d => d.id === item.deviceId);
      acc.powerW += (dev?.powerW || 0) * (item.quantity || 1);
      return acc;
    }, { powerW: 0 });
  };

  const renderPatchableItems = () => {
    const filteredGroups = calculationGroups.filter(g => {
      if (patchFilter === 'all' || patchFilter === 'groups') return true;
      return g.items.some(item => {
        const dev = calculationDevices.find(d => d.id === item.deviceId);
        return (dev?.category as string) === (patchFilter as string);
      });
    });

    const filteredDevices = calculationGroups.flatMap(g => g.items.map(item => {
      const dev = calculationDevices.find(d => d.id === item.deviceId);
      return { group: g, item, dev };
    })).filter(({ dev }) => {
      if (patchFilter === 'all' || patchFilter === 'items') return true;
      return (dev?.category as string) === (patchFilter as string);
    });

    if (patchFilter === 'groups') {
      return filteredGroups.map(g => {
        const totals = getGroupTotals(g);
        return (
          <Button key={g.tempId} variant="outline" className="w-full h-14 justify-between" onClick={() => handleConnect(g.tempId, 'group')}>
            <div className="flex items-center gap-3"><Package className="h-4 w-4 text-blue-500" /><span className="font-bold">{g.name}</span></div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground">{g.items.length} positions</span>
              <Badge variant="secondary" className="text-[9px] mt-0.5">{(totals.powerW / 1000).toFixed(2)} kW</Badge>
            </div>
          </Button>
        );
      });
    } else { // 'items' or specific category
      return filteredDevices.map(({ group: g, item, dev }) => {
        const totalW = (dev?.powerW || 0) * (item.quantity || 1);
        const info = { type: 'device', category: dev?.category };
        return (
          <Button key={`${g.tempId}-${item.deviceId}`} variant="outline" className="w-full h-16 justify-between" onClick={() => handleConnect(item.deviceId || '', 'device')}>
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary mt-1">
                {getPatchedIcon(info)}
              </div>
              <div className="flex flex-col items-start">
                <span className="font-bold text-sm tracking-tight">{dev?.name || 'Device'}</span>
                <span className="text-[10px] uppercase text-muted-foreground font-medium">{g.name}</span>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground">{item.quantity} units</span>
              <Badge variant="secondary" className="text-[9px] mt-0.5">{totalW} W</Badge>
            </div>
          </Button>
        );
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Load Summary Header */}
      <div className="grid grid-cols-3 gap-2 p-4 bg-muted/20 rounded-2xl border">
        {['L1', 'L2', 'L3'].map(phase => {
          const loadW = phaseLoad[phase as keyof typeof phaseLoad];
          const loadA = loadW / 230;
          return (
            <div key={phase} className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-muted-foreground">{phase}</span>
              <span className="text-sm font-bold">{loadA.toFixed(1)}A</span>
              <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
                <div 
                  className={cn("h-full transition-all", loadA > 16 ? "bg-destructive" : loadA > 13 ? "bg-orange-500" : "bg-blue-500")} 
                  style={{ width: `${Math.min((loadA / 16) * 100, 100)}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {preset.outlets.map((outlet, index) => {
          const info = getPatchedInfo(outlet.id);
          const isPatched = !!info;
          return (
            <motion.button
              key={outlet.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleOutletClick(outlet)}
              className={cn(
                "relative h-24 flex flex-col items-center justify-center rounded-xl border-2 transition-all p-2",
                isPatched ? "bg-blue-600/10 border-blue-500 shadow-md" : "bg-muted/10 border-muted-foreground/20 border-dashed"
              )}
            >
              <span className="absolute top-1.5 left-2 text-[8px] font-bold opacity-40">{outlet.phase}</span>
              {isPatched ? (
                <>
                  {getPatchedIcon(info)}
                  <span className="text-[10px] font-bold truncate w-full text-center">{info.name}</span>
                  <span className="text-[8px] opacity-60 uppercase">{outlet.name}</span>
                  {info.connection.notes && <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-blue-500" />}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[8px] opacity-60 uppercase mt-1">{outlet.name}</span>
                </>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-500 border-blue-500">PATCHED</Badge>
                <span>Outlet {selectedOutlet?.name}</span>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/30 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-1">Target</p>
                <p className="font-bold text-lg">{getPatchedInfo(selectedOutlet?.id || '')?.name}</p>
              </div>
              {getPatchedInfo(selectedOutlet?.id || '') && getPatchedIcon(getPatchedInfo(selectedOutlet?.id || ''))}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Notes (Editor)</label>
              <RichTextEditor 
                value={connectionNotes} 
                onChange={setConnectionNotes} 
                className="min-h-[150px] border-2 focus-within:border-primary transition-colors"
                placeholder="Dodaj notatki techniczne lub opis krosu..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleDisconnect}>
              <Trash2 className="h-4 w-4 mr-2" /> DISCONNECT
            </Button>
            <Button className="flex-1" onClick={handleUpdateNotes}>
              <Save className="h-4 w-4 mr-2" /> SAVE NOTES
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Patch Drawer */}
      <Sheet open={patchDrawerOpen} onOpenChange={setPatchDrawerOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t-2">
          <SheetHeader className="pb-4">
            <SheetTitle>New Patch: <span className="text-primary">{selectedOutlet?.name}</span></SheetTitle>
            <SheetDescription>Wybierz sprzęt i opcjonalnie dodaj notatki (np. "DMX Channel 12").</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col h-full gap-4 overflow-hidden">
             <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <Button size="sm" variant={patchFilter === 'groups' ? 'default' : 'outline'} onClick={() => setPatchFilter('groups')} className="rounded-full shrink-0"><Layers className="h-3 w-3 mr-2" /> GRUPY</Button>
                <Button size="sm" variant={patchFilter === 'items' ? 'default' : 'outline'} onClick={() => setPatchFilter('items')} className="rounded-full shrink-0"><Box className="h-3 w-3 mr-2" /> POZYCJE</Button>
                <Button size="sm" variant={patchFilter === 'distro' ? 'default' : 'outline'} onClick={() => setPatchFilter('distro')} className="rounded-full shrink-0"><Zap className="h-3 w-3 mr-2" /> ROZDZIELNICE</Button>
                <Badge variant={patchFilter === 'lighting' ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setPatchFilter('lighting')}>Oświetlenie</Badge>
                <Badge variant={patchFilter === 'sound' ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setPatchFilter('sound')}>Dźwięk</Badge>
                <Badge variant={patchFilter === 'multimedia' ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setPatchFilter('multimedia')}>Multimedia</Badge>
                <Badge variant={patchFilter === 'cabling' ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setPatchFilter('cabling')}>Okablowanie</Badge>
                <Badge variant={patchFilter === 'rigging' ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setPatchFilter('rigging')}>Konstrukcje</Badge>
                <Badge variant={patchFilter === 'other' ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setPatchFilter('other')}>Inne</Badge>
             </div>

             <ScrollArea className="h-[50vh] pr-4">
                {patchFilter === 'distro' ? (
                  <div className="grid gap-2">
                    {availableDistros.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Brak innych rozdzielnic w kalkulacji.</p>}
                    {availableDistros.map(distro => (
                      <Button key={distro.id} variant="outline" className="justify-start h-auto p-4" onClick={() => handleConnect(distro.id, 'distro')}>
                        <Zap className="h-5 w-5 mr-3 text-primary" />
                        <div className="text-left">
                          <p className="font-semibold text-sm">{distro.name}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {renderPatchableItems()}
                  </div>
                )}
             </ScrollArea>
          </div>

          <div className="pt-4 border-t space-y-2">
             <label className="text-xs font-bold text-muted-foreground uppercase">Initial Notes</label>
             <RichTextEditor value={connectionNotes} onChange={setConnectionNotes} className="max-h-32 overflow-y-auto border-2" placeholder="Opcjonalna notatka przed połączeniem..." />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
