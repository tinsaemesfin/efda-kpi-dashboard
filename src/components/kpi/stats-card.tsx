import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StatsCardProps {
  title: string;
  description?: string;
  stats: {
    label: string;
    value: number;
    total?: number;
    percentage?: number;
    color?: string;
  }[];
}

export function StatsCard({ title, description, stats }: StatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stat.label}</span>
                <span className="text-muted-foreground">
                  {stat.value}
                  {stat.total && ` / ${stat.total}`}
                  {stat.percentage !== undefined && ` (${stat.percentage.toFixed(1)}%)`}
                </span>
              </div>
              {stat.percentage !== undefined && (
                <Progress 
                  value={stat.percentage} 
                  className="h-2"
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

