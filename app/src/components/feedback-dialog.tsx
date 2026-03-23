'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useUser } from '@/firebase';
import { useTranslation } from '@/context/language-context';
import { Mail } from 'lucide-react';

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { t } = useTranslation();
  const { user } = useUser();

  const recipientEmail = 'biuro@greencrew.pl';
  const subject = t('feedback.email_subject');
  const body = `\n\n-----------------\nUser: ${user?.email || 'Not logged in'}\nApp Version: 1.0.0`;

  const mailtoLink = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('feedback.title')}</DialogTitle>
          <DialogDescription>{t('feedback.description')}</DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
                Kliknij przycisk poniżej, aby otworzyć swój program pocztowy i wysłać nam wiadomość.
            </p>
        </div>
        <DialogFooter className="sm:justify-center">
          <Button asChild>
            <a href={mailtoLink}>
                <Mail className="mr-2 h-4 w-4" />
                Napisz do nas
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
