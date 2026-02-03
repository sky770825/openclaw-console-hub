import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  type?: 'select' | 'multi';
}

interface FilterBarProps {
  filters: FilterConfig[];
  activeFilters: Record<string, string | string[]>;
  onFilterChange: (key: string, value: string | string[] | null) => void;
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({ 
  filters, 
  activeFilters, 
  onFilterChange, 
  onClearAll,
  className 
}: FilterBarProps) {
  const activeCount = Object.values(activeFilters).filter(v => 
    Array.isArray(v) ? v.length > 0 : v
  ).length;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="h-3.5 w-3.5 mr-2" />
            篩選
            {activeCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-4">
          <div className="space-y-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="text-sm font-medium mb-2 block">
                  {filter.label}
                </label>
                <Select
                  value={activeFilters[filter.key] as string || ''}
                  onValueChange={(value) => onFilterChange(filter.key, value || null)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={`選擇${filter.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={onClearAll}
              >
                清除所有篩選
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter chips */}
      {Object.entries(activeFilters).map(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;
        const filter = filters.find(f => f.key === key);
        const option = filter?.options.find(o => o.value === value);
        
        return (
          <Badge
            key={key}
            variant="secondary"
            className="h-7 gap-1 pr-1"
          >
            {filter?.label}: {option?.label || value}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-transparent"
              onClick={() => onFilterChange(key, null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        );
      })}
    </div>
  );
}
