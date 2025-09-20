import React from 'react';
import { EnhancedLeadCard, type EnhancedLead } from './EnhancedLeadCard';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';

interface EnhancedLeadsListProps {
  leads: EnhancedLead[];
  onViewDetails?: (leadId: string) => void;
  onContact?: (leadId: string) => void;
  onScheduleDemo?: (leadId: string) => void;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
  gridView?: boolean;
}

export const EnhancedLeadsList: React.FC<EnhancedLeadsListProps> = ({
  leads,
  onViewDetails,
  onContact,
  onScheduleDemo,
  loading = false,
  error = null,
  emptyMessage = 'No leads found',
  className,
  compact = false,
  gridView = false
}) => {
  const { theme } = useTheme();

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'animate-pulse rounded-lg border p-4',
              theme === 'dark' 
                ? 'bg-gray-900/50 border-gray-700' 
                : 'bg-gray-50 border-gray-200'
            )}
          >
            <div className="flex items-start space-x-3">
              <div className={cn(
                'rounded-full',
                compact ? 'w-8 h-8' : 'w-10 h-10',
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
              )} />
              <div className="flex-1 space-y-2">
                <div className={cn(
                  'h-4 rounded',
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                )} style={{ width: '60%' }} />
                <div className={cn(
                  'h-3 rounded',
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                )} style={{ width: '40%' }} />
                <div className={cn(
                  'h-3 rounded',
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                )} style={{ width: '80%' }} />
              </div>
              <div className={cn(
                'h-8 w-12 rounded',
                theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
              )} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn(
        'text-center py-8 px-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20',
        className
      )}>
        <p className="text-red-600 dark:text-red-400 font-medium mb-2">
          Error loading leads
        </p>
        <p className="text-red-500 dark:text-red-300 text-sm">
          {error}
        </p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className={cn(
        'text-center py-12 px-4',
        className
      )}>
        <div className={cn(
          'mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4',
          theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
        )}>
          <svg
            className={cn(
              'w-8 h-8',
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className={cn(
          'text-lg font-medium mb-2',
          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
        )}>
          No leads found
        </h3>
        <p className={cn(
          'text-sm',
          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
        )}>
          {emptyMessage}
        </p>
      </div>
    );
  }

  const containerClasses = gridView
    ? cn(
        'grid gap-4',
        compact 
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className
      )
    : cn('space-y-4', className);

  return (
    <div className={containerClasses}>
      {leads.map((lead) => (
        <EnhancedLeadCard
          key={lead.id}
          lead={lead}
          onViewDetails={onViewDetails}
          onContact={onContact}
          onScheduleDemo={onScheduleDemo}
          compact={compact}
        />
      ))}
    </div>
  );
};

export default EnhancedLeadsList;