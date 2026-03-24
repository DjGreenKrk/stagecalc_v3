'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Client } from '@/lib/definitions';
import { AtSign, Building, MapPin, Phone, User, FileText, BadgeInfo } from 'lucide-react';
import { useTranslation } from '@/context/language-context';
import DOMPurify from 'dompurify';

type ClientDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
};

const DetailItem = ({ icon: Icon, label, value, isLink, linkPrefix, isHtml }: { icon: React.ElementType, label: string; value: string | number | undefined | null, isLink?: boolean, linkPrefix?: string, isHtml?: boolean }) => {
  if (!value) return null;
  
  const generateGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  const getHref = () => {
    if (!isLink || typeof value !== 'string') return undefined;
    if (label === 'Adres' || label === 'Address') return generateGoogleMapsLink(value);
    return `${linkPrefix}${value}`;
  }

  return (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {isLink && typeof value === 'string' ? (
                 <a
                    href={getHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline break-words"
                 >
                    {value}
                 </a>
            ) : isHtml && typeof value === 'string' ? (
                <div 
                  className="text-foreground text-sm space-y-1 
                             [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 
                             [&_a]:text-primary [&_a]:underline [&_strong]:font-bold 
                             [&_u]:underline"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} 
                />
            ) : (
                <p className="text-foreground">{value}</p>
            )}
        </div>
    </div>
  );
};

export function ClientDetailsDialog({
  open,
  onOpenChange,
  client,
}: ClientDetailsDialogProps) {
  const { t } = useTranslation();
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2"><Building className="h-6 w-6" /> {client.name}</DialogTitle>
           {client.address && (
            <DialogDescription>{client.address}</DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            {client.nip && <DetailItem icon={BadgeInfo} label="NIP" value={client.nip} />}
            {client.contactPerson && <DetailItem icon={User} label={t('clients.contact_person')} value={client.contactPerson} />}
            <DetailItem icon={AtSign} label="Email" value={client.email} isLink={true} linkPrefix="mailto:" />
            {client.phone && <DetailItem icon={Phone} label={t('clients.phone')} value={client.phone} isLink={true} linkPrefix="tel:" />}
            {client.address && <DetailItem icon={MapPin} label={t('clients.table.address')} value={client.address} isLink={true} />}
            {client.notes && <DetailItem icon={FileText} label={t('common.notes')} value={client.notes} isHtml={true} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

    