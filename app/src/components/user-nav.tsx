'use client';
import Link from 'next/link';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Image from 'next/image';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/language-context';

export function UserNav() {
  const { t } = useTranslation();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };
  
  if (isUserLoading) {
    return null;
  }

  if (!user) {
    return (
      <Button asChild>
        <Link href="/login">{t('login.log_in')}</Link>
      </Button>
    )
  }

  const userInitials = user.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('')
    : user.email?.charAt(0).toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
             {user.photoURL && (
              <AvatarImage asChild src={user.photoURL} alt={user.displayName || t('user_nav.user_avatar_alt')}>
                <Image 
                  src={user.photoURL}
                  alt={user.displayName || t('user_nav.user_avatar_alt')}
                  width={36}
                  height={36}
                  data-ai-hint="user avatar"
                />
              </AvatarImage>
            )}
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || t('user_nav.user')}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>{t('user_nav.profile')}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>{t('user_nav.settings')}</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t('user_nav.log_out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
