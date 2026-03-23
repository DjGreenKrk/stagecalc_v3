'use client';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Truss, Device } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const trussFormSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana.'),
  trussTypeId: z.string().min(1, 'Typ kratownicy jest wymagany.'),
  length: z.coerce.number().min(0.1, 'Długość musi być dodatnia.'),
  supportMode: z.enum(['suspended', 'supported']),
  totalLoadLimit: z.coerce.number().min(0, 'Limit musi być dodatni.'),
});

type TrussFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (truss: Truss) => void;
  truss?: Truss;
  riggingDevices: Device[];
};

export function TrussFormDialog({ open, onOpenChange, onSave, truss, riggingDevices }: TrussFormDialogProps) {
  const form = useForm<z.infer<typeof trussFormSchema>>({
    resolver: zodResolver(trussFormSchema),
    defaultValues: {
      name: '',
      trussTypeId: '',
      length: 8,
      supportMode: 'suspended',
      totalLoadLimit: 800,
    },
  });

  useEffect(() => {
    if (open && truss) {
      form.reset(truss);
    } else if (open) {
      form.reset({
        name: '',
        trussTypeId: '',
        length: 8,
        supportMode: 'suspended',
        totalLoadLimit: 800,
      });
    }
  }, [open, truss, form]);
  
  const onSubmit = (values: z.infer<typeof trussFormSchema>) => {
    const dataToSave: Truss = {
      id: truss?.id || crypto.randomUUID(),
      loads: truss?.loads || [],
      ...values,
    };
    onSave(dataToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{truss ? 'Edytuj kratownicę' : 'Dodaj nową kratownicę'}</DialogTitle>
          <DialogDescription>
            Zdefiniuj parametry kratownicy i jej całkowity limit obciążenia.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Nazwa</FormLabel><FormControl><Input placeholder="np. Kratownica Front" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="trussTypeId" render={({ field }) => (<FormItem><FormLabel>Typ kratownicy</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz typ..." /></SelectTrigger></FormControl><SelectContent>{riggingDevices.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="length" render={({ field }) => (<FormItem><FormLabel>Długość (m)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="supportMode" render={({ field }) => (<FormItem><FormLabel>Sposób pracy</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Wybierz..." /></SelectTrigger></FormControl><SelectContent><SelectItem value="suspended">Wisząca</SelectItem><SelectItem value="supported">Podparta (goalpost)</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            
            <h3 className="text-md font-semibold pt-4 border-t">Limit obciążenia</h3>
            <FormField
              control={form.control}
              name="totalLoadLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit całkowitego obciążenia (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Anuluj</Button>
              <Button type="submit">Zapisz</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
