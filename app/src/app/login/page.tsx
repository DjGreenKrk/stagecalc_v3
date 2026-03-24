'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/pb-provider';
import { pb } from '@/lib/pb-hooks';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/context/language-context';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: isUserLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/quick-calculator');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>{t('common.loading')}</p>
      </div>
    );
  }

  const handleAuthError = (error: any) => {
    let title = t('login.errors.default_title');
    let description = error.message || t('login.errors.default_description');

    // PocketBase errors often come as ClientResponseError
    if (error.status === 400) {
      title = t('login.errors.invalid_credentials_title');
      description = t('login.errors.invalid_credentials_description');
    }

    toast({
      variant: 'destructive',
      title,
      description,
    });
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: t('login.errors.email_required_title'),
        description: t('login.errors.email_required_description'),
      });
      return;
    }
    try {
      await pb.collection('users').requestPasswordReset(email);
      toast({
        title: t('login.reset.success_title'),
        description: t('login.reset.success_description'),
      });
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isSignUp) {
        // PocketBase signup usually involves creating a record
        await pb.collection('users').create({
          email,
          password,
          passwordConfirm: password,
          name: email.split('@')[0], // placeholder
        });
        // After creation, login
        await pb.collection('users').authWithPassword(email, password);
      } else {
        await pb.collection('users').authWithPassword(email, password);
      }
    } catch (error) {
      handleAuthError(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background py-12">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center text-center px-4">
        <Link href="/quick-calculator" className="flex items-center gap-2 mb-6">
          <Zap className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold font-headline">StageCalc</h1>
        </Link>
        <Card className="w-full">
          <CardHeader>
            <CardTitle>{isSignUp ? t('login.create_account') : t('login.welcome_back')}</CardTitle>
            <CardDescription>
              {isSignUp
                ? t('login.enter_details_to_register')
                : t('login.log_in_to_manage_events')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('common.password')}</Label>
                  {!isSignUp && (
                    <Button variant="link" type="button" onClick={handlePasswordReset} className="px-0 h-auto text-xs">
                      {t('login.forgot_password')}
                    </Button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {isSignUp && (
                  <p className="text-xs text-muted-foreground text-left">
                    {t('login.errors.weak_password_description')}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full">
                {isSignUp ? t('login.sign_up') : t('login.log_in')}
              </Button>
            </form>
            <div className="text-center text-sm">
              {isSignUp ? t('login.already_have_account') : t('login.dont_have_account')}
              <Button variant="link" onClick={() => setIsSignUp(!isSignUp)} className="px-1">
                {isSignUp ? t('login.log_in') : t('login.sign_up')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="relative w-full my-6">
          <Separator />
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-background px-2 text-xs text-muted-foreground">{t('common.or')}</span>
        </div>

        <Button variant="outline" className="w-full" asChild>
          <Link href="/offline-calculator">
            <Calculator className="mr-2 h-4 w-4" />
            {t('login.try_demo')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
