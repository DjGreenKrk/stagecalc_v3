'use client';

import { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import type { Client } from '@/lib/definitions';
import { useTranslation } from '@/context/language-context';

const getFormSchema = (t: (key: string) => string) => z.object({
  id: z.string().optional(),
  name: z.string().min(1, t('clients.validation.name_required')),
  contactPerson: z.string().optional(),
  email: z.string().email(t('clients.validation.invalid_email')),
  phone: z.string().optional(),
  address: z.string().optional(),
  nip: z.string().optional(),
  notes: z.string().optional(),
});


type ClientFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSave: (data: Omit<Client, 'id' | 'ownerUserId'>) => void;
};

export function ClientForm({
  open,
  onOpenChange,
  client,
  onSave,
}: ClientFormProps) {
  const { t } = useTranslation();
  const formSchema = getFormSchema(t);
  type ClientFormData = z.infer<typeof formSchema>;

  const form = useForm<ClientFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      nip: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      if (client) {
        form.reset(client);
      } else {
        form.reset({
          name: '',
          contactPerson: '',
          email: '',
          phone: '',
          address: '',
          nip: '',
          notes: '',
        });
      }
    }
  }, [client, open]);

  const onSubmit = (values: ClientFormData) => {
    onSave(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {client ? t('clients.edit_client') : t('clients.new_client')}
          </DialogTitle>
          <DialogDescription>
            {client
              ? t('clients.update_client_details')
              : t('clients.enter_client_details')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('clients.client_name')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('clients.client_name_placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="nip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NIP</FormLabel>
                    <FormControl>
                      <Input placeholder="123-456-78-90" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="contactPerson"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('clients.contact_person')}</FormLabel>
                    <FormControl>
                        <Input placeholder="Jan Kowalski" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>{t('clients.phone')}</FormLabel>
                    <FormControl>
                        <Input placeholder="+48 123 456 789" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="kontakt@firma.pl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('clients.table.address')}</FormLabel>
                  <FormControl>
                    <Input placeholder="ul. Przykładowa 1, 00-001 Warszawa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('common.notes')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('clients.notes_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
              <Button type="submit">{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
