'use client';

import {
  Calculator,
  HardDrive,
  MapPin,
  Settings,
  Users,
  Zap,
  MessageSquare,
  ChevronDown,
  PlusCircle,
  List,
  Weight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState } from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { UserNav } from '@/components/user-nav';
import { useTranslation } from '@/context/language-context';
import { FeedbackDialog } from './feedback-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { cn } from '@/lib/utils';
import { deviceCategories } from '@/lib/definitions';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const isCatalogActive = pathname.startsWith('/catalog');

  const [isCatalogOpen, setIsCatalogOpen] = useState(isCatalogActive);

  const navItems = [
    { href: '/locations', label: t('nav.locations'), icon: MapPin },
    { href: '/clients', label: t('nav.clients'), icon: Users },
  ];

  return (
    <>
      <SidebarProvider>
        <Sidebar side="left" collapsible="icon">
          <SidebarHeader className="p-4">
            <Link
              href="/calculators"
              className="flex items-center gap-2 font-headline font-bold text-lg"
            >
              <Zap className="w-7 h-7 text-primary" />
              <span className="group-data-[collapsed=icon]:hidden">
                StageCalc
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/calculators/new'}
                  tooltip="Nowa kalkulacja"
                >
                  <Link href="/calculators/new">
                    <PlusCircle />
                    <span>Nowa kalkulacja</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={
                    pathname === '/calculators' ||
                    (pathname.startsWith('/calculators/') &&
                      pathname !== '/calculators/new')
                  }
                  tooltip="Zapisane kalkulacje"
                >
                  <Link href="/calculators">
                    <List />
                    <span>Zapisane kalkulacje</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith('/trusses')}
                  tooltip={t('nav.trusses')}
                >
                  <Link href="/trusses">
                    <Weight />
                    <span>{t('nav.trusses')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* Catalog Collapsible Menu */}
              <SidebarMenuItem>
                <Collapsible
                  open={isCatalogOpen}
                  onOpenChange={setIsCatalogOpen}
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      variant="default"
                      className="w-full justify-start"
                      isActive={isCatalogActive}
                      tooltip="Katalog"
                    >
                      <HardDrive />
                      <span>Katalog</span>
                      <ChevronDown
                        className={cn(
                          'ml-auto h-4 w-4 shrink-0 transition-transform',
                          isCatalogOpen && 'rotate-180'
                        )}
                      />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {deviceCategories.map((category) => (
                        <SidebarMenuSubItem key={category.name}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === `/catalog/${category.slug}`}
                          >
                            <Link href={`/catalog/${category.slug}`}>
                              {t(
                                `categories.${category.slug}`,
                                category.name
                              )}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsFeedbackOpen(true)}
                  tooltip="Zgłoś uwagę"
                >
                  <MessageSquare />
                  <span>Zgłoś uwagę</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t('nav.settings')}
                  isActive={pathname === '/settings'}
                >
                  <Link href="/settings">
                    <Settings />
                    <span>{t('nav.settings')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1" />
            <UserNav />
          </header>{' '}
          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <FeedbackDialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen} />
    </>
  );
}
