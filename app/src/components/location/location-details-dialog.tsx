
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Location } from '@/lib/definitions';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { MapPin, Users, FileText, Zap, Link as LinkIcon, File, User, Phone, AtSign } from 'lucide-react';
import { useTranslation } from '@/context/language-context';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { useMemo } from 'react';
import { SummaryCard } from '../event/summary-card';

type LocationDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location?: Location;
};

const DetailItem = ({ icon: Icon, label, value, isLink, linkPrefix }: { icon: React.ElementType, label?: string; value: string | number | undefined | null, isLink?: boolean, linkPrefix?: string }) => {
  if (!value) return null;

  const getHref = () => {
    if (!isLink || typeof value !== 'string') return undefined;
    if (linkPrefix === 'maps') return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
    return `${linkPrefix}${value}`;
  }

  return (
    <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
        <div className="flex flex-col">
            {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
            {isLink && typeof value === 'string' ? (
                 <a
                    href={getHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline"
                 >
                    {value}
                 </a>
            ) : (
                <p className="text-foreground">{value}</p>
            )}
        </div>
    </div>
  );
};


export function LocationDetailsDialog({
  open,
  onOpenChange,
  location,
}: LocationDetailsDialogProps) {
  const { t } = useTranslation();

  const allConnectors = useMemo(() => {
    if (!location) return [];
    // For backwards compatibility, combine old flat list with new grouped list
    const fromGroups = location.powerConnectorGroups?.flatMap(g => g.connectors) || [];
    const flatList = location.powerConnectors || [];
    const all = [...fromGroups, ...flatList];
    // Remove duplicates by id if any
    return all.filter((c, i, self) => c.id ? (i === self.findIndex(t => t.id === c.id)) : true);
  }, [location]);
  
  const totalPowerCapacity = useMemo(() => {
    if (!allConnectors || allConnectors.length === 0) return 0;

    const totalPower = allConnectors.reduce((total, pc) => {
      const powerPerConnector = pc.phases === 1
        ? 230 * pc.maxCurrentA
        : 400 * pc.maxCurrentA * Math.sqrt(3);
      return total + (powerPerConnector * (pc.quantity || 1));
    }, 0);
    return (totalPower / 1000).toFixed(1);
  }, [allConnectors]);


  if (!location) return null;
  
  const hasPowerGroups = location.powerConnectorGroups && location.powerConnectorGroups.length > 0;
  const hasDocuments = location.documents && location.documents.length > 0;
  const hasContacts = location.contacts && location.contacts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">{location.name}</DialogTitle>
           {location.address && (
            <DialogDescription>{location.address}</DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-6 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid gap-4">
            <DetailItem icon={MapPin} label={t('locations.table.address')} value={location.address} isLink={true} linkPrefix='maps' />
            {!!location.capacity && <DetailItem icon={Users} label={t('locations.capacity')} value={`${location.capacity} ${t('locations.people')}`} />}
            {location.notes && <DetailItem icon={FileText} label={t('common.notes')} value={location.notes} />}
          </div>
          
           {totalPowerCapacity > 0 && (
            <SummaryCard
                icon={Zap}
                title={t('locations.total_available_power')}
                value={`${totalPowerCapacity} kW`}
              />
           )}

          {hasContacts && (
            <div>
              <Separator className="my-4" />
              <h4 className="flex items-center text-md font-semibold mb-4"><Users className="mr-2 h-5 w-5 text-primary" /> Kontakty</h4>
              <div className="space-y-3">
                {location.contacts?.map(contact => (
                  <div key={contact.id} className="p-3 border rounded-lg">
                    <p className="font-semibold">{contact.name}</p>
                    {contact.notes && <p className="text-sm text-muted-foreground">{contact.notes}</p>}
                    <div className="flex flex-col gap-2 mt-2">
                      {contact.phone && <DetailItem icon={Phone} value={contact.phone} isLink={true} linkPrefix="tel:" />}
                      {contact.email && <DetailItem icon={AtSign} value={contact.email} isLink={true} linkPrefix="mailto:" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasPowerGroups && (
            <div>
                <Separator className="my-4" />
                <h4 className="flex items-center text-md font-semibold mb-2"><Zap className="mr-2 h-5 w-5 text-primary" /> {t('locations.power_connectors')}</h4>
                <Accordion type="multiple" defaultValue={(location.powerConnectorGroups || []).map(g => g.id)} className="w-full">
                    {location.powerConnectorGroups?.map(group => (
                        <AccordionItem value={group.id} key={group.id} className="border-b-0">
                            <AccordionTrigger className="text-md py-2">{group.name}</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-3 pl-4">
                                {group.connectors.map((pc, index) => {
                                  return(
                                    <div key={pc.id || index} className="p-3 border rounded-lg bg-card/50">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">{pc.type}</p>
                                            <p className="text-sm text-muted-foreground">{pc.phases === 1 ? '1-fazowe' : '3-fazowe'} / {pc.maxCurrentA}A</p>
                                        </div>
                                        {pc.notes && <p className="text-xs italic text-muted-foreground mt-1">{pc.notes}</p>}
                                    </div>
                                  )
                                })}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
          )}

          {hasDocuments && (
            <div>
                <Separator className="my-4" />
                <h4 className="flex items-center text-md font-semibold mb-4"><File className="mr-2 h-5 w-5 text-primary" /> Pliki</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {location.documents?.map((doc, index) => (
                    <a
                      key={doc.id || index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <LinkIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-primary hover:underline font-medium">{doc.name}</span>
                    </a>
                  ))}
                </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
