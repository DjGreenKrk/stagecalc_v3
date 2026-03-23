import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type SummaryCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  variant?: 'default' | 'secondary';
};

export function SummaryCard({ title, value, icon: Icon, variant = 'default' }: SummaryCardProps) {
  return (
    <Card className={cn(
      variant === 'default' && 'bg-primary/10 border-primary/20',
      variant === 'secondary' && 'bg-secondary/50',
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-5 w-5", variant === 'default' ? 'text-primary' : 'text-muted-foreground')} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-headline">{value}</div>
      </CardContent>
    </Card>
  );
}
