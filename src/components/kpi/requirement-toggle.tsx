"use client";

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCheck2Icon } from 'lucide-react';

interface RequirementToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  category: 'Clinical Trial' | 'GMP Inspection' | 'Market Authorization';
}

export function RequirementToggle({ enabled, onChange, category }: RequirementToggleProps) {
  return (
    <div className="fixed top-20 right-6 z-50">
      <Card className="shadow-lg border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-3 p-3">
          <FileCheck2Icon className="h-5 w-5 text-purple-600" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Match Requirements
            </span>
            <span className="text-xs text-muted-foreground">{category} KPIs</span>
          </div>
          <button
            onClick={() => onChange(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
              enabled ? 'bg-purple-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {enabled && (
          <div className="px-3 pb-3 pt-0">
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
              Requirements visible on cards
            </Badge>
          </div>
        )}
      </Card>
    </div>
  );
}

