'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/context/pb-provider';
import { pb } from '@/lib/pb-hooks';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useEffect } from 'react';
import { useTranslation } from '@/context/language-context';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required.'),
  email: z.string().email(),
  photoURL: z.string().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, isLoading: isUserLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      email: '',
      photoURL: '',
    },
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user) {
      form.reset({
        displayName: (user as any).name || (user as any).displayName || '',
        email: user.email || '',
        photoURL: (user as any).avatar || (user as any).photoURL || '',
      });
      // Update validation messages with current language
      profileSchema.refine(data => data.displayName.length > 0, {
        message: t('profile.validation.display_name_required'),
      });
    }
  }, [user, form, t]);

  if (isUserLoading || !user) {
    return (
      <AppShell>
        <div className="flex items-center justify-center">{t('common.loading')}</div>
      </AppShell>
    );
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await pb.collection('users').update(user.id, {
        name: data.displayName,
        // photoURL is usually managed differently in PB (as a file)
        // for now we'll just store it as name if it's a field
      });
      toast({
        title: t('profile.update_success_title'),
        description: t('profile.update_success_description'),
      });
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('profile.update_error_description', { message: error.message }),
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('profile.reset_password_no_email'),
      });
      return;
    }
    try {
      await pb.collection('users').requestPasswordReset(user.email);
      toast({
        title: t('profile.reset_password_email_sent_title'),
        description: t('profile.reset_password_email_sent_description'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('profile.reset_password_error', { message: error.message }),
      });
    }
  };

  const userInitials = user.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('')
    : user.email?.charAt(0).toUpperCase() || '?';

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.title')}</CardTitle>
            <CardDescription>{t('profile.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {form.watch('photoURL') ? (
                  <AvatarImage asChild src={form.watch('photoURL')!} alt="Avatar">
                    <Image src={form.watch('photoURL')!} alt="Avatar" width={80} height={80} data-ai-hint="user avatar" />
                  </AvatarImage>
                ) : user.photoURL ? (
                  <AvatarImage asChild src={user.photoURL} alt="Avatar">
                    <Image src={user.photoURL} alt="Avatar" width={80} height={80} data-ai-hint="user avatar" />
                  </AvatarImage>
                ) : null}
                <AvatarFallback className="text-3xl">{userInitials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold">{form.watch('displayName') || t('profile.no_name')}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.display_name')}</FormLabel>
                      <FormControl>
                        <Input placeholder="Jan Kowalski" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input disabled {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.photo_url')}</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com/avatar.png" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-center gap-2">
                  <Button type="submit">{t('common.save_changes')}</Button>
                  <Button type="button" variant="outline" onClick={handlePasswordReset}>{t('profile.reset_password')}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
