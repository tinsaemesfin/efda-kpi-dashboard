import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';
import { RequirementMapping } from '@/types/requirements';

interface KPICardWithRequirementProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string | number;
  status?: 'excellent' | 'good' | 'warning' | 'critical';
  icon?: React.ReactNode;
  suffix?: string;
  prefix?: string;
  requirement?: RequirementMapping;
  showRequirement?: boolean;
}

export function KPICardWithRequirement({
  title,
  value,
  description,
  trend,
  trendValue,
  status = 'good',
  icon,
  suffix,
  prefix,
  requirement,
  showRequirement = false
}: KPICardWithRequirementProps) {
  const statusColors = {
    excellent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    good: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowUpIcon className="h-4 w-4" />;
    if (trend === 'down') return <ArrowDownIcon className="h-4 w-4" />;
    return <MinusIcon className="h-4 w-4" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400';
    if (trend === 'down') return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <Card className="relative overflow-visible">
      {/* Requirement Badge Overlay */}
      {showRequirement && requirement && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge 
            variant="outline" 
            className="bg-purple-600 text-white border-purple-700 shadow-lg text-xs px-2 py-1 font-semibold"
          >
            {requirement.requirementNumbers.join(', ')}
          </Badge>
        </div>
      )}
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          <div className="text-2xl font-bold">
            {prefix}
            {value}
            {suffix}
          </div>
          
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
          
          <div className="flex items-center gap-2">
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{trendValue}</span>
              </div>
            )}
            
            {status && (
              <Badge variant="outline" className={`text-xs ${statusColors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            )}
          </div>

          {/* Requirement Description (shown when enabled) */}
          {showRequirement && requirement && (
            <div className="mt-2 pt-2 border-t border-purple-200">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                📋 {requirement.description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

