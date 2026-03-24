'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { pb } from '@/lib/pocketbase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { PlusCircle, Trash2, Box, Zap } from 'lucide-react';
import { ConnectorTypes } from '@/lib/definitions';
import { generateId } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

const outletSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Nazwa gniazda wymagana"),
  type: z.string().min(1, "Typ wymagany"),
  phase: z.enum(['L1', 'L2', 'L3', 'All']),
});

const presetSchema = z.object({
  name: z.string().min(1, "Nazwa presetu wymagana"),
  outlets: z.array(outletSchema).min(1, "Dodaj przynajmniej jedno gniazdo"),
});

type PresetFormValues = z.infer<typeof presetSchema>;

interface PresetEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (presetId: string) => void;
}

export function PresetEditorDialog({ open, onOpenChange, onSaved }: PresetEditorDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<PresetFormValues>({
    resolver: zodResolver(presetSchema),
    defaultValues: {
      name: '',
      outlets: [
        { id: generateId(), name: 'OUT 1', type: '16A Uni-Schuko', phase: 'L1' }
      ],
    },
  });

  const { control, handleSubmit, reset } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "outlets",
  });

  const onSubmit = async (values: PresetFormValues) => {
    try {
      setLoading(true);
      const record = await pb.collection('power_presets').create(values);
      toast({ title: "Preset zapisany", description: values.name });
      onSaved(record.id);
      onOpenChange(false);
      reset();
    } catch (error) {
      console.error("Error saving preset:", error);
      toast({ title: "Błąd zapisu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kreator Presetu Gniazd</DialogTitle>
          <DialogDescription>
            Zdefiniuj układ gniazd dla tej rozdzielni. Ten preset będzie dostępny dla innych urządzeń.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa modelu / presetu</FormLabel>
                  <FormControl>
                    <Input placeholder="np. PCE ISV-6 32/12" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel>Lista Gniazd</FormLabel>
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  onClick={() => append({ id: generateId(), name: `OUT ${fields.length + 1}`, type: '16A Uni-Schuko', phase: 'L1' })}
                >
                  <PlusCircle className="h-4 w-4 mr-2" /> Dodaj
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-xl bg-muted/5">
                    <div className="col-span-4">
                      <FormField
                        control={control}
                        name={`outlets.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="Nazwa" className="h-8 text-xs font-bold" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-5">
                      <FormField
                        control={control}
                        name={`outlets.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ConnectorTypes.map(c => <SelectItem key={c} value={c} className="text-[10px]">{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                       <FormField
                        control={control}
                        name={`outlets.${index}.phase`}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-[10px]">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="L1">L1</SelectItem>
                                <SelectItem value="L2">L2</SelectItem>
                                <SelectItem value="L3">L3</SelectItem>
                                <SelectItem value="All">All</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1 pb-0.5">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(index)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Zapisz Preset
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  );
}
