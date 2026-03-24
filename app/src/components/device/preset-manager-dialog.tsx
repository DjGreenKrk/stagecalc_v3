'use client';

import { useState } from 'react';
import { pb } from '@/lib/pocketbase';
import type { PowerPreset } from '@/lib/definitions';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface PresetManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presets: PowerPreset[];
  onPresetsChanged: () => void;
  onCreateNew: () => void;
}

export function PresetManagerDialog({ open, onOpenChange, presets, onPresetsChanged, onCreateNew }: PresetManagerDialogProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    try {
      setDeletingId(id);
      await pb.collection('power_presets').delete(id);
      toast({ title: "Usunięto pomyślnie", description: `Preset ${name} został całkowicie usunięty.` });
      onPresetsChanged();
    } catch (e) {
      console.error(e);
      toast({ title: "Błąd", description: "Nie udało się usunąć tego presetu. Być może jest w użyciu na koncie.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Zarządzaj Własnymi Rozdzielnicami</DialogTitle>
          <DialogDescription>
            Tutaj możesz usunąć swoje stworzone presety z bazy danych, aby utrzymać porządek na koncie.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-3">
              {presets.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Brak własnych presetów.
                </p>
              )}
              {presets.map(preset => (
                <div key={preset.id} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div>
                    <p className="font-semibold text-sm">{preset.name}</p>
                    <p className="text-xs text-muted-foreground">{preset.outlets.length} zdefiniowanych gniazd wyjściowych</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(preset.id, preset.name)}
                    disabled={deletingId === preset.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex pt-4 justify-end border-t mt-2">
          <Button variant="outline" className="w-full" onClick={() => {
            onOpenChange(false);
            setTimeout(() => onCreateNew(), 150);
          }}>
            <Plus className="h-4 w-4 mr-2" /> Stwórz nową rozdzielnicę
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
